// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BondMarketV2
 * @notice Gasless P2P Marketplace using EIP-712 Signatures
 */
contract BondMarketV2 is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== STATE ====================

    struct Order {
        address seller;
        address bondToken;
        uint256 bondAmount;
        uint256 usdcAmount; // Total price
        uint256 nonce;
        uint256 deadline;
    }

    // TypeHash for EIP-712
    bytes32 private constant ORDER_TYPEHASH = keccak256(
        "Order(address seller,address bondToken,uint256 bondAmount,uint256 usdcAmount,uint256 nonce,uint256 deadline)"
    );

    // Track used nonces per user to prevent replay
    mapping(address => mapping(uint256 => bool)) public isNonceUsed;

    address public immutable usdc;

    // ==================== EVENTS ====================

    event OrderMatched(
        bytes32 indexed orderHash,
        address indexed seller,
        address indexed buyer,
        address bondToken,
        uint256 bondAmount,
        uint256 usdcAmount
    );

    event OrderCancelled(address indexed seller, uint256 nonce);

    // ==================== ERRORS ====================

    error InvalidSignature();
    error OrderExpired();
    error NonceUsed();
    error InvalidAmount();

    // ==================== CONSTRUCTOR ====================

    constructor(address _usdc) EIP712("BondMarket", "2.0") {
        usdc = _usdc;
    }

    // ==================== MAIN FUNCTIONS ====================

    /**
     * @notice Execute a trade by matching a signed order
     * @param order The Order struct containing trade details
     * @param signature The signature from the seller
     */
    function matchOrder(Order calldata order, bytes calldata signature) external nonReentrant {
        // 1. Validations
        if (block.timestamp > order.deadline) revert OrderExpired();
        if (isNonceUsed[order.seller][order.nonce]) revert NonceUsed();
        if (order.bondAmount == 0 || order.usdcAmount == 0) revert InvalidAmount();

        // 2. Verify Signature
        bytes32 structHash = keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.seller,
            order.bondToken,
            order.bondAmount,
            order.usdcAmount,
            order.nonce,
            order.deadline
        ));

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        if (signer != order.seller) revert InvalidSignature();

        // 3. Mark Nonce as Used (Prevent Replay)
        isNonceUsed[order.seller][order.nonce] = true;

        // 4. Atomic Swap
        
        // Transfer USDC from Buyer -> Seller
        IERC20(usdc).safeTransferFrom(msg.sender, order.seller, order.usdcAmount);

        // Transfer Bond from Seller -> Buyer
        IERC20(order.bondToken).safeTransferFrom(order.seller, msg.sender, order.bondAmount);

        // 5. Emit Event
        emit OrderMatched(
            hash,
            order.seller,
            msg.sender,
            order.bondToken,
            order.bondAmount,
            order.usdcAmount
        );
    }

    /**
     * @notice Cancel an order by invalidating its nonce
     * @param nonce The nonce to invalidate
     */
    function cancelOrder(uint256 nonce) external {
        isNonceUsed[msg.sender][nonce] = true;
        emit OrderCancelled(msg.sender, nonce);
    }

    /**
     * @notice Check if a nonce is valid
     */
    function isValidNonce(address user, uint256 nonce) external view returns (bool) {
        return !isNonceUsed[user][nonce];
    }
}
