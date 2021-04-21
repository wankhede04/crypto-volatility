pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/IERC20Modified.sol";
import "./tokens/VolmexPositionToken.sol";
import './VolmexProtocol.sol';

contract IndexFactory is Ownable {
    event IndexCreated(string name, address index, uint256 position);

    // Protocol implementation contract for factory
    address immutable implementation;

    // Position token implementation contract for factory
    address immutable positionTokenImplementation;

    // To store the address of volatility.
    mapping(uint256 => address) public getIndex;

    // To store the name of volatility
    mapping(uint256 => string) public getIndexName;

    // Used to store the address and name of volatility at a particular index (incremental state of 1)
    uint256 public indexCount;

    /**
     * @notice Get the address of implementation contracts instance.
     */
    constructor() {
        implementation = address(new VolmexProtocol());
        positionTokenImplementation = address(new VolmexPositionToken());
    }

    /**
     * @notice Get the conterfactual address of protocol implementation.
     */
    function determineIndexAddress(address _implementation, bytes32 _salt, address _deployer) external view returns (address) {
        return Clones.predictDeterministicAddress(_implementation, _salt, _deployer);
    }

    /**
     * @notice Create new index of volatility
     *
     * @dev Increment the indexCount by 1
     * @dev Clones the volatility and inverse volatility tokens
     * @dev Clone the protocol implementation with a salt to make it deterministic
     * @dev Stores the volatility address and name, referenced by index
     * @dev Grants the VOLMEX_PROTOCOL_ROLE and DEFAULT_ADMIN_ROLE to protocol
     * @dev Emits event of volatility token name, index address and index count(position)
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
    ) external onlyOwner returns (address index) {

        ++indexCount;

        IERC20Modified volatilityToken = IERC20Modified(clonePositonToken(_tokenName, _tokenSymbol));
        IERC20Modified inverseVolatilityToken = IERC20Modified(clonePositonToken(string(abi.encodePacked('Inverse ', _tokenName)), string(abi.encodePacked('i', _tokenSymbol))));
        
        // Next we will determine the salt for the current sender
        bytes32 salt = keccak256(abi.encodePacked(indexCount));
        
        // Clone the implementation with a salt so that it is deterministic
        VolmexProtocol newIndex = VolmexProtocol(Clones.cloneDeterministic(address(implementation), salt));

        // Intialize the strategy
        newIndex.initialize(_collateralTokenAddress, volatilityToken, inverseVolatilityToken, _minimumCollateralQty, _volatilityCapRatio);

        getIndex[indexCount] = address(newIndex);
        getIndexName[indexCount] = _tokenName;

        bytes32 VOLMEX_PROTOCOL_ROLE = keccak256("VOLMEX_PROTOCOL_ROLE");
        bytes32 DEFAULT_ADMIN_ROLE = keccak256("DEFAULT_ADMIN_ROLE");

        volatilityToken.grantRole(VOLMEX_PROTOCOL_ROLE, address(newIndex));
        inverseVolatilityToken.grantRole(VOLMEX_PROTOCOL_ROLE, address(newIndex));

        _collateralTokenAddress.grantRole(DEFAULT_ADMIN_ROLE, address(newIndex));
        _collateralTokenAddress.renounceRole(DEFAULT_ADMIN_ROLE, address(this));

        emit IndexCreated(_tokenName, address(newIndex), indexCount);

        return address(newIndex);
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
    function clonePositonToken(string memory _name, string memory _symbol) private returns (address _address) {
        bytes32 salt = keccak256(abi.encodePacked(indexCount, _name, _symbol));
        // Clone the implementation with a salt so that it is deterministic
        VolmexPositionToken newPositionToken = VolmexPositionToken(Clones.cloneDeterministic(address(positionTokenImplementation), salt));
        newPositionToken.initialize(_name, _symbol);

        return address(newPositionToken);
    }
}