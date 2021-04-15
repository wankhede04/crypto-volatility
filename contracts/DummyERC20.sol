// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.2;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract DummyERC20 is ERC20PresetMinterPauser {
    constructor() ERC20PresetMinterPauser("VolmexDummyERC20", "VDC") {
        mint(msg.sender, 10000000000000000000000);
    }
}
