// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Modified Interface of the OpenZeppelin's IERC20 to add the mint and burn function .
 */
interface IERC20Modified is IERC20 {
    function mint(address _toWhom, uint256 amount) external;
    function burn(address _whose, uint256 amount) external;

    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;

    function pause() external;
    function unpause() external;
}
