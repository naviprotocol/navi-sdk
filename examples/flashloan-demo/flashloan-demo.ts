import { NAVISDKClient } from 'navi-sdk'
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { depositCoin, withdrawCoin, borrowCoin, flashloan, repayFlashLoan, SignAndSubmitTXB, mergeCoins } from 'navi-sdk/dist/libs/PTB'
import { CoinInfo, Pool, PoolConfig } from "navi-sdk/dist/types";
import { pool, USDC } from 'navi-sdk/dist/address';
import dotenv from 'dotenv';
dotenv.config();

const mnemonic = process.env.mnemonic;
const client = new NAVISDKClient({ mnemonic: mnemonic, networkType: "mainnet", numberOfAccounts: 1 });

//Set Up Zone
const toBorrowCoin: CoinInfo = USDC;
const amountToBorrow = 1 * 10 ** toBorrowCoin.decimal; //Borrow 1 USDC
//End of Set Up Zone

//For the following code, you can directly copy and paste it to your project
// Initialize the TransactionBlock
let txb = new TransactionBlock();
const account = client.accounts[0];
let sender = account.address;
console.log(sender)
txb.setSender(sender);

//Get the object of the coin
const sourceTokenObjAddress = await account.getCoins(toBorrowCoin);
const sourceTokenObj = txb.object(sourceTokenObjAddress.data[0].coinObjectId);

// Supported: Sui/NAVX/vSui/USDC/USDT/WETH/CETUS/HAsui, import from address file
const loanPoolConfig: PoolConfig = pool[toBorrowCoin.symbol as keyof Pool];
const [balance, receipt] = await flashloan(txb, loanPoolConfig, amountToBorrow); // Flashloan 1 USDC

//Transfer the flashloan money to the account
const flashCoin = txb.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balance],
    typeArguments: [loanPoolConfig.type],
});

//Merge Coin to the wallet balance
txb.mergeCoins(sourceTokenObj, [flashCoin]);

//Get the repayment object
const repayBalance = txb.moveCall({
    target: '0x2::coin::into_balance',
    arguments: [sourceTokenObj],
    typeArguments: [loanPoolConfig.type],
});

const [leftBalance] = await repayFlashLoan(txb, loanPoolConfig, receipt, repayBalance); // left balance after repaying with the balance

//Extra token after repay
const extraCoin = txb.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [leftBalance],
    typeArguments: [loanPoolConfig.type],
});

//Transfer extraCoin after repay to the account
txb.transferObjects([extraCoin], sender);
const result = SignAndSubmitTXB(txb, account.client, account.keypair);
console.log("result: ", result);
