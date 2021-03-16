// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ETHVS is Ownable, ERC20 {
    constructor() ERC20("ETH Volmex Short", "ETHVL") {}
    
    function mint(address _toWhom, uint256 amount) onlyOwner public {
        _mint(_toWhom, amount);
    }
    
    function burn(address _whose, uint256 amount) onlyOwner public {
        _burn(_whose, amount);
    }
    
    
}