// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/IERC20Modified.sol";
import "./tokens/VolmexPositionToken.sol";
import "./VolmexProtocol.sol";
import "./interfaces/IVolmexProtocol.sol";

/**
 * Factory is used to create respective indexes and position tokens
 */
contract IndexFactory is Ownable {
    event IndexCreated(
        uint256 indexed indexCount,
        address index,
        uint256 minimumCollateralQty,
        uint256 volatilityCapRatio
    );

    event PositionTokenCreated(
        address indexed volatilityToken,
        address indexed inverseVolatilityToken,
        string tokenName,
        string tokenSymbol
    );

    // Protocol implementation contract for factory
    address immutable implementation;

    // Position token implementation contract for factory
    address immutable positionTokenImplementation;

    // To store the address of volatility.
    mapping(uint256 => address) public getIndex;

    // To store the name of volatility
    mapping(uint256 => string) public getIndexSymbol;

    // Used to store the address and name of volatility at a particular index (incremental state of 1)
    uint256 public indexCount;

    bytes32 private constant VOLMEX_PROTOCOL_ROLE =
        0x33ba6006595f7ad5c59211bde33456cab351f47602fc04f644c8690bc73c4e16;
    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @notice Get the address of implementation contracts instance.
     */
    constructor() {
        implementation = address(new VolmexProtocol());
        positionTokenImplementation = address(new VolmexPositionToken());
    }

    /**
     * @notice Get the counterfactual address of protocol implementation.
     */
    function determineIndexAddress(uint256 _indexCount)
        external
        view
        returns (address)
    {
        bytes32 salt = keccak256(abi.encodePacked(_indexCount));
        return
            Clones.predictDeterministicAddress(
                getIndex[_indexCount],
                salt,
                address(this)
            );
    }

    /**
     * @notice Get the counterfactual address of position token implementation
     */
    function determinePositionTokenAddress(
        address _positionTokenImplementation,
        uint256 _indexCount,
        string memory _name
    ) external view returns (address) {
        bytes32 salt =
            keccak256(
                abi.encodePacked(
                    _indexCount,
                    _name,
                    getIndexSymbol[_indexCount]
                )
            );
        return
            Clones.predictDeterministicAddress(
                _positionTokenImplementation,
                salt,
                address(this)
            );
    }

    /**
     * @notice Create new index of volatility
     *
     * @dev Increment the indexCount by 1
     * @dev Clones the volatility and inverse volatility tokens
     * @dev Clone the protocol implementation with a salt to make it deterministic
     * @dev Stores the volatility address and name, referenced by indexCount
     * @dev Grants the VOLMEX_PROTOCOL_ROLE and DEFAULT_ADMIN_ROLE to protocol
     * @dev Emits event of volatility token name, index address and indexCount(position)
     *
     * @param _collateralTokenAddress is address of collateral token typecasted to IERC20Modified
     * @param _minimumCollateralQty is the minimum qty of tokens need to mint 0.1 long and short tokens
     * @param _volatilityCapRatio is the cap for volatility
     * @param _tokenName is the name for volatility
     * @param _tokenSymbol is the symbol for volatility
     */
    function createIndex(
        IERC20Modified _collateralTokenAddress,
        uint256 _minimumCollateralQty,
        uint256 _volatilityCapRatio,
        string memory _tokenName,
        string memory _tokenSymbol
    ) external onlyOwner returns (address _index) {
        ++indexCount;

        require(
            getIndex[indexCount] == address(0),
            "Volmex Protocol: Index already exists"
        );

        IERC20Modified volatilityToken =
            IERC20Modified(_clonePositonToken(_tokenName, _tokenSymbol));
        IERC20Modified inverseVolatilityToken =
            IERC20Modified(
                _clonePositonToken(
                    string(abi.encodePacked("Inverse ", _tokenName)),
                    string(abi.encodePacked("i", _tokenSymbol))
                )
            );

        // We will determine the salt for the current sender
        bytes32 salt = keccak256(abi.encodePacked(indexCount));

        // Clone the implementation with a salt so that it is deterministic
        address index = Clones.cloneDeterministic(implementation, salt);

        // Intialize the strategy
        IVolmexProtocol(index).initialize(
            _collateralTokenAddress,
            volatilityToken,
            inverseVolatilityToken,
            _minimumCollateralQty,
            _volatilityCapRatio
        );

        getIndex[indexCount] = index;
        getIndexSymbol[indexCount] = _tokenSymbol;

        volatilityToken.grantRole(VOLMEX_PROTOCOL_ROLE, index);
        inverseVolatilityToken.grantRole(VOLMEX_PROTOCOL_ROLE, index);

        volatilityToken.grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        volatilityToken.renounceRole(DEFAULT_ADMIN_ROLE, address(this));

        inverseVolatilityToken.grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        inverseVolatilityToken.renounceRole(DEFAULT_ADMIN_ROLE, address(this));

        emit IndexCreated(
            indexCount,
            index,
            _minimumCollateralQty,
            _volatilityCapRatio
        );

        emit PositionTokenCreated(
            address(volatilityToken),
            address(inverseVolatilityToken),
            _tokenName,
            _tokenSymbol
        );

        return index;
    }

    /**
     * @notice Clones the position token - { returns position token address }
     *
     * @dev Generates a salt using indexCount, token name and token symbol
     * @dev Clone the position token implementation with a salt make it deterministic
     * @dev Initializes the position token
     *
     * @param _name is the name of volatility token
     * @param _symbol is the symbol of volatility token
     */
    function _clonePositonToken(string memory _name, string memory _symbol)
        private
        returns (address _address)
    {
        bytes32 salt = keccak256(abi.encodePacked(indexCount, _name, _symbol));

        VolmexPositionToken newPositionToken =
            VolmexPositionToken(
                Clones.cloneDeterministic(positionTokenImplementation, salt)
            );
        newPositionToken.initialize(_name, _symbol);

        return address(newPositionToken);
    }
}
