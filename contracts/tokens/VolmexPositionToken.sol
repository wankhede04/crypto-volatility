// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.2;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * This contract is used to deploy the volatility and inverse volatility tokens.
 */
contract VolmexPositionToken is Context, AccessControl, ERC20Pausable {
    bytes32 public constant VOLMEX_PROTOCOL_ROLE = keccak256("VOLMEX_PROTOCOL_ROLE");

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE` and `VOLMEX_PROTOCOL_ROLE` to the
     * account that deploys the contract.
     *
     * See {ERC20-constructor}.
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(VOLMEX_PROTOCOL_ROLE, _msgSender());
    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `VOLMEX_PROTOCOL_ROLE`.
     */
    function mint(address to, uint256 amount) public virtual {
        require(
            hasRole(VOLMEX_PROTOCOL_ROLE, _msgSender()),
            "VolmexPositionToken: must have volmex protocol role to mint"
        );
        _mint(to, amount);
    }

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     */
    function burn(address from, uint256 amount) public virtual {
        require(
            hasRole(VOLMEX_PROTOCOL_ROLE, _msgSender()),
            "VolmexPositionToken: must have volmex protocol role to burn"
        );
        _burn(from, amount);
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - the caller must have the `VOLMEX_PROTOCOL_ROLE`.
     */
    function pause() public virtual {
        require(
            hasRole(VOLMEX_PROTOCOL_ROLE, _msgSender()),
            "VolmexPositionToken: must have volmex protocol role to pause"
        );
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - the caller must have the `VOLMEX_PROTOCOL_ROLE`.
     */
    function unpause() public virtual {
        require(
            hasRole(VOLMEX_PROTOCOL_ROLE, _msgSender()),
            "VolmexPositionToken: must have volmex protocol role to unpause"
        );
        _unpause();
    }
}
