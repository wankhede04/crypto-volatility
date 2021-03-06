// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";


/**
 * @title Protocol contract
 * @author dipeshsukhani [https://github.com/amateur-dev]
 */

contract VolmexProtocol is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // contract storage variables
    uint256 public minimumCollateralQty;
    bool public active;
    ERC20PresetMinterPauser public ETHVLongAddress;
    ERC20PresetMinterPauser public ETHVShortAddress;


    // contract mappings
    /// @notice collateral => status. 0 never set; 1 active, 2 inactive
    mapping(address => uint8) public acceptableCollateral;

    // contract modifiers
    modifier onlyActive() {
        require(active, "Volmex: Protocol not active");
        _;
    }

    constructor(uint256 _minimumCollQty) {
        active = true;
        minimumCollateralQty = _minimumCollQty;
        ETHVLongAddress = new ERC20PresetMinterPauser("ETHVLong", "ETHVL");
        ETHVShortAddress = new ERC20PresetMinterPauser("ETHVShort", "ETHVS");
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        bytes32 PAUSER_ROLE = keccak256("PAUSER_ROLE");
        ETHVLongAddress.grantRole(MINTER_ROLE, msg.sender);
        ETHVLongAddress.grantRole(PAUSER_ROLE, msg.sender);
        ETHVShortAddress.grantRole(MINTER_ROLE, msg.sender);
        ETHVShortAddress.grantRole(PAUSER_ROLE, msg.sender);
        bytes32 DEFAULT_ADMIN_ROLE = 0x00;
        ETHVLongAddress.grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }


    // updating the modifiers
    /// @notice toggle the active variable; restricted to only the owner of the contract
    function toggle_Active() onlyOwner public {
        active = !active;
    }

    /// @notice to update the acceptable status of any collateral coin
    /// @param _collateralAddress Address of the Collateral Coin for which the status has to be updated
    /// @param _newStatus either number 1 or number 2, based on the mapping of acceptableCollateral
    function update_AcceptableCollateral(address _collateralAddress, uint8 _newStatus) onlyOwner public {
        require (_newStatus == 1 || _newStatus == 2, "Volmex: New Status provided not within the range");
        acceptableCollateral[_collateralAddress] = _newStatus;
    }

    // @notice to change the minimum qty required for collateral
    /// @param _newMinimumCollQty provide the minimum qty required
    function update_MinimumCollQTY(uint256 _newMinimumCollQty) onlyOwner public {
        minimumCollateralQty = _newMinimumCollQty;
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
        // for draft1 - the ratio is assumed to be 0.5 ETHVL and 0.5 ETHVS token issued for every 1 collateral
        // hence, the miniumum collateral qty has to be 2 tokens so that at least 1 token can be issued eachof ETHVL and ETHVS
        uint ETHVLong_TokensToBeMinted = SafeMath.div(collateralQty, 2);
        uint ETHVShort_TokensToBeMinted = SafeMath.sub(collateralQty, ETHVLong_TokensToBeMinted);
        // mint tokens for the msg.sender
        ETHVLongAddress.mint(msg.sender, ETHVLong_TokensToBeMinted);
        ETHVShortAddress.mint(msg.sender, ETHVShort_TokensToBeMinted);
    }

    /// @notice to redeem the collateral from the protocol
    /// @param longTokenQty quantity of the long token that the user are surrendering
    /// @param shortTokenQty quantity of the long token that the user are surrendering
    /// @param collateralCoinAddress Qty of the coins being deposited

    function redeem(uint longTokenQty, uint shortTokenQty, address collateralCoinAddress) onlyActive public  {
        require (longTokenQty == shortTokenQty, "Volmex: Long and Short Tokens have to be in equal");
        // computing the collateralCoins Qty to be redemeed
        uint totalLongAndShortQty = SafeMath.add(longTokenQty,shortTokenQty);
        uint collQtyToBeRedmd = SafeMath.div(totalLongAndShortQty, 2);

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

    
}
