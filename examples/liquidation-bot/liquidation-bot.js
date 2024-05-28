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
exports.getCoinObj = void 0;
const navi_sdk_1 = require("navi-sdk");
const transactions_1 = require("@mysten/sui.js/transactions");
const PTB_1 = require("navi-sdk/dist/libs/PTB");
const dotenv_1 = __importDefault(require("dotenv"));
const address_1 = require("navi-sdk/dist/address");
const getCoinobj_1 = require("./getCoinobj");
dotenv_1.default.config();
const accountMnemonic = process.env.mnemonic;
const client = new navi_sdk_1.NAVISDKClient({ mnemonic: accountMnemonic });
const account = client.accounts[0];
const sender = account.address;
//Set UP Zone
const to_pay_coin = address_1.USDC;
const to_liquidate_address = '0xcaa4af4b06b6eed841bbd254cb19a3fcd64e3e902fe2bcbd4e02f6f9711e0c43';
const collectral_coin = address_1.Sui;
//End of Set UP Zone
let [coinObj, to_liquidate_amount] = await (0, getCoinobj_1.getCoinObj)(account, to_pay_coin);
function monitorAndExecute(txb, account, to_liquidator_address) {
    return __awaiter(this, void 0, void 0, function* () {
        const healthFactorStartThreshold = 1.003;
        const healthFactorStopThreshold = 1.02;
        const monitorInterval = 20000; // Interval for monitoring in milliseconds (10 seconds)
        let executionInterval = 100; // Interval for execution attempts in milliseconds (0.1 seconds)
        let attemptCount = 0; // Track the number of attempts
        // Function to get the current health factor
        const getCurrentHealthFactor = () => __awaiter(this, void 0, void 0, function* () {
            return account.getHealthFactor(to_liquidator_address)
                .then((result) => {
                console.log('Current HF: ', result);
                return result;
            }).catch((error) => {
                console.error('Error fetching health factor:', error);
                throw error; // Propagate the error
            });
        });
        // Function to execute the operation
        const executeOperation = () => __awaiter(this, void 0, void 0, function* () {
            attemptCount++; // Increment attempt count
            console.log(`Attempt ${attemptCount}...`);
            try {
                const result = yield account.liquidate(to_pay_coin, to_liquidate_address, collectral_coin, to_liquidate_amount);
                console.log('Success:', result);
                return 'success'; // Operation succeeded
            }
            catch (error) {
                return 'retry'; // Operation failed, but will retry
            }
        });
        return new Promise((resolve, reject) => {
            const monitorOrExecute = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const healthFactor = yield getCurrentHealthFactor();
                    if (healthFactor > healthFactorStopThreshold) {
                        console.log(`Health Factor exceeds stop threshold (${healthFactorStopThreshold}). Stopping.`);
                        resolve(); // Stop the script
                        return;
                    }
                    if (healthFactor <= healthFactorStartThreshold) {
                        const result = yield executeOperation();
                        if (result === 'success') {
                            console.log('Operation successful.');
                            resolve(); // Operation succeeded, stop script
                            return;
                        }
                        else if (result === 'retry') {
                            setTimeout(monitorOrExecute, executionInterval); // Retry execution
                            return;
                        }
                    }
                    else {
                        console.log(`Health Factor is above the start threshold (${healthFactorStartThreshold}). Monitoring.`);
                        attemptCount = 0; // Reset attempt count when not in execution phase
                        setTimeout(monitorOrExecute, monitorInterval); // Go back to monitoring
                    }
                }
                catch (error) {
                    reject(error); // Handle errors
                }
            });
            monitorOrExecute(); // Start the process
        });
    });
}
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
exports.getCoinObj = getCoinObj;
monitorAndExecute(txb, account, to_liquidate_address).then(() => {
    console.log('Operation completed or stopped due to health factor.');
}).catch(error => {
    console.error('Operation encountered an error:', error);
});
