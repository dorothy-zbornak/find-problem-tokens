'use strict'
require('colors');
const FlexContract = require('flex-contract');
const process = require('process');
const crypto = require('crypto');

const { env: ENV } = process;
const TESTER_ADDRESS = '0x' + crypto.randomBytes(20).toString('hex');
const NULL_ADDRESS = '0x'+Buffer.alloc(20).toString('hex');
const TESTER_ARTIFACT = require('../build/TokenTester.output.json');
const tester = new FlexContract(
    TESTER_ARTIFACT.abi,
    TESTER_ADDRESS,
    { providerURI: ENV.NODE_RPC },
);

(async () => {
    for (const tokenAddress of require('../tokens.json').map(o => o.token)) {
        try {
            await testToken(tokenAddress);
        } catch (err) {
            const msg = /WALLET_IS_EMPTY/.test(err.message) ? 'WALLET_IS_EMPTY' : err.message;
            console.error(`[${'!'.red}]`.bold, msg);
        }
    }
})()
    .catch(err => { console.error(err); process.exit(1); })
    .then(() => process.exit(0));


async function testToken(tokenAddress) {
    const token = new FlexContract(
        require('../build/IERC20.output.json').abi,
        tokenAddress,
        { eth: tester.eth },
    );
    const events = await token.Transfer(null, null, null).since({ fromBlock: -512 });
    if (!events.length) {
        throw new Error(`No transfer events found for ${tokenAddress}`);
    }
    const wallets = Object.keys(Object.assign({},
        ...events.filter(e => e.args.to !== NULL_ADDRESS).map(e => ({[e.args.to] : true })).slice(0, 128),
    )).slice(0, 32);
    const {symbol, isProblem, gasUsed} = await tester
        .isProblemToken(token.address, wallets)
        .call({
            overrides: {
                [TESTER_ADDRESS]: { code: TESTER_ARTIFACT.deployedBytecode },
            },
            gas: 8e6,
            block: -1,
        });
    console.log(`${symbol.bold.yellow} (${tokenAddress}): ${isProblem ? 'true'.green : 'false'.red}, ${gasUsed}`);
}
