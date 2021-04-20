pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IERC20Modified.sol";
import "./tokens/VolmexPositionToken.sol";
import './VolmexProtocol.sol';

contract IndexFactory is Ownable {
    // Implementation contracts for factory
    address immutable implementation;
    address immutable position_token_implementation;

    mapping(address => address) public getIndex;
    address[] public allIndex;

    event IndexCreated(string name, address token, address index, uint256 position);

    constructor() {
        implementation = address(new VolmexProtocol());
        position_token_implementation = address(new VolmexPositionToken());
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

        VolmexPositionToken longToken = clonePositonToken(_token, _tokenName, _tokenSymbol);
        VolmexPositionToken shortToken = clonePositonToken(_token, string(abi.encodePacked('i', _tokenName)), _tokenSymbol);
        
        // Next we will determine the salt for the current sender
        bytes32 salt = keccak256(abi.encodePacked(_token));
        
        // Clone the implementation with a salt so that it is deterministic
        address newIndex = Clones.cloneDeterministic(address(implementation), salt);

        // Intialize the strategy
        VolmexProtocol(newIndex).initialize(_collateralTokenAddress, IERC20Modified(address(longToken)), IERC20Modified(address(shortToken)), _minimumCollateralQty, _volatilityCapRatio);
        getIndex[_token] = newIndex; 
        allIndex.push(newIndex);
        emit IndexCreated(_tokenName, _token, newIndex, allIndex.length);
        return address(newIndex);
    }

    function clonePositonToken(address token, string memory name, string memory symbol) private returns (VolmexPositionToken _address) {
        bytes32 salt = keccak256(abi.encodePacked(token, name, symbol));
        // Clone the implementation with a salt so that it is deterministic
        address newPositionToken = Clones.cloneDeterministic(address(position_token_implementation), salt);
        VolmexPositionToken(newPositionToken).initialize(name, symbol);
        return VolmexPositionToken(newPositionToken);
    }
}