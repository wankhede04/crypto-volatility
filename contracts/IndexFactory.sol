pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import '@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol';
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IERC20Modified.sol";
import "./tokens/VolmexPositionToken.sol";
import './VolmexProtocol.sol';

contract IndexFactory is Initializable, OwnableUpgradeable {
    // Implementation contracts for factory
    address immutable implementation;
    address immutable position_token_implementation;

    mapping(address => address) public getIndex;
    address[] public allIndex;

    event IndexCreated(string name, address indexed token, address indexed index, uint256 position);

    constructor() {
        implementation = address(new VolmexProtocol());
        position_token_implementation = address(new VolmexPositionToken());
    }

    function initialize() public initializer {
        __Ownable_init();
    }

    function allIndexLength() external view returns (uint) {
        return allIndex.length;
    }
    
    function createIndex(
        address token,
        IERC20Modified _collateralTokenAddress,  
        uint256 _minimumCollateralQty,
        uint256 _volatilityCapRatio
    ) external onlyOwner returns (address index) {        
        // Make sure that the token isn't a zero address
        require(token != address(0), 'Zero address cannot be used as an index');

        // Make sure the index hasn't been created already
        require(getIndex[token] != address(0), 'Index already exists');

        string memory tokenSymbol = ERC20(token).symbol();
        string memory tokenName = ERC20(token).name();

        VolmexPositionToken longToken = clonePositonToken(tokenSymbol, tokenName);
        VolmexPositionToken shortToken = clonePositonToken(tokenSymbol, tokenName);
        
        // Next we will determine the salt for the current sender
        bytes32 salt = keccak256(abi.encodePacked(token));
        
        // Clone the implementation with a salt so that it is deterministic
        address newIndex = ClonesUpgradeable.cloneDeterministic(address(implementation), salt);
        
        // Intialize the strategy
        VolmexProtocol(newIndex).initialize(_collateralTokenAddress, IERC20Modified(address(longToken)), IERC20Modified(address(shortToken)), _minimumCollateralQty, _volatilityCapRatio);
        getIndex[token] = newIndex; 
        allIndex.push(newIndex);
        emit IndexCreated(tokenName, token, newIndex, allIndex.length);

        return address(newIndex);
    }

    function clonePositonToken(string memory name, string memory symbol) private returns (VolmexPositionToken _address) {
        bytes32 salt = keccak256(abi.encodePacked(name, symbol));
        // Clone the implementation with a salt so that it is deterministic
        address newPositionToken = ClonesUpgradeable.cloneDeterministic(address(position_token_implementation), salt);
        VolmexPositionToken(newPositionToken).initialize(name, symbol);
        return VolmexPositionToken(newPositionToken);
    }
}