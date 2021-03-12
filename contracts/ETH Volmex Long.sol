// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ETHVL is Ownable, ERC20 {
    constructor() ERC20("ETH Volmex Long", "ETHVL") {}
    
    function mint(address _toWhom, uint256 amount) onlyOwner public {
        _mint(_toWhom, amount);
    }
    
    function burn(address _whose, uint256 amount) onlyOwner public {
        _burn(_whose, amount);
    }
    
    
}