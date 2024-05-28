"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const navi_sdk_1 = require("navi-sdk");
const transactions_1 = require("@mysten/sui.js/transactions");
const PTB_1 = require("navi-sdk/dist/libs/PTB");
const address_1 = require("navi-sdk/dist/address");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mnemonic = process.env.mnemonic;
const client = new navi_sdk_1.NAVISDKClient({ mnemonic: mnemonic, networkType: "mainnet", numberOfAccounts: 1 });
//Set Up Zone
const toBorrowCoin = address_1.USDC;
const amountToBorrow = 1 * Math.pow(10, toBorrowCoin.decimal); //Borrow 1 USDC
//End of Set Up Zone
//For the following code, you can directly copy and paste it to your project
// Initialize the TransactionBlock
let txb = new transactions_1.TransactionBlock();
const account = client.accounts[0];
let sender = account.address;
console.log(sender);
txb.setSender(sender);
//Get the object of the coin
const sourceTokenObjAddress = await account.getCoins(toBorrowCoin);
const sourceTokenObj = txb.object(sourceTokenObjAddress.data[0].coinObjectId);
// Supported: Sui/NAVX/vSui/USDC/USDT/WETH/CETUS/HAsui, import from address file
const loanPoolConfig = address_1.pool[toBorrowCoin.symbol];
const [balance, receipt] = await (0, PTB_1.flashloan)(txb, loanPoolConfig, amountToBorrow); // Flashloan 1 USDC
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
const [leftBalance] = await (0, PTB_1.repayFlashLoan)(txb, loanPoolConfig, receipt, repayBalance); // left balance after repaying with the balance
//Extra token after repay
const extraCoin = txb.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [leftBalance],
    typeArguments: [loanPoolConfig.type],
});
//Transfer extraCoin after repay to the account
txb.transferObjects([extraCoin], sender);
const result = (0, PTB_1.SignAndSubmitTXB)(txb, account.client, account.keypair);
console.log("result: ", result);
