// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev ERC20 token used for unit testing.
 */
contract Token is ERC20 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
}
