// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BondToken.sol";

/**
 * @title BondSeries
 * @notice Main contract for fixed-rate bond issuance with daily coupon payments
 * @dev Implements claim-based coupon distribution with 1e18 precision
 */
contract BondSeries is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ==================== CONSTANTS ====================
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    uint256 public constant MINT_RATIO = 10; // 1 USDC → 10 BondToken
    uint256 public constant FACE_VALUE_PER_TOKEN = 0.1e6; // 0.1 USDC (6 decimals)
    uint256 public constant COUPON_RATE_PER_DAY = 100; // 1% = 100 basis points
    uint256 public constant COUPON_PER_TOKEN_PER_DAY = 0.001e6; // 0.001 USDC in 6 decimals (match USDC)
    uint256 public constant RESERVE_RATIO = 30; // 30% reserve
    uint256 public constant DEFAULT_GRACE_PERIOD = 3 days;
    uint256 public constant SNAPSHOT_INTERVAL = 5 minutes; // Testing: 5 minutes
    uint256 public constant PRECISION = 1e6; // Match USDC decimals for zero precision loss
    uint256 public constant MAX_CAP = 10_000e6; // 10,000 USDC cap

    // ==================== STATE VARIABLES ====================
    
    BondToken public immutable bondToken;
    IERC20 public immutable usdc;
    
    uint256 public maturityDate;
    uint256 public lastRecordTime;
    uint256 public nextRecordTime;
    uint256 public recordCount;
    uint256 public cumulativeCouponIndex; // 1e18 precision
    uint256 public totalDeposited; // Total USDC deposited
    uint256 public lastDistributedRecord; // Last record ID that was distributed
    bool public emergencyRedeemEnabled;
    
    // ==================== MAPPINGS ====================
    
    mapping(address => uint256) public claimedIndex; // User's last claimed index
    mapping(uint256 => Snapshot) public snapshots; // recordId => Snapshot
    
    // ==================== STRUCTS ====================
    
    struct Snapshot {
        uint256 recordId;
        uint256 timestamp;
        uint256 totalSupply;
        uint256 treasuryBalance;
    }
    
    // ==================== EVENTS ====================
    
    event Deposited(address indexed user, uint256 usdcAmount, uint256 bondAmount, uint256 timestamp);
    event SnapshotRecorded(uint256 indexed recordId, uint256 totalSupply, uint256 treasuryBalance, uint256 timestamp);
    event CouponDistributed(uint256 indexed recordId, uint256 amount, uint256 newIndex, uint256 timestamp);
    event CouponClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event Redeemed(address indexed user, uint256 bondAmount, uint256 usdcAmount, uint256 timestamp);
    event EmergencyRedeemEnabled(uint256 timestamp);
    event OwnerWithdraw(address indexed owner, uint256 amount, uint256 timestamp);
    
    // ==================== ERRORS ====================
    
    error CapExceeded();
    error InvalidAmount();
    error NotMatured();
    error PoolExpired();
    error TooSoon();
    error NoSnapshotAvailable();
    error InsufficientBalance();
    error ReserveViolation();
    error EmergencyNotEnabled();
    error AlreadyDistributed();
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Constructor
     * @param bondToken_ BondToken contract address
     * @param usdc_ USDC token address
     * @param keeper_ Keeper address (backend automation)
     * @param maturityMinutes_ Number of minutes until maturity (use for testing)
     */
    constructor(
        address bondToken_,
        address usdc_,
        address keeper_,
        uint256 maturityMinutes_
    ) {
        bondToken = BondToken(bondToken_);
        usdc = IERC20(usdc_);
        maturityDate = block.timestamp + (maturityMinutes_ * 1 minutes);
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, keeper_);
        
        // Initialize snapshot timing
        lastRecordTime = block.timestamp;
        nextRecordTime = block.timestamp + SNAPSHOT_INTERVAL;
    }
    
    // ==================== USER FUNCTIONS ====================
    
    /**
     * @notice Deposit USDC and receive BondTokens
     * @param usdcAmount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 usdcAmount) external nonReentrant whenNotPaused {
        if (usdcAmount == 0) revert InvalidAmount();
        if (block.timestamp >= maturityDate) revert PoolExpired();
        if (totalDeposited + usdcAmount > MAX_CAP) revert CapExceeded();
        
        // Calculate bond amount (1 USDC → 10 BondToken)
        uint256 bondAmount = usdcAmount * MINT_RATIO; // Both 6 decimals, no conversion needed
        
        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        
        // Update state
        totalDeposited += usdcAmount;
        
        // Mint BondToken to user
        bondToken.mint(msg.sender, bondAmount);
        
        // Initialize user's claimed index if first time
        if (claimedIndex[msg.sender] == 0) {
            claimedIndex[msg.sender] = cumulativeCouponIndex;
        }
        
        emit Deposited(msg.sender, usdcAmount, bondAmount, block.timestamp);
    }
    
    /**
     * @notice Claim accumulated coupon (interest)
     * @return claimed Amount of USDC claimed
     */
    function claimCoupon() external nonReentrant returns (uint256 claimed) {
        uint256 userBalance = bondToken.balanceOf(msg.sender);
        if (userBalance == 0) return 0;
        
        // Calculate unclaimed coupon
        uint256 indexDelta = cumulativeCouponIndex - claimedIndex[msg.sender];
        // Both 6 decimals, no conversion needed
        claimed = (indexDelta * userBalance) / PRECISION;
        
        if (claimed == 0) return 0;
        
        // Update user's claimed index
        claimedIndex[msg.sender] = cumulativeCouponIndex;
        
        // Transfer USDC coupon to user
        usdc.safeTransfer(msg.sender, claimed);
        
        emit CouponClaimed(msg.sender, claimed, block.timestamp);
    }
    
    /**
     * @notice Redeem BondTokens for USDC principal at maturity
     * @param bondAmount Amount of BondToken to redeem (18 decimals)
     */
    function redeem(uint256 bondAmount) external nonReentrant {
        if (block.timestamp < maturityDate) revert NotMatured();
        if (bondAmount == 0) revert InvalidAmount();
        
        // Claim any pending coupon first
        if (cumulativeCouponIndex > claimedIndex[msg.sender]) {
            this.claimCoupon();
        }
        
        // Calculate USDC to return (1 BondToken = 0.1 USDC)
        uint256 usdcAmount = (bondAmount * FACE_VALUE_PER_TOKEN) / 1e6; // Both 6 decimals
        
        // Burn BondToken
        bondToken.burn(msg.sender, bondAmount);
        
        // Transfer USDC principal
        usdc.safeTransfer(msg.sender, usdcAmount);
        
        emit Redeemed(msg.sender, bondAmount, usdcAmount, block.timestamp);
    }
    
    /**
     * @notice Emergency redeem when default (pro-rata based on treasury)
     * @param bondAmount Amount of BondToken to redeem
     */
    function emergencyRedeem(uint256 bondAmount) external nonReentrant {
        if (!emergencyRedeemEnabled) revert EmergencyNotEnabled();
        if (bondAmount == 0) revert InvalidAmount();
        
        uint256 totalSupply = bondToken.totalSupply();
        uint256 treasuryBalance = usdc.balanceOf(address(this));
        
        // Pro-rata calculation
        uint256 usdcAmount = (bondAmount * treasuryBalance) / totalSupply;
        
        // Burn BondToken
        bondToken.burn(msg.sender, bondAmount);
        
        // Transfer pro-rata USDC
        usdc.safeTransfer(msg.sender, usdcAmount);
        
        emit Redeemed(msg.sender, bondAmount, usdcAmount, block.timestamp);
    }
    
    // ==================== KEEPER FUNCTIONS ====================
    
    /**
     * @notice Record snapshot (called by keeper automation)
     * @dev Records snapshot every SNAPSHOT_INTERVAL (5 minutes for testing)
     */
    function recordSnapshot() external onlyRole(KEEPER_ROLE) {
        if (block.timestamp < nextRecordTime) revert TooSoon();
        if (block.timestamp >= maturityDate) revert PoolExpired();
        
        recordCount++;
        
        uint256 totalSupply = bondToken.totalSupply();
        uint256 treasuryBalance = usdc.balanceOf(address(this));
        
        snapshots[recordCount] = Snapshot({
            recordId: recordCount,
            timestamp: block.timestamp,
            totalSupply: totalSupply,
            treasuryBalance: treasuryBalance
        });
        
        lastRecordTime = block.timestamp;
        nextRecordTime = block.timestamp + SNAPSHOT_INTERVAL;
        
        emit SnapshotRecorded(recordCount, totalSupply, treasuryBalance, block.timestamp);
        
        // Check if default (>3 snapshots without distribution)
        // Only check if we have more than 3 records
        if (recordCount > 3 && lastDistributedRecord < recordCount - 3) {
            emergencyRedeemEnabled = true;
            emit EmergencyRedeemEnabled(block.timestamp);
        }
    }
    
    // ==================== OWNER FUNCTIONS ====================
    
    /**
     * @notice Distribute coupon for latest snapshot
     * @param amount Amount of USDC to distribute (dynamic based on actual amount)
     */
    function distributeCoupon(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (recordCount == 0) revert NoSnapshotAvailable();
        if (lastDistributedRecord >= recordCount) revert AlreadyDistributed();
        
        Snapshot memory snapshot = snapshots[recordCount];
        if (snapshot.totalSupply == 0) revert InvalidAmount();
        
        // Transfer USDC from owner
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update cumulative index (dynamic based on actual distributed amount)
        // Formula: indexIncrement = (amount * PRECISION) / totalSupply
        // Both 6 decimals, no conversion needed
        uint256 indexIncrement = (amount * PRECISION) / snapshot.totalSupply;
        cumulativeCouponIndex += indexIncrement;
        
        // Update last distributed record
        lastDistributedRecord = recordCount;
        
        // Reset emergency mode if was enabled
        if (emergencyRedeemEnabled) {
            emergencyRedeemEnabled = false;
        }
        
        emit CouponDistributed(recordCount, amount, cumulativeCouponIndex, block.timestamp);
    }
    
    /**
     * @notice Owner withdraws USDC (max 70% of total deposited)
     * @param amount Amount to withdraw
     */
    function ownerWithdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        uint256 treasuryBalance = usdc.balanceOf(address(this));
        uint256 requiredReserve = (totalDeposited * RESERVE_RATIO) / 100;
        uint256 withdrawable = treasuryBalance > requiredReserve ? treasuryBalance - requiredReserve : 0;
        
        if (amount > withdrawable) revert ReserveViolation();
        
        usdc.safeTransfer(msg.sender, amount);
        
        emit OwnerWithdraw(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @notice Pause deposits and withdrawals
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause deposits and withdrawals
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Calculate claimable coupon for a user
     * @param user User address
     * @return Claimable USDC amount
     */
    function claimableAmount(address user) external view returns (uint256) {
        uint256 userBalance = bondToken.balanceOf(user);
        if (userBalance == 0) return 0;
        
        uint256 indexDelta = cumulativeCouponIndex - claimedIndex[user];
        // Both 6 decimals, no conversion needed
        return (indexDelta * userBalance) / PRECISION;
    }
    
    /**
     * @notice Get current treasury status
     * @return balance Current USDC balance
     * @return required Required reserve (30%)
     * @return withdrawable Amount owner can withdraw
     */
    function getTreasuryStatus() external view returns (
        uint256 balance,
        uint256 required,
        uint256 withdrawable
    ) {
        balance = usdc.balanceOf(address(this));
        required = (totalDeposited * RESERVE_RATIO) / 100;
        withdrawable = balance > required ? balance - required : 0;
    }
    
    /**
     * @notice Get series info
     */
    function getSeriesInfo() external view returns (
        uint256 _maturityDate,
        uint256 _totalDeposited,
        uint256 _totalSupply,
        uint256 _recordCount,
        uint256 _cumulativeCouponIndex,
        bool _emergencyMode
    ) {
        return (
            maturityDate,
            totalDeposited,
            bondToken.totalSupply(),
            recordCount,
            cumulativeCouponIndex,
            emergencyRedeemEnabled
        );
    }
    
    /**
     * @notice Check if an address can record snapshot
     * @param keeper Address to check
     * @return canRecord True if address has KEEPER_ROLE and timing is valid
     * @return reason Reason if cannot record (empty if can record)
     */
    function canRecordSnapshot(address keeper) external view returns (bool canRecord, string memory reason) {
        if (!hasRole(KEEPER_ROLE, keeper)) {
            return (false, "Address does not have KEEPER_ROLE");
        }
        if (block.timestamp < nextRecordTime) {
            return (false, "Too soon to record snapshot");
        }
        if (block.timestamp >= maturityDate) {
            return (false, "Pool has expired");
        }
        return (true, "");
    }
    
    /**
     * @notice Get snapshot status information
     * @return canRecordNow True if snapshot can be recorded now
     * @return hasKeeperRole True if caller has KEEPER_ROLE
     * @return timeUntilNext Seconds until next snapshot can be recorded (0 if can record now)
     * @return isPoolExpired True if pool has expired
     * @return nextRecordTimestamp Timestamp when next snapshot can be recorded
     */
    function getSnapshotStatus(address keeper) external view returns (
        bool canRecordNow,
        bool hasKeeperRole,
        uint256 timeUntilNext,
        bool isPoolExpired,
        uint256 nextRecordTimestamp
    ) {
        hasKeeperRole = hasRole(KEEPER_ROLE, keeper);
        isPoolExpired = block.timestamp >= maturityDate;
        nextRecordTimestamp = nextRecordTime;
        
        if (block.timestamp >= nextRecordTime && !isPoolExpired) {
            timeUntilNext = 0;
            canRecordNow = hasKeeperRole;
        } else {
            if (nextRecordTime > block.timestamp) {
                timeUntilNext = nextRecordTime - block.timestamp;
            } else {
                timeUntilNext = 0;
            }
            canRecordNow = false;
        }
    }
}

