// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

pragma solidity ^0.8.0;

/**
 * @dev Modified Interface of the OpenZeppelin's IERC20 to add the mint and burn function .
 */
interface IERC20Modified is IERC20 {
    function mint(address _toWhom, uint256 amount) external;
    function burn(address _whose, uint256 amount) external;
}