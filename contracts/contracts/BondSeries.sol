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
 * @notice Main contract for fixed-rate bond issuance with continuous interest accrual
 * @dev Interest accrues continuously based on block.timestamp. No snapshot mechanism required.
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
    uint256 public constant PRECISION = 1e6; // Match USDC decimals for zero precision loss
    uint256 public constant MAX_CAP = 10_000e6; // 10,000 USDC cap
    
    // Interest accrual: 0.001 USDC per token per day = 0.001e6 / 86400 per second
    // COUPON_PER_TOKEN_PER_DAY = 0.001e6 = 1,000 (6 decimals, meaning 0.001 USDC)
    // Index rate per second: 1,000 / 86,400 (but integer division = 0, loses precision)
    // To avoid precision loss: INDEX_RATE_PER_SECOND = (COUPON_PER_TOKEN_PER_DAY * PRECISION) / 86400
    // This stores: (1,000 * 1,000,000) / 86,400 = 11,574,074
    // When calculating index: use INDEX_RATE_PER_SECOND directly (already has PRECISION scaling built-in)
    // Index increases by: timeElapsed * INDEX_RATE_PER_SECOND / PRECISION
    // But we need: 1,000 / 86,400 per second = 11,574.074 per second (with PRECISION scaling)
    // So INDEX_RATE_PER_SECOND should be: (COUPON_PER_TOKEN_PER_DAY * PRECISION * PRECISION) / 86400
    uint256 public constant INDEX_RATE_PER_SECOND = (COUPON_PER_TOKEN_PER_DAY * PRECISION * PRECISION) / 86400;

    // ==================== STATE VARIABLES ====================
    
    BondToken public immutable bondToken;
    IERC20 public immutable usdc;
    
    uint256 public maturityDate;
    uint256 public lastDistributionIndex; // Index value at last distribution time (snapshot of continuously growing index)
    uint256 public lastDistributionTime; // Timestamp when index was last set
    uint256 public totalDeposited; // Total USDC deposited
    bool public emergencyRedeemEnabled;
    
    // ==================== MAPPINGS ====================
    
    mapping(address => uint256) public claimedIndex; // User's last claimed index
    mapping(address => uint256) public interestReceived; // Total USDC interest received by user
    
    // ==================== EVENTS ====================
    
    event Deposited(address indexed user, uint256 usdcAmount, uint256 bondAmount, uint256 timestamp);
    event InterestDistributed(uint256 amount, uint256 newIndex, uint256 timestamp);
    event InterestClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event Redeemed(address indexed user, uint256 bondAmount, uint256 usdcAmount, uint256 timestamp);
    event EmergencyRedeemEnabled(uint256 timestamp);
    event OwnerWithdraw(address indexed owner, uint256 amount, uint256 timestamp);
    
    // ==================== ERRORS ====================
    
    error CapExceeded();
    error InvalidAmount();
    error NotMatured();
    error PoolExpired();
    error InsufficientBalance();
    error ReserveViolation();
    error EmergencyNotEnabled();
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Constructor
     * @param bondToken_ BondToken contract address
     * @param usdc_ USDC token address
     * @param keeper_ Keeper address (backend automation)
     * @param maturityHours_ Number of hours until maturity
     */
    constructor(
        address bondToken_,
        address usdc_,
        address keeper_,
        uint256 maturityHours_
    ) {
        bondToken = BondToken(bondToken_);
        usdc = IERC20(usdc_);
        maturityDate = block.timestamp + (maturityHours_ * 1 hours);
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, keeper_);
        
        // Initialize distribution tracking
        lastDistributionTime = block.timestamp;
        lastDistributionIndex = 0;
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
        // _handleTransfer hook in BondToken will automatically:
        // 1. Claim interest on existing balance (if any)
        // 2. Update claimedIndex to current index
        bondToken.mint(msg.sender, bondAmount);
        
        emit Deposited(msg.sender, usdcAmount, bondAmount, block.timestamp);
    }
    
    /**
     * @notice Claim accumulated interest
     * @return claimed Amount of USDC claimed
     */
    function claimInterest() external nonReentrant returns (uint256 claimed) {
        uint256 userBalance = bondToken.balanceOf(msg.sender);
        if (userBalance == 0) return 0;
        
        // Get current index (calculated real-time based on time elapsed)
        uint256 currentIndex = getCurrentIndex();
        
        // Calculate unclaimed coupon
        uint256 indexDelta = currentIndex - claimedIndex[msg.sender];
        // Both 6 decimals, no conversion needed
        claimed = (indexDelta * userBalance) / PRECISION;
        
        if (claimed == 0) return 0;
        
        // Update user's claimed index and total interest received
        claimedIndex[msg.sender] = currentIndex;
        interestReceived[msg.sender] += claimed;
        
        // Transfer USDC coupon to user
        usdc.safeTransfer(msg.sender, claimed);
        
        emit InterestClaimed(msg.sender, claimed, block.timestamp);
    }
    
    /**
     * @notice Redeem BondTokens for USDC principal at maturity
     * @param bondAmount Amount of BondToken to redeem (18 decimals)
     */
    function redeem(uint256 bondAmount) external nonReentrant {
        if (block.timestamp < maturityDate) revert NotMatured();
        if (bondAmount == 0) revert InvalidAmount();
        
        // Claim any pending interest first
        uint256 currentIndex = getCurrentIndex();
        if (currentIndex > claimedIndex[msg.sender]) {
            this.claimInterest();
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
    
    // ==================== OWNER FUNCTIONS ====================
    
    /**
     * @notice Owner deposits USDC to fund interest payments
     * @param amount Amount of USDC to deposit
     * @dev Index increases continuously. This function snapshots the current index.
     */
    function distributeInterest(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        // Transfer USDC from owner to contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Check emergency mode BEFORE updating (check if previous period was overdue)
        // After distribution, emergency mode is reset
        if (block.timestamp - lastDistributionTime > DEFAULT_GRACE_PERIOD) {
            // Was overdue, enable emergency mode (if not already enabled)
            if (!emergencyRedeemEnabled) {
                emergencyRedeemEnabled = true;
                emit EmergencyRedeemEnabled(block.timestamp);
            }
        }
        
        // Snapshot the current continuously growing index
        uint256 currentIndex = getCurrentIndex();
        lastDistributionIndex = currentIndex;
        lastDistributionTime = block.timestamp;
        
        // Reset emergency mode after distribution
        if (emergencyRedeemEnabled) {
            emergencyRedeemEnabled = false;
        }
        
        emit InterestDistributed(amount, currentIndex, block.timestamp);
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
     * @notice Get current index (calculated real-time based on time elapsed)
     * @return Current cumulative interest index
     */
    function getCurrentIndex() public view returns (uint256) {
        uint256 timeElapsed = block.timestamp - lastDistributionTime;
        // INDEX_RATE_PER_SECOND = (COUPON_PER_TOKEN_PER_DAY * PRECISION * PRECISION) / 86400
        // = (1,000 * 1,000,000 * 1,000,000) / 86,400 = 11,574,074,074,074
        // Index increase: (timeElapsed * INDEX_RATE_PER_SECOND) / (PRECISION * PRECISION)
        // Example: 1 second * 11,574,074,074,074 / (1,000,000 * 1,000,000) = 11,574.074 (6 decimals)
        // This equals 0.011574074 USDC per token per second = 1,000 per day (0.001 USDC/token/day) ✓
        return lastDistributionIndex + (timeElapsed * INDEX_RATE_PER_SECOND) / (PRECISION * PRECISION);
    }
    
    /**
     * @notice Calculate claimable interest for a user
     * @param user User address
     * @return Claimable USDC amount
     */
    function claimableAmount(address user) external view returns (uint256) {
        uint256 userBalance = bondToken.balanceOf(user);
        if (userBalance == 0) return 0;
        
        uint256 currentIndex = getCurrentIndex();
        uint256 indexDelta = currentIndex - claimedIndex[user];
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
        uint256 _currentIndex,
        uint256 _lastDistributionTime,
        bool _emergencyMode
    ) {
        return (
            maturityDate,
            totalDeposited,
            bondToken.totalSupply(),
            getCurrentIndex(),
            lastDistributionTime,
            emergencyRedeemEnabled
        );
    }
    
    /**
     * @notice Check and update emergency mode if needed (time-based)
     * @dev Can be called by anyone to check/update emergency status
     */
    function checkEmergencyMode() external {
        if (block.timestamp - lastDistributionTime > DEFAULT_GRACE_PERIOD) {
            emergencyRedeemEnabled = true;
            emit EmergencyRedeemEnabled(block.timestamp);
        }
    }
    
    /**
     * @notice Handle transfer hook from BondToken
     * @dev Called by BondToken BEFORE balance update in _update() to claim interest and update claimedIndex for both from and to
     * This prevents transfer exploit where receiver could claim interest from before they received tokens
     * IMPORTANT: This is called before super._update() in BondToken, so balances are still old values
     * Reentrancy protection: Balances are updated AFTER this call (CEI pattern), so reentrancy is safe
     * @param from Address sending tokens
     * @param to Address receiving tokens
     * @notice Gas cost: Adds ~30k-50k gas per transfer due to USDC transfers. Acceptable on L2s, expensive on L1.
     */
    function _handleTransfer(address from, address to, uint256 /* amount */) external {
        // Only BondToken contract can call this
        require(msg.sender == address(bondToken), "BondSeries: only BondToken can call");
        
        uint256 currentIndex = getCurrentIndex();
        
        // SENDER: If this is a transfer or burn (from != 0), update their rewards
        if (from != address(0)) {
            _updateUserRewards(from, currentIndex);
        }
        
        // RECEIVER: If this is a transfer or mint (to != 0)
        if (to != address(0)) {
            // New user (claimedIndex = 0): Just initialize their index
            if (claimedIndex[to] == 0) {
                claimedIndex[to] = currentIndex;
            } else {
                // Existing user: Update rewards on their existing balance before receiving new tokens
                _updateUserRewards(to, currentIndex);
            }
        }
    }
    
    /**
     * @notice Update user rewards and claimed index (internal helper)
     * @dev Claims accumulated interest and updates claimedIndex to current index
     * @param user User address
     * @param currentIndex Current cumulative interest index
     */
    function _updateUserRewards(address user, uint256 currentIndex) internal {
        uint256 balance = bondToken.balanceOf(user);
        if (balance > 0 && claimedIndex[user] > 0) {
            uint256 indexDelta = currentIndex > claimedIndex[user] ? currentIndex - claimedIndex[user] : 0;
            if (indexDelta > 0) {
                uint256 reward = (indexDelta * balance) / PRECISION;
                uint256 available = usdc.balanceOf(address(this));
                
                // Only transfer if we have enough balance (defensive check)
                if (reward > 0 && reward <= available) {
                    interestReceived[user] += reward;
                    usdc.safeTransfer(user, reward);
                    emit InterestClaimed(user, reward, block.timestamp);
                }
            }
        }
        // Always update claimedIndex to current index
        claimedIndex[user] = currentIndex;
    }
}

