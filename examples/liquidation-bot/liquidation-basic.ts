import { NAVISDKClient } from "navi-sdk";
import { Transaction } from "@mysten/sui/transactions";
import { SignAndSubmitTXB, liquidateFunction } from 'navi-sdk/dist/libs/PTB'
import dotenv from 'dotenv';
import { CETUS, getConfig, pool, Sui, wUSDC, USDT, vSui } from 'navi-sdk/dist/address';
import { PoolConfig, Pool, CoinInfo } from 'navi-sdk/dist/types';
import { AccountManager } from "navi-sdk/dist/libs/AccountManager";
dotenv.config();

const accountKey = process.env.mnemonic;
const client = new NAVISDKClient({ mnemonic: accountKey });
const account = client.accounts[0];
const sender = account.address;
console.log(`use address: `, account.address)

const to_pay_coin: CoinInfo = USDT;
const to_liquidate_address = '0x111';
const collectral_coin: CoinInfo = Sui;

console.log(`\n\nTo Liquidate address: `, to_liquidate_address)
let [coinObj, to_liquidate_amount] = await getCoinObj(account, to_pay_coin);

//Initialize the TransactionBlock
let txb = new Transaction();
txb.setSender(sender);

//Add the liquidation function to the ptb
const [collateralBalance, remainDebtBalance] = await liquidateFunction(txb, to_pay_coin, txb.object(coinObj), collectral_coin, to_liquidate_address, to_liquidate_amount)
const [collateralCoin] = txb.moveCall({
    target: `0x2::coin::from_balance`,
    arguments: [collateralBalance],
    typeArguments: [collectral_coin.address],
});


const [leftDebtCoin] = txb.moveCall({
    target: `0x2::coin::from_balance`,
    arguments: [remainDebtBalance],
    typeArguments: [to_pay_coin.address],
});

txb.transferObjects([collateralCoin, leftDebtCoin], to_liquidate_address);

//Submit the Tx
const result = await SignAndSubmitTXB(txb, account.client, account.keypair);
console.log('Success: ', result.confirmedLocalExecution);

//Get the object of the coin, if there are several coins, merge them
async function getCoinObj(account: AccountManager, realCoin: CoinInfo) {

    let getCoinInfo = await account.getCoins(
        realCoin.address
    );
    let allBalance = await account.client.getBalance({ owner: account.address, coinType: realCoin.address });

    if (getCoinInfo.data.length >= 2) {
        const txb = new Transaction();
        txb.setSender(account.address);
        let baseObj = getCoinInfo.data[0].coinObjectId;
        let i = 1;
        while (i < getCoinInfo.data.length) {
            txb.mergeCoins(baseObj, [getCoinInfo.data[i].coinObjectId]);
            i++;
        }
        SignAndSubmitTXB(txb, account.client, account.keypair);
    }

    let mergedCoin = getCoinInfo.data[0].coinObjectId;
    let { totalBalance } = allBalance;
    return [mergedCoin, totalBalance];
}