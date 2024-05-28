"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const navi_sdk_1 = require("navi-sdk");
const transactions_1 = require("@mysten/sui.js/transactions");
const PTB_1 = require("navi-sdk/dist/libs/PTB");
const dotenv_1 = __importDefault(require("dotenv"));
const address_1 = require("navi-sdk/dist/address");
dotenv_1.default.config();
const accountKey = process.env.mnemonic;
const client = new navi_sdk_1.NAVISDKClient({ mnemonic: accountKey });
const account = client.accounts[0];
const sender = account.address;
console.log(`use address: `, account.address);
const to_pay_coin = address_1.USDT;
const to_liquidate_address = '0x111';
const collectral_coin = address_1.Sui;
console.log(`\n\nTo Liquidate address: `, to_liquidate_address);
let [coinObj, to_liquidate_amount] = await getCoinObj(account, to_pay_coin);
//Initialize the TransactionBlock
let txb = new transactions_1.TransactionBlock();
txb.setSender(sender);
//Add the liquidation function to the ptb
const [collateralBalance, remainDebtBalance] = await (0, PTB_1.liquidateFunction)(txb, to_pay_coin, txb.object(coinObj), collectral_coin, to_liquidate_address, to_liquidate_amount);
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
const result = await (0, PTB_1.SignAndSubmitTXB)(txb, account.client, account.keypair);
console.log('Success: ', result.confirmedLocalExecution);
//Get the object of the coin, if there are several coins, merge them
function getCoinObj(account, realCoin) {
    return __awaiter(this, void 0, void 0, function* () {
        let getCoinInfo = yield account.getCoins(realCoin.address);
        let allBalance = yield account.client.getBalance({ owner: account.address, coinType: realCoin.address });
        if (getCoinInfo.data.length >= 2) {
            const txb = new transactions_1.TransactionBlock();
            txb.setSender(account.address);
            let baseObj = getCoinInfo.data[0].coinObjectId;
            let i = 1;
            while (i < getCoinInfo.data.length) {
                txb.mergeCoins(baseObj, [getCoinInfo.data[i].coinObjectId]);
                i++;
            }
            (0, PTB_1.SignAndSubmitTXB)(txb, account.client, account.keypair);
        }
        let mergedCoin = getCoinInfo.data[0].coinObjectId;
        let { totalBalance } = allBalance;
        return [mergedCoin, totalBalance];
    });
}
