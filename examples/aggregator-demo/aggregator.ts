import { NAVISDKClient } from "navi-sdk";
import dotenv from 'dotenv';

dotenv.config();
const mainMnemonic = process.env.botMnemonic;
const rpc = process.env.realRPC;
const apiKey = process.env.apiKey;

const client = new NAVISDKClient({ mnemonic: mainMnemonic, networkType: rpc, numberOfAccounts: 1 });
const account = client.accounts[0];

const fromCoinAddress = '0x2::sui::SUI';
const toCoinAddress = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const amount = 1e9;
const minAmountOut = 0;

//get quote
client.getQuote(fromCoinAddress, toCoinAddress, amount, apiKey).then(quote => {
    console.log(quote);
});

//dry run swap
account.dryRunSwap(fromCoinAddress, toCoinAddress, amount, minAmountOut, apiKey).then(result => {
    console.log(result);
});

//swap and execute this on chain
account.swap(fromCoinAddress, toCoinAddress, amount, minAmountOut, apiKey).then(result => {
    console.log(result);
});