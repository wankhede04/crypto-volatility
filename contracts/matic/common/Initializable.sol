// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.2;

contract Initializable {
    bool inited = false;

    modifier initializer() {
        require(!inited, "already inited");
        _;
        inited = true;
    }
}