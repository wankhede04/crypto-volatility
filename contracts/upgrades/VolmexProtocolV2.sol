// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.2;

import "../VolmexProtocol.sol";

/**
 * Upgraded version of VolmexProtocol
 */
contract VolmexProtocolV2 is VolmexProtocol {
    event AddedDevFees(uint256 fees);

    // Developer fees on transfers
    uint256 public devFees;

    /**
     * @notice Used to add developer fees on any action performed
     *
     * @param _devFees Amount of fee which is to be added for developer fees
     */
    function addDevFees(uint256 _devFees) external onlyOwner {
        devFees += _devFees;

        emit AddedDevFees(_devFees);
    }
}
