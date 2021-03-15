// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./modifiedIERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title Protocol contract
 * @author dipeshsukhani [https://github.com/amateur-dev]
 */

contract VolmexProtocol is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for modifiedIERC20;

    // events
    // need to add


    // contract storage variables
    uint256 public minimumCollateralQty;
    bool public active;
    
    modifiedIERC20 public ETHVLAddress;
    modifiedIERC20 public ETHVSAddress;
    

    // contract mappings
    /// @notice collateral => status. 0 never set; 1 active, 2 inactive
    IERC20 public acceptableCollateral;

    // contract modifiers
    modifier onlyActive() {
        require(active, "Volmex: Protocol not active");
        _;
    }

    /// @dev at deployment making the protocol active
    /// @dev at deployment locking the minimumQTy at 25*10^18 tokens
    /// @dev at deployment making the daiToken as an acceptable coin for collateral
    /// @param _ETHVLAddress and _ETHVSAddress is the address of the Long and Short token
    constructor(
        address daiTokenAddress,
        address _ETHVLAddress,
        address _ETHVSAddress
        ) {
        active = true;
        minimumCollateralQty = 25 ether;
        acceptableCollateral = IERC20(daiTokenAddress);
        ETHVLAddress = modifiedIERC20(_ETHVLAddress);
        ETHVSAddress = modifiedIERC20(_ETHVSAddress);
    }


    // updating the modifiers
    /// @notice toggle the active variable; restricted to only the owner of the contract
    function toggle_Active() onlyOwner public {
        active = !active;
    }

    /// @notice to change the minimum qty required for collateral
    /// @param _newMinimumCollQty provide the minimum qty required
    function update_MinimumCollQTY(uint256 newMinimumCollQty) onlyOwner public {
        minimumCollateralQty = newMinimumCollQty;
    }

    /// @notice to change the ETHV Long Address
    function update_ETHVLAddress(address newETHVLAddress) onlyOwner public {
        ETHVLAddress = modifiedIERC20(newETHVLAddress);
    }

    /// @notice to change the ETHV Short Address
    function update_ETHVSAddress(address newETHVSAddress) onlyOwner public {
        ETHVSAddress = modifiedIERC20(newETHVSAddress);
    }

    /// @notice to add collateral to the protocol and mint the ethvl and ethvs tokens
    /// @param collateralCoinAddress Address of the Stable Coin that is being deposited into the protocol
    /// @param collateralQty Qty of the coins being deposited
    function collateralize(address collateralCoinAddress, uint256 collateralQty) onlyActive public  {
        // check that the collateral qty is at least the minium qty required
        require(collateralQty >= minimumCollateralQty, "Volmex: CollateralQty < minimum qty required");

        // check that the collateral is being accepted 
        require(
            acceptableCollateral[collateralCoinAddress] == 1,
            "VOLMEX: invalid collateral coin"
        );

        IERC20 collateral = IERC20(collateralCoinAddress);
        require(
            collateral.balanceOf(msg.sender) >= collateralQty,
            "coll qty > user balance"
        );
        uint256 collateralBalanceBefore = collateral.balanceOf(address(this));
        collateral.safeTransferFrom(msg.sender, address(this), collateralQty);
        uint256 collateralBalanceAfter = collateral.balanceOf(address(this));
        require(
            collateralBalanceAfter > collateralBalanceBefore,
            "collateral transfer failed"
        );
        // determining the ETHVL and ETHVS tokens to be issued
        // ratio is 1/10 Position Token for every 25 Collateral Coin
        uint qtyToBeMinted = SafeMath.div((SafeMath.div(collateralQty, 25)),10);
        // mint tokens for the msg.sender
        ETHVLAddress.mint(msg.sender, qtyToBeMinted);
        ETHVSAddress.mint(msg.sender, qtyToBeMinted);
    }

    /// @notice to redeem the collateral from the protocol
    /// @param longTokenQty quantity of the long token that the user are surrendering
    /// @param shortTokenQty quantity of the long token that the user are surrendering
    /// @param collateralCoinAddress Qty of the coins being deposited


    // TODO: to work on the redeem function
    function redeem(uint positionTokenQty) onlyActive public  {
        // checking the user has enough balance of position tokens
        uint ETHVLongBalance = ETHVLAddress.balanceOf(msg.sender);
        uint ETHVShortBalance = ETHVLAddress.balanceOf(msg.sender);

        // computing the collateralCoins Qty to be redemeed
        // ratio for every 1/10 PT of both 25 dai has to be redeemed


        // transfering the tokens to this address
        ETHVLongAddress.burnFrom(msg.sender, longTokenQty);
        ETHVShortAddress.burnFrom(msg.sender, shortTokenQty);
        
        // transferring the collateralOut to the msg.sender
        IERC20 collateral = IERC20(collateralCoinAddress);
        require(
            collateral.balanceOf(address(this)) >= collQtyToBeRedmd,
            "coll qty > available balance"
        );
        uint256 collateralBalanceBefore = collateral.balanceOf(address(this));
        collateral.safeTransfer(msg.sender, collQtyToBeRedmd);
        uint256 collateralBalanceAfter = collateral.balanceOf(address(this));
        require(
            collateralBalanceAfter < collateralBalanceBefore,
            "collateral transfer failed"
        );
    }

    /// @notice to change the ownership of the PT Token Address, should it ever be required
    function changePTOwnership(address newOwner, address PTTokenAddress) onlyOwner public {
        PTTokenAddress.transferOwnership(newOwner);
    }

    /// @notice to recover any tokens wrongly sent to this contract
    function recoverTokens(address token, address toWhom, uint howMuch) onlyOwner public {
        modifiedIERC20(token).safeTransfer(toWhom,howMuch);
    }


}
