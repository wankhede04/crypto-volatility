// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./IERC20Modified.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Protocol contract
 * @author dipeshsukhani [https://github.com/amateur-dev]
 * @author ayush-volmex [https://github.com/ayush-volmex]
 */
contract VolmexProtocol is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Modified;

    event ToggleActivated(bool isActive);
    event UpdatedPositionToken(address indexed positionToken, bool isLong);
    event Collateralized(
        address indexed sender,
        uint256 collateralLock,
        uint256 positionTokensMinted
    );
    event Redeemed(address indexed sender, uint256 collateralReleased, uint256 positionTokenBurned);
    event PositionOwnershipTransfered(address indexed newOwner, address positionToken);
    event UpdatedMinimumCollateral(uint256 newMinimumCollateralQty);

    uint256 public minimumCollateralQty;
    bool public active;

    IERC20Modified public longPosition;
    IERC20Modified public shortPosition;

    // Address of the acceptable collateral token
    IERC20Modified public acceptableCollateral;

    bytes32 public constant DEFAULT_ADMIN_ROLE = keccak256("DEFAULT_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 private issuanceFees;
    uint256 private redeemFees;
    uint256 private accumulatedFees;

    /**
     * @notice Used to check calling address is active
     */
    modifier onlyActive() {
        require(active, "Volmex: Protocol not active");
        _;
    }

    /**
     * @notice Creates the {PositionTokens}.
     *
     * @dev Makes the protocol `active` at deployment
     * @dev Locks the `minimumCollateralQty` at 25*10^18 tokens
     * @dev Makes the collateral token as `acceptableCollateral`
     * 
     * @param _collateralTokenAddress is address of collateral token
     * @param _longPosition is address of long position token
     * @param _shortPosition is address of short position token
     */
    constructor(
        address _collateralTokenAddress,
        address _longPosition,
        address _shortPosition
    ) {
        active = true;
        minimumCollateralQty = 25 ether;
        issuanceFees = 0;
        redeemFees = 0;
        accumulatedFees = 0;
        acceptableCollateral = IERC20Modified(_collateralTokenAddress);
        longPosition = IERC20Modified(_longPosition);
        shortPosition = IERC20Modified(_shortPosition);
    }

    /**
     * @notice Toggles the active variable. Restricted to only the owner of the contract.
     */
    function toggleActive() public onlyOwner {
        active = !active;
        emit ToggleActivated(active);
    }

    /**
     * @notice Update the `minimumCollateralQty`
     * @param _newMinimumCollQty Provides the new minimum collateral quantity
     */
    function updateMinimumCollQTY(uint256 _newMinimumCollQty) public onlyOwner {
        minimumCollateralQty = _newMinimumCollQty;
        emit UpdatedMinimumCollateral(_newMinimumCollQty);
    }

    /**
     * @notice Update the {Position Token}
     * @param _positionToken Address of the new position token
     * @param _isLong Type of the postion token, { Long: true, Short: false }
     */
    function updatePositionToken(address _positionToken, bool _isLong)
        public
        onlyOwner
    {
        _isLong ? longPosition = IERC20Modified(_positionToken) : shortPosition = IERC20Modified(_positionToken);
        emit UpdatedPositionToken(_positionToken, _isLong);
    }

    /**
     * @notice Add collateral to the protocol and mint the position tokens
     * @param _collateralQty Quantity of the collateral being deposited
     * 
     * NOTE: Collateral quantity should be at least required minimum collateral quantity
     *
     * Calculation: Get the quantity for position token
     * Mint the position token for `_msgSender`
     * 
     */
    function collateralize(uint256 _collateralQty)
        public
        onlyActive
    {
        require(
            _collateralQty >= minimumCollateralQty,
            "Volmex: CollateralQty < minimum qty required"
        );

        uint256 feeToCollateralize = _collateralQty.mul(issuanceFees.div(100));
        _collateralQty = _collateralQty.sub(feeToCollateralize);
        accumulatedFees = accumulatedFees.add(feeToCollateralize);

        acceptableCollateral.safeTransferFrom(msg.sender, address(this), _collateralQty);

        uint256 qtyToBeMinted = _collateralQty.div(250);

        longPosition.mint(msg.sender, qtyToBeMinted);
        shortPosition.mint(msg.sender, qtyToBeMinted);

        emit Collateralized(msg.sender, _collateralQty, qtyToBeMinted);
    }

    /**
     * @notice Redeem the collateral from the protocol by providing the position token
     *
     * @param _positionTokenQty Quantity of the position token that the user is surrendering
     *
     * Amount of collateral is `_positionTokenQty` by the constant 250.
     * Burn the position token
     *
     * Safely transfer the collateral to `_msgSender`
     */
    function redeem(uint256 _positionTokenQty)
        public
        onlyActive
    {
        uint256 collQtyToBeRedeemed = SafeMath.mul(_positionTokenQty, 250);

        longPosition.burn(msg.sender, _positionTokenQty);
        shortPosition.burn(msg.sender, _positionTokenQty);

        uint256 feeToRedeem = collQtyToBeRedeemed.mul(redeemFees.div(100));
        collQtyToBeRedeemed = collQtyToBeRedeemed.sub(feeToRedeem);
        accumulatedFees = accumulatedFees.add(feeToRedeem);

        acceptableCollateral.safeTransfer(msg.sender, collQtyToBeRedeemed);

        emit Redeemed(msg.sender, collQtyToBeRedeemed, _positionTokenQty);
    }

    /**
     * @notice change the ownership of the Position Token Address
     *
     * @param _newOwner Address of the new owner
     * @param _positionTokenAddress Address of the new owner
     */
    function changePositionTokenOwnership(address _newOwner, address _positionTokenAddress)
        public onlyOwner
    {
        IERC20Modified(_positionTokenAddress).grantRole(MINTER_ROLE, _newOwner);
        IERC20Modified(_positionTokenAddress).renounceRole(MINTER_ROLE, _msgSender());

        IERC20Modified(_positionTokenAddress).grantRole(PAUSER_ROLE, _newOwner);
        IERC20Modified(_positionTokenAddress).renounceRole(PAUSER_ROLE, _msgSender());

        IERC20Modified(_positionTokenAddress).grantRole(BURNER_ROLE, _newOwner);
        IERC20Modified(_positionTokenAddress).renounceRole(BURNER_ROLE, _msgSender());

        IERC20Modified(_positionTokenAddress).grantRole(DEFAULT_ADMIN_ROLE, _newOwner);
        IERC20Modified(_positionTokenAddress).renounceRole(DEFAULT_ADMIN_ROLE, _msgSender());

        emit PositionOwnershipTransfered(_newOwner, _positionTokenAddress);
    }

    /**
     * @notice Recover tokens accidentally sent to this contract
     */
    function recoverTokens(
        address _token,
        address _toWhom,
        uint256 _howMuch
    ) public onlyOwner {
        require(_token != address(acceptableCollateral), "Volmex: Collateral token not allowed");
        IERC20Modified(_token).safeTransfer(_toWhom, _howMuch);
    }

    /**
     * @notice Update the percentage of `issuanceFees` and `redeemFees`
     * 
     * @param _issuanceFees Percentage of fees required to collateralize the collateral
     * @param _redeemFees Percentage of fees reuired to redeem the collateral
     */
    function updateFees(uint256 _issuanceFees, uint256 _redeemFees) public onlyOwner {
        issuanceFees = _issuanceFees;
        redeemFees = _redeemFees;
    }
}
