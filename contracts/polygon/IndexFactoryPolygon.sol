// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "../interfaces/IERC20Modified.sol";
import "./VolatilityTokenPolygon.sol";
import "../protocol/VolmexProtocol.sol";

/**
 * @title Factory Contract
 * @author volmex.finance [security@volmexlabs.com]
 */
contract IndexFactoryPolygon is OwnableUpgradeable {
    event IndexRegistered(
        uint256 indexed indexCount,
        VolmexProtocol indexed index
    );

    event VolatilityTokenCreated(
        IERC20Modified indexed volatilityToken,
        IERC20Modified indexed inverseVolatilityToken,
        string tokenName,
        string tokenSymbol
    );

    // To store the address of volatility.
    mapping(uint256 => address) public getIndex;

    // To store the name of volatility
    mapping(uint256 => string) public getIndexSymbol;

    // Used to store the address and name of volatility at a particular _index (incremental state of 1)
    uint256 public indexCount;

    // These are position token roles
    // Calculated as keccak256("VOLMEX_PROTOCOL_ROLE").
    bytes32 private constant VOLMEX_PROTOCOL_ROLE =
        0x33ba6006595f7ad5c59211bde33456cab351f47602fc04f644c8690bc73c4e16;

    // Referenced from Openzepplin AccessControl.sol
    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @notice Get the address of implementation contracts instance.
     */
    function initialize() external initializer {
        __Ownable_init();
    }

    /**
     * @notice Registers the Volmex Protocol
     *
     * @dev Check if state is at VolatilitysCreated
     * @dev Stores index address, referenced by indexCount
     * @dev Grants the VOLMEX_PROTOCOL_ROLE and DEFAULT_ADMIN_ROLE to protocol
     * @dev Update index state to Completed
     * @dev Emit event of index registered with indexCount and index address
     *
     * @param _volmexProtocolContract Address of VolmexProtocol typecasted to VolmexProtocol
     * @param _collateralSymbol Symbol of collateral used
     */
    function registerIndex(
        VolmexProtocol _volmexProtocolContract,
        string memory _collateralSymbol
    ) external onlyOwner {
        indexCount++;

        getIndex[indexCount] = address(_volmexProtocolContract);

        IERC20Modified volatilityToken =
            _volmexProtocolContract.volatilityToken();
        IERC20Modified inverseVolatilityToken =
            _volmexProtocolContract.inverseVolatilityToken();

        getIndexSymbol[indexCount] = string(
            abi.encodePacked(volatilityToken.symbol(), _collateralSymbol)
        );

        volatilityToken.grantRole(
            VOLMEX_PROTOCOL_ROLE,
            address(_volmexProtocolContract)
        );

        inverseVolatilityToken.grantRole(
            VOLMEX_PROTOCOL_ROLE,
            address(_volmexProtocolContract)
        );

        volatilityToken.grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        inverseVolatilityToken.grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        emit IndexRegistered(indexCount, _volmexProtocolContract);
    }
}
