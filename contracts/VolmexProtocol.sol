// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./IERC20Modified.sol";
import "./library/VolmexSafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title Protocol Contract
 * @author ayush-volmex [https://github.com/ayush-volmex]
 */
contract VolmexProtocol is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using VolmexSafeERC20 for IERC20Modified;

    event ToggleActivated(bool isActive);
    event UpdatedPositionToken(address indexed positionToken, bool isLong);
    event Collateralized(
        address indexed sender,
        uint256 collateralLock,
        uint256 positionTokensMinted,
        uint256 fees
    );
    event Redeemed(
        address indexed sender,
        uint256 collateralReleased,
        uint256 positionTokenBurned,
        uint256 fees
    );
    event RedeemedSettled(
        address indexed sender,
        uint256 collateralReleased,
        uint256 longTokenBurned,
        uint256 shortTokenBurned,
        uint256 fees
    );
    event UpdatedFees(uint256 issuanceFees, uint256 redeemFees);
    event UpdatedMinimumCollateral(uint256 newMinimumCollateralQty);
    event ClaimedFees(uint256 fees);
    event ToggledPositionTokenPause(bool isPause);
    event Settled(uint256 settlementPrice);

    uint256 public minimumCollateralQty;
    bool public active;
    bool public isSettled;

    IERC20Modified public longPosition;
    IERC20Modified public shortPosition;

    // Only ERC20 standard functions are used by the collateral defined here.
    // Address of the acceptable collateral token.
    IERC20Modified public collateral;

    uint256 public issuanceFees;
    uint256 public redeemFees;
    uint256 public accumulatedFees;

    // Percentage value is upto two decimal places, so we're dividing it by 10000
    // Set the max fee as 5%, i.e. 500/10000.
    uint256 constant MAX_FEE = 500;

    // No need to add 18 decimals, because they are already considered in respective token qty arguments.
    uint256 public volatilityCapRatio;

    // This is the price of long volatility, ranges from 0 to volatilityCapRatio,
    // and the inverse can be calculated using volatilityCapRatio
    uint256 public settlementPrice;
    mapping(address => uint256) public blockLock;

    mapping (address => bool) public approved;

    /**
     * @notice Used to check calling address is active
     */
    modifier onlyActive() {
        require(active, "Volmex: Protocol not active");
        _;
    }

    /**
     * @notice Used to secure our functions from flash loans attack.
     */
    modifier blockLocked() {
        require(blockLock[msg.sender] < block.number, "Volmex: Operations are locked for current block");
        _;
    }

    /**
     * @notice Used to check callee is not a contract
     */
    modifier defend() {
        require(approved[msg.sender] || msg.sender == tx.origin, "Volmex: Access denied for caller");
        _;
    }

    /**
     * @notice Used to check calling address is not settled
     */
    modifier onlyNotSettled() {
        require(!isSettled, "Volmex: Protocol settled");
        _;
    }

    /**
     * @notice Used to check calling address is settled
     */
    modifier onlySettled() {
        require(isSettled, "Volmex: Protocol not settled");
        _;
    }

    /**
     * @notice Creates the {PositionTokens}.
     *
     * @dev Makes the protocol `active` at deployment
     * @dev Locks the `minimumCollateralQty` at 20*10^18 tokens
     * @dev Makes the collateral token as `collateral`
     *
     * @param _collateralTokenAddress is address of collateral token typecasted to IERC20Modified
     * @param _longPosition is address of long position token typecasted to IERC20Modified
     * @param _shortPosition is address of short position token typecasted to IERC20Modified
     */
    function initialize(
        IERC20Modified _collateralTokenAddress,
        IERC20Modified _longPosition,
        IERC20Modified _shortPosition,
        uint256 _minimumCollateralQty,
        uint256 _volatilityCapRatio
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();

        require(
            _minimumCollateralQty > 0,
            "Volmex: Minimum collateral quantity should be greater than 0"
        );

        active = true;
        minimumCollateralQty = _minimumCollateralQty;
        collateral = _collateralTokenAddress;
        longPosition = _longPosition;
        shortPosition = _shortPosition;
        volatilityCapRatio = _volatilityCapRatio;
    }

    /**
     * @notice Toggles the active variable. Restricted to only the owner of the contract.
     */
    function toggleActive() external onlyOwner {
        active = !active;
        emit ToggleActivated(active);
    }

    /**
     * @notice Update the `minimumCollateralQty`
     * @param _newMinimumCollQty Provides the new minimum collateral quantity
     */
    function updateMinimumCollQty(uint256 _newMinimumCollQty) external onlyOwner {
        require(
            _newMinimumCollQty > 0,
            "Volmex: Minimum collateral quantity should be greater than 0"
        );
        minimumCollateralQty = _newMinimumCollQty;
        emit UpdatedMinimumCollateral(_newMinimumCollQty);
    }

    /**
     * @notice Update the {Position Token}
     * @param _positionToken Address of the new position token
     * @param _isLong Type of the postion token, { Long: true, Short: false }
     */
    function updatePositionToken(address _positionToken, bool _isLong)
        external
        onlyOwner
    {
        _isLong
            ? longPosition = IERC20Modified(_positionToken)
            : shortPosition = IERC20Modified(_positionToken);
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
    function collateralize(uint256 _collateralQty) external onlyActive defend blockLocked onlyNotSettled {
        require(
            _collateralQty >= minimumCollateralQty,
            "Volmex: CollateralQty < minimum qty required"
        );

        collateral.safeTransferFrom(
            msg.sender,
            address(this),
            _collateralQty
        );

        uint256 fee;
        if (issuanceFees > 0) {
            fee = (_collateralQty * issuanceFees) / 10000;
            _collateralQty = _collateralQty - fee;
            accumulatedFees = accumulatedFees + fee;
        }

        uint256 qtyToBeMinted = _collateralQty / volatilityCapRatio;

        longPosition.mint(msg.sender, qtyToBeMinted);
        shortPosition.mint(msg.sender, qtyToBeMinted);

        emit Collateralized(msg.sender, _collateralQty, qtyToBeMinted, fee);

        _lockForBlock();
    }

    /**
     * @notice Redeem the collateral from the protocol by providing the position token
     *
     * @param _positionTokenQty Quantity of the position token that the user is surrendering
     *
     * Amount of collateral is `_positionTokenQty` by the volatilityCapRatio.
     * Burn the position token
     *
     * Safely transfer the collateral to `_msgSender`
     */
    function redeem(uint256 _positionTokenQty) external onlyActive defend blockLocked onlyNotSettled {
        uint256 collQtyToBeRedeemed = _positionTokenQty * volatilityCapRatio;

        uint256 fee;
        if (redeemFees > 0) {
            fee = (collQtyToBeRedeemed * redeemFees) / 10000;
            collQtyToBeRedeemed = collQtyToBeRedeemed - fee;
            accumulatedFees = accumulatedFees + fee;
        }

        longPosition.burn(msg.sender, _positionTokenQty);
        shortPosition.burn(msg.sender, _positionTokenQty);

        collateral.safeTransfer(msg.sender, collQtyToBeRedeemed);

        emit Redeemed(msg.sender, collQtyToBeRedeemed, _positionTokenQty, fee);

        _lockForBlock();
    }

    /**
     * @notice Redeem the collateral from the protocol after settlement
     *
     * @param _longTokenQty Quantity of the long position token that the user is surrendering
     * @param _shortTokenQty Quantity of the short position token that the user is surrendering
     *
     * Amount of collateral is `_longTokenQty` by the settlementPrice and `_shortTokenQty`
     * by volatilityCapRatio - settlementPrice
     * Burn the position token
     *
     * Safely transfer the collateral to `_msgSender`
     */
    function redeemSettled(uint256 _longTokenQty, uint256 _shortTokenQty) external onlyActive onlySettled {
        uint256 collQtyToBeRedeemed = (_longTokenQty * settlementPrice) + (_shortTokenQty * (volatilityCapRatio - settlementPrice));

        uint256 fee;
        if (redeemFees > 0) {
            fee = (collQtyToBeRedeemed * redeemFees) / 10000;
            collQtyToBeRedeemed = collQtyToBeRedeemed - fee;
            accumulatedFees = accumulatedFees + fee;
        }

        longPosition.burn(msg.sender, _longTokenQty);
        shortPosition.burn(msg.sender, _shortTokenQty);

        collateral.safeTransfer(msg.sender, collQtyToBeRedeemed);

        emit RedeemedSettled(msg.sender, collQtyToBeRedeemed, _longTokenQty, _shortTokenQty, fee);
    }

    /**
     * @notice Settle the contract, preventing new minting and providing individual token redemption
     *
     * @param _settlementPrice The price of the long after settlement
     *
     * The short token at settlement is worth volatilityCapRatio - long settlement price
     */
    function settle(uint256 _settlementPrice) external onlyOwner {
        require(_settlementPrice <= volatilityCapRatio, "Volmex: _settlementPrice should be less than equal to volatilityCapRatio");
        settlementPrice = _settlementPrice;
        isSettled = true;
        emit Settled(settlementPrice);
    }

    /**
     * @notice Recover tokens accidentally sent to this contract
     */
    function recoverTokens(
        address _token,
        address _toWhom,
        uint256 _howMuch
    ) external nonReentrant onlyOwner {
        require(
            _token != address(collateral),
            "Volmex: Collateral token not allowed"
        );
        IERC20Modified(_token).safeTransfer(_toWhom, _howMuch);
    }

    /**
     * @notice Update the percentage of `issuanceFees` and `redeemFees`
     *
     * @param _issuanceFees Percentage of fees required to collateralize the collateral
     * @param _redeemFees Percentage of fees reuired to redeem the collateral
     */
    function updateFees(uint256 _issuanceFees, uint256 _redeemFees)
        external
        onlyOwner
    {
        require(_issuanceFees <= MAX_FEE && _redeemFees <= MAX_FEE, "Volmex: issue/redeem fees should be less than MAX_FEE");

        issuanceFees = _issuanceFees;
        redeemFees = _redeemFees;

        emit UpdatedFees(_issuanceFees, _redeemFees);
    }

    /**
     * @notice Safely transfer the accumulated fees to owner
     */
    function claimAccumulatedFees() external onlyOwner {
        collateral.safeTransfer(owner(), accumulatedFees);
        delete accumulatedFees;

        emit ClaimedFees(accumulatedFees);
    }

    /**
     * @notice Pause/unpause volmex position token.
     *
     * @param _isPause Boolean value to pause or unpause the position token { true = pause, false = unpause }
     */
    function togglePause(bool _isPause) external onlyOwner {
        if (_isPause) {
            longPosition.pause();
            shortPosition.pause();
        } else {
            longPosition.unpause();
            shortPosition.unpause();
        }

        emit ToggledPositionTokenPause(_isPause);
    }

    function approveContractAccess(address account) external onlyOwner {
        approved[account] = true;
    }

    function revokeContractAccess(address account) external  onlyOwner {
        approved[account] = false;
    }

    function _lockForBlock() private {
        blockLock[msg.sender] = block.number;
    }
}
