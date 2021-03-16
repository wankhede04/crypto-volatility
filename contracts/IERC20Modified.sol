// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

pragma solidity ^0.8.0;

/**
 * @dev Modified Interface of the OpenZeppelin's IERC20 to add the mint and burn function .
 */
interface IERC20Modified is IERC20, AccessControl {
    function mint(address _toWhom, uint256 amount) external;
    function burn(address _whose, uint256 amount) external;

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) public virtual {
        require(hasRole(_roles[role].adminRole, _msgSender()), "IERC20Modified: sender must be an admin to grant");

        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) public virtual {
        require(hasRole(_roles[role].adminRole, _msgSender()), "IERC20Modified: sender must be an admin to revoke");

        _revokeRole(role, account);
    }
}