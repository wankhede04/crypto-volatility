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

    mapping(uint256 => address) public getIndex;
    mapping(uint256 => string) public getIndexName;
    uint256 public indexCount;

    event IndexCreated(string name, address index, uint256 position);

    constructor() {
        implementation = address(new VolmexProtocol());
        positionTokenImplementation = address(new VolmexPositionToken());
    }

    function determineIndexAddress(address implementation, bytes32 salt, address deployer) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, salt, deployer);
    }
    
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

        emit IndexCreated(_tokenName, address(newIndex), indexCount);

        return address(newIndex);
    }

    function clonePositonToken(string memory name, string memory symbol) private returns (address _address) {
        bytes32 salt = keccak256(abi.encodePacked(indexCount, name, symbol));
        // Clone the implementation with a salt so that it is deterministic
        VolmexPositionToken newPositionToken = VolmexPositionToken(Clones.cloneDeterministic(address(positionTokenImplementation), salt));
        newPositionToken.initialize(name, symbol);

        return address(newPositionToken);
    }
}