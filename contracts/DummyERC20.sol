// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

contract DummyERC20 is ERC20PresetMinterPauser {
    constructor() ERC20PresetMinterPauser("VolmexDummyERC20", "VDC") {
        mint(msg.sender, 10000000000000000000000);
    }
}