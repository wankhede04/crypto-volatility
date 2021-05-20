// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.2;

contract CustomInitializable {
    bool inited = false;

    modifier customInitializer() {
        require(!inited, "already inited");
        _;
        inited = true;
    }
}