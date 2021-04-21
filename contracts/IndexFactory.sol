pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/IERC20Modified.sol";
import "./tokens/VolmexPositionToken.sol";
import './VolmexProtocol.sol';

contract IndexFactory is Ownable {
    // Implementation contracts for factory
    address immutable implementation;
    address immutable positionTokenImplementation;

    mapping(address => address) public getIndex;
    address[] public allIndex;

    event IndexCreated(string name, address token, address index, uint256 position);

    constructor() {
        implementation = address(new VolmexProtocol());
        positionTokenImplementation = address(new VolmexPositionToken());
    }

    function allIndexLength() external view returns (uint) {
        return allIndex.length;
    }
    
    function determineIndexAddress(address implementation, bytes32 salt, address deployer) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, salt, deployer);
    }
    
    function createIndex(
        address _token,
        IERC20Modified _collateralTokenAddress,  
        uint256 _minimumCollateralQty,
        uint256 _volatilityCapRatio,
        string memory _tokenName,
        string memory _tokenSymbol
    ) external onlyOwner returns (address index) {        
        // Make sure that the token isn't a zero address
        require(_token != address(0), 'Volmex Protocol: Zero address cannot be used as an index');

        // Make sure the index hasn't been created already
        require(getIndex[_token] == address(0), 'Volmex Protocol: Index already exists');

        IERC20Modified volatilityToken = IERC20Modified(clonePositonToken(_token, _tokenName, _tokenSymbol));
        IERC20Modified inverseVolatilityToken = IERC20Modified(clonePositonToken(_token, string(abi.encodePacked('Inverse ', _tokenName)), string(abi.encodePacked('i', _tokenSymbol))));
        
        // Next we will determine the salt for the current sender
        bytes32 salt = keccak256(abi.encodePacked(_token));
        
        // Clone the implementation with a salt so that it is deterministic
        VolmexProtocol newIndex = VolmexProtocol(Clones.cloneDeterministic(address(implementation), salt));

        // Intialize the strategy
        newIndex.initialize(_collateralTokenAddress, volatilityToken, inverseVolatilityToken, _minimumCollateralQty, _volatilityCapRatio);
        getIndex[_token] = address(newIndex); 
        allIndex.push(address(newIndex));

        emit IndexCreated(_tokenName, _token, address(newIndex), allIndex.length);

        return address(newIndex);
    }

    function clonePositonToken(address token, string memory name, string memory symbol) private returns (address _address) {
        bytes32 salt = keccak256(abi.encodePacked(token, name, symbol));
        // Clone the implementation with a salt so that it is deterministic
        VolmexPositionToken newPositionToken = VolmexPositionToken(Clones.cloneDeterministic(address(positionTokenImplementation), salt));
        newPositionToken.initialize(name, symbol);

        return address(newPositionToken);
    }
}