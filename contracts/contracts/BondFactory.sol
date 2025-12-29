// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./BondToken.sol";
import "./BondSeries.sol";

/**
 * @title BondFactory
 * @notice Factory contract for creating and managing multiple BondSeries pools
 * @dev Each pool gets its own BondToken and BondSeries instance
 */
contract BondFactory is AccessControl {
    // ==================== CONSTANTS ====================
    
    bytes32 public constant POOL_CREATOR_ROLE = keccak256("POOL_CREATOR_ROLE");
    
    // ==================== STATE VARIABLES ====================
    
    uint256 public poolCount;
    address public immutable usdc;
    
    // ==================== STRUCTS ====================
    
    struct PoolInfo {
        uint256 poolId;
        address bondToken;
        address bondSeries;
        uint256 maturityDate;
        uint256 createdAt;
        bool isActive;
        string name;
        string symbol;
    }
    
    // ==================== MAPPINGS ====================
    
    mapping(uint256 => PoolInfo) public pools; // poolId => PoolInfo
    mapping(address => uint256) public poolIdByBondSeries; // bondSeries => poolId
    mapping(address => uint256) public poolIdByBondToken; // bondToken => poolId
    
    // ==================== EVENTS ====================
    
    event PoolCreated(
        uint256 indexed poolId,
        address indexed bondToken,
        address indexed bondSeries,
        uint256 maturityDate,
        string name,
        string symbol
    );
    
    // ==================== ERRORS ====================
    
    error InvalidAddress();
    error InvalidMaturityHours();
    error PoolNotFound();
    error InvalidName();
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Constructor
     * @param usdc_ USDC token address (same for all pools)
     * @param admin_ Admin address (will have DEFAULT_ADMIN_ROLE and POOL_CREATOR_ROLE)
     */
    constructor(address usdc_, address admin_) {
        if (usdc_ == address(0)) revert InvalidAddress();
        if (admin_ == address(0)) revert InvalidAddress();
        
        usdc = usdc_;
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(POOL_CREATOR_ROLE, admin_);
    }
    
    // ==================== POOL CREATION ====================
    
    /**
     * @notice Create a new bond pool
     * @param name_ BondToken name (e.g., "Bond 1")
     * @param keeper_ Keeper address for BondSeries
     * @param maturityHours_ Number of hours until maturity
     * @return poolId The ID of the newly created pool
     * @return bondToken Address of the deployed BondToken
     * @return bondSeries Address of the deployed BondSeries
     * @dev Symbol is always "arcUSDC" (hardcoded in contract)
     */
    function createPool(
        string memory name_,
        address keeper_,
        uint256 maturityHours_
    ) external onlyRole(POOL_CREATOR_ROLE) returns (
        uint256 poolId,
        address bondToken,
        address bondSeries
    ) {
        if (bytes(name_).length == 0) revert InvalidName();
        if (keeper_ == address(0)) revert InvalidAddress();
        if (maturityHours_ == 0) revert InvalidMaturityHours();
        
        poolCount++;
        poolId = poolCount;
        
        // Always use "arcUSDC" as symbol
        string memory symbol_ = "arcUSDC";
        
        // Deploy BondToken (Factory is temporary owner)
        BondToken newBondToken = new BondToken(
            name_,
            symbol_,
            address(this) // Temporary owner (will transfer to BondSeries)
        );
        bondToken = address(newBondToken);
        
        // Deploy BondSeries
        BondSeries newBondSeries = new BondSeries(
            bondToken,
            usdc,
            keeper_,
            maturityHours_
        );
        bondSeries = address(newBondSeries);
        
        // Set BondSeries address in BondToken (before ownership transfer, Factory is still owner)
        BondToken(bondToken).setBondSeries(bondSeries);
        
        // Transfer BondToken ownership to BondSeries
        BondToken(bondToken).transferOwnership(bondSeries);
        
        // Calculate maturity date
        uint256 maturityDate = block.timestamp + (maturityHours_ * 1 hours);
        
        // Store pool info
        pools[poolId] = PoolInfo({
            poolId: poolId,
            bondToken: bondToken,
            bondSeries: bondSeries,
            maturityDate: maturityDate,
            createdAt: block.timestamp,
            isActive: true,
            name: name_,
            symbol: symbol_
        });
        
        // Store reverse mappings
        poolIdByBondSeries[bondSeries] = poolId;
        poolIdByBondToken[bondToken] = poolId;
        
        emit PoolCreated(poolId, bondToken, bondSeries, maturityDate, name_, symbol_);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get pool information by poolId
     * @param poolId Pool ID
     * @return PoolInfo struct
     */
    function getPool(uint256 poolId) external view returns (PoolInfo memory) {
        if (poolId == 0 || poolId > poolCount) revert PoolNotFound();
        return pools[poolId];
    }
    
    /**
     * @notice Get pool information by BondSeries address
     * @param bondSeries_ BondSeries contract address
     * @return PoolInfo struct
     */
    function getPoolByBondSeries(address bondSeries_) external view returns (PoolInfo memory) {
        uint256 poolId = poolIdByBondSeries[bondSeries_];
        if (poolId == 0) revert PoolNotFound();
        return pools[poolId];
    }
    
    /**
     * @notice Get pool information by BondToken address
     * @param bondToken_ BondToken contract address
     * @return PoolInfo struct
     */
    function getPoolByBondToken(address bondToken_) external view returns (PoolInfo memory) {
        uint256 poolId = poolIdByBondToken[bondToken_];
        if (poolId == 0) revert PoolNotFound();
        return pools[poolId];
    }
    
    /**
     * @notice Get all pools (active and inactive)
     * @return Array of PoolInfo structs
     */
    function getAllPools() external view returns (PoolInfo[] memory) {
        PoolInfo[] memory allPools = new PoolInfo[](poolCount);
        for (uint256 i = 1; i <= poolCount; i++) {
            allPools[i - 1] = pools[i];
        }
        return allPools;
    }
    
    /**
     * @notice Get all active pools (not yet matured)
     * @return Array of active PoolInfo structs
     */
    function getActivePools() external view returns (PoolInfo[] memory) {
        uint256 activeCount = 0;
        
        // First pass: count active pools
        for (uint256 i = 1; i <= poolCount; i++) {
            if (pools[i].isActive && block.timestamp < pools[i].maturityDate) {
                activeCount++;
            }
        }
        
        // Second pass: collect active pools
        PoolInfo[] memory activePools = new PoolInfo[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= poolCount; i++) {
            if (pools[i].isActive && block.timestamp < pools[i].maturityDate) {
                activePools[index] = pools[i];
                index++;
            }
        }
        
        return activePools;
    }
    
    /**
     * @notice Get pool count
     * @return Total number of pools created
     */
    function getPoolCount() external view returns (uint256) {
        return poolCount;
    }
    
    /**
     * @notice Check if a pool is active (not matured)
     * @param poolId Pool ID
     * @return true if pool is active, false otherwise
     */
    function isPoolActive(uint256 poolId) external view returns (bool) {
        if (poolId == 0 || poolId > poolCount) revert PoolNotFound();
        PoolInfo memory pool = pools[poolId];
        return pool.isActive && block.timestamp < pool.maturityDate;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Mark a pool as inactive (admin only, for emergency cases)
     * @param poolId Pool ID to deactivate
     */
    function deactivatePool(uint256 poolId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (poolId == 0 || poolId > poolCount) revert PoolNotFound();
        pools[poolId].isActive = false;
    }
    
    /**
     * @notice Grant POOL_CREATOR_ROLE to an address
     * @param account Address to grant role to
     */
    function grantPoolCreatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(POOL_CREATOR_ROLE, account);
    }
    
    /**
     * @notice Revoke POOL_CREATOR_ROLE from an address
     * @param account Address to revoke role from
     */
    function revokePoolCreatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(POOL_CREATOR_ROLE, account);
    }
}

