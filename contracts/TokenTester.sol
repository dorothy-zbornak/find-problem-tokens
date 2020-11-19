// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7;

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 amount);

    function transferFrom(address owner, address to, uint256 amount)
        external
        returns (bool);
    function balanceOf(address owner) external view returns (uint256);
    function symbol() external view returns (string memory);
}

contract TokenTester {
    uint256 private constant TRANSFER_FROM_GAS = 200e3;

    function isProblemToken(IERC20 token, address[] calldata wallets)
        external
        returns (string memory symbol, bool isProblem, uint256 gasUsed)
    {
        {
            address wallet;
            for (uint256 i = 0; i < wallets.length; ++i) {
               if (token.balanceOf(wallets[i]) > 0) {
                    wallet = wallets[i];
                    break;
                }
            }
            require(wallet != address(0), 'WALLET_IS_EMPTY');
            gasUsed = gasleft();
            (bool success, bytes memory resultData) = address(token)
                .call{ gas: TRANSFER_FROM_GAS }(
                    abi.encodeWithSelector(
                        IERC20.transferFrom.selector,
                        wallet,
                        address(this),
                        1
                    )
                );
            gasUsed -= gasleft();
            if (success) {
                if (resultData.length != 0) {
                    assembly {
                        success := gt(mload(add(resultData, 32)), 0)
                    }
                }
            }
            isProblem = !success && gasUsed >= TRANSFER_FROM_GAS;
        }

        {
            (bool success, bytes memory resultData) = address(token)
                .staticcall(abi.encodeWithSelector(
                    IERC20.symbol.selector
                ));
            if (success) {
                if (resultData.length == 32) {
                    assembly {
                        symbol := mload(0x40)
                        mstore(0x40, add(symbol, 64))
                        mstore(symbol, 32)
                        mstore(add(symbol, 32), mload(add(resultData, 32)))
                    }
                } else {
                    symbol = abi.decode(resultData, (string));
                }
            } else {
                symbol = '???';
            }
        }
    }
}
