// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC20Modified.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title Protocol contract
 * @author dipeshsukhani [https://github.com/amateur-dev]
 */

contract VolmexProtocol is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Modified;

    // events
    // need to add
    event ToggleActive(address indexed owner, bool value);
    event UpdatePositionToken(address indexed positionToken, string name);
    event Collateralized(address indexed collateralAddress, uint256 collateralQty);
    event Redeem(address indexed collateralAddress, uint positionTokenQty);
    event PTOwnershipTransfer(address indexed owner, address indexed newOwner);


    // contract storage variables
    uint256 public minimumCollateralQty;
    bool public active;
    
    IERC20Modified public longPosition;
    IERC20Modified public shortPosition;
    

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
        address collateralTokenAddress,
        address _longPosition,
        address _shortPosition
        ) {
        active = true;
        minimumCollateralQty = 25 ether;
        acceptableCollateral = IERC20(collateralTokenAddress);
        longPosition = IERC20Modified(_longPosition);
        shortPosition = IERC20Modified(_shortPosition);
    }


    // updating the modifiers
    /// @notice toggle the active variable; restricted to only the owner of the contract
    function toggle_Active() public onlyOwner {
        active = !active;
        emit ToggleActive(_msgSender(), active);
    }

    /// @notice to change the minimum qty required for collateral
    /// @param _newMinimumCollQty provide the minimum qty required
    function update_MinimumCollQTY(uint256 newMinimumCollQty) public onlyOwner {
        minimumCollateralQty = newMinimumCollQty;
        // add event
    }

    /// @notice Update the {Position Token}
    function updatePositionToken(address positionToken, bool isLong) public onlyOwner {
        if (isLong) {
            longPosition = IERC20Modified(positionToken);
            emit UpdatePositionToken(positionToken, 'LONG_POSITION');
        } else {
            shortPosition = IERC20Modified(positionToken);
            emit UpdatePositionToken(positionToken, 'SHORT_POSITION');
        }
    }

    /// @notice to add collateral to the protocol and mint the ethvl and ethvs tokens
    /// @param collateralCoinAddress Address of the Stable Coin that is being deposited into the protocol
    /// @param collateralQty Qty of the coins being deposited
    function collateralize(IERC20 collateralCoinAddress, uint256 collateralQty) public onlyActive  {
        // check that the collateral qty is at least the minium qty required
        require(collateralQty >= minimumCollateralQty, "Volmex: CollateralQty < minimum qty required");

        // check that the collateral is being accepted 
        require(
            acceptableCollateral == collateralCoinAddress,
            "VOLMEX: invalid collateral coin"
        );

        collateral.safeTransferFrom(msg.sender, address(this), collateralQty);
        // determining the ETHVL and ETHVS tokens to be issued
        // ratio is 1/10 Position Token for every 25 Collateral Coin
        uint qtyToBeMinted = SafeMath.div((SafeMath.div(collateralQty, 25)),10);
        // mint tokens for the msg.sender
        longPosition.mint(msg.sender, qtyToBeMinted);
        shortPosition.mint(msg.sender, qtyToBeMinted);

        emit Collateralized(collateralCoinAddress, collateralQty);
    }

    /// @notice to redeem the collateral from the protocol
    /// @param longTokenQty quantity of the long token that the user are surrendering
    /// @param shortTokenQty quantity of the long token that the user are surrendering
    /// @param collateralCoinAddress Qty of the coins being deposited


    // TODO: to work on the redeem function
    function redeem(IERC20 collateralCoinAddress, uint positionTokenQty) public onlyActive  {
        require(
            acceptableCollateral == collateralCoinAddress,
            "VOLMEX: invalid collateral coin"
        );

        // computing the collateralCoins Qty to be redemeed
        // ratio for every 1/10 PT of both 25 dai has to be redeemed

        uint qtyToBeBurned = SafeMath.div(positionTokenQty, 2);
        uint collQtyToBeRedmd = SafeMath.mul(positionTokenQty, 250);

        // transfering the tokens to this address
        longPosition.burnFrom(msg.sender, qtyToBeBurned);
        shortPosition.burnFrom(msg.sender, qtyToBeBurned);
        
        // transferring the collateralOut to the msg.sender
        IERC20 collateral = IERC20(collateralCoinAddress);

        collateral.safeTransfer(msg.sender, collQtyToBeRedmd);

        emit Redeem(collateralCoinAddress, positionTokenQty);
    }

    /// @notice to change the ownership of the PT Token Address, should it ever be required
    function changePTOwnership(address newOwner, address PTTokenAddress) public onlyOwner {
        // PTTokenAddress.transferOwnership(newOwner);
        // Change the all the roles to new owner, sequentially

        PTTokenAddress.grantRole(MINTER_ROLE, newOwner);
        PTTokenAddress.grantRole(PAUSER_ROLE, newOwner);
        PTTokenAddress.grantRole(BURNER_ROLE, newOwner);

        PTTokenAddress.revokeRole(MINTER_ROLE, _msgSender());
        PTTokenAddress.revokeRole(PAUSER_ROLE, _msgSender());
        PTTokenAddress.revokeRole(BURNER_ROLE, _msgSender());

        PTTokenAddress.grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        PTTokenAddress.revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());

        emit PTOwnershipTransfer(_msgSender(), newOwner);
    }

    /// @notice to recover any tokens wrongly sent to this contract
    function recoverTokens(address token, address toWhom, uint howMuch) public onlyOwner {
        IERC20Modified(token).safeTransfer(toWhom,howMuch);
    }


}
