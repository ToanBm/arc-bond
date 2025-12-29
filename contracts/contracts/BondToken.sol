// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BondToken
 * @notice ERC20 token representing bond ownership (collateral for USDC deposits)
 * @dev Only BondSeries contract can mint/burn. Hooks into transfers to handle interest accrual.
 */
contract BondToken is ERC20, Ownable {
    address public bondSeries;
    /**
     * @notice Constructor
     * @param name_ Token name (e.g., "ArcBond Token")
     * @param symbol_ Token symbol (e.g., "ABOND")
     * @param bondSeries_ Address of BondSeries contract (owner)
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address bondSeries_
    ) ERC20(name_, symbol_) Ownable(bondSeries_) {
        bondSeries = bondSeries_;
    }

    /**
     * @notice Override decimals to match USDC (6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Set BondSeries address (called by owner after ownership transfer)
     * @param bondSeries_ Address of BondSeries contract
     * @dev Only callable by owner (BondSeries contract)
     */
    function setBondSeries(address bondSeries_) external onlyOwner {
        bondSeries = bondSeries_;
    }

    /**
     * @notice Mint new bond tokens
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     * @dev Only callable by owner (BondSeries contract)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn bond tokens
     * @param from Address to burn tokens from
     * @param amount Amount to burn
     * @dev Only callable by owner (BondSeries contract)
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    /**
     * @notice Hook called before any transfer (OpenZeppelin ERC20 v5)
     * @dev Calls BondSeries._handleTransfer BEFORE updating balances to prevent transfer exploit
     * This ensures claimedIndex is updated and interest is claimed BEFORE balance changes
     * IMPORTANT: This is called BEFORE super._update(), so balances are still old values
     */
    function _update(address from, address to, uint256 value) internal override {
        // Call BondSeries hook BEFORE balance update to handle interest accrual
        // This prevents exploit where receiver could claim interest from before receiving tokens
        if (bondSeries != address(0)) {
            (bool success, bytes memory returnData) = bondSeries.call(
                abi.encodeWithSignature("_handleTransfer(address,address,uint256)", from, to, value)
            );
            if (!success) {
                // Try to decode error message for better debugging
                if (returnData.length > 0) {
                    assembly {
                        let returndata_size := mload(returnData)
                        revert(add(32, returnData), returndata_size)
                    }
                }
                revert("BondToken: transfer hook failed");
            }
        }
        // Update balances AFTER handling interest (CEI: Checks-Effects-Interactions)
        super._update(from, to, value);
    }
}

