// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

pragma solidity 0.7.6;

/**
 * @dev Modified Interface of the OpenZeppelin's IERC20 to add the mint and burn function .
 */
interface IERC20Modified is IERC20 {
    function mint(address _toWhom, uint256 amount) external;
    function burn(address _whose, uint256 amount) external;

    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
}
