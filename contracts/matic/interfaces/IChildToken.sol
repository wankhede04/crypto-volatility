// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.2;

interface IChildToken {
    function deposit(address user, bytes calldata depositData) external;
}