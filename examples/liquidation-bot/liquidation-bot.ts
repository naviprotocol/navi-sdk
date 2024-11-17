import { NAVISDKClient } from "navi-sdk";
import { depositCoin, withdrawCoin, borrowCoin, flashloan, repayFlashLoan, SignAndSubmitTXB, liquidateFunction } from 'navi-sdk/dist/libs/PTB'
import dotenv from 'dotenv';
import { Transaction } from "@mysten/sui/transactions";
import { CETUS, pool, Sui, wUSDC, USDT, vSui } from 'navi-sdk/dist/address';
import { PoolConfig, Pool, CoinInfo } from 'navi-sdk/dist/types';
import { AccountManager } from "navi-sdk/dist/libs/AccountManager"


dotenv.config();

const accountMnemonic = process.env.mnemonic;
const client = new NAVISDKClient({ mnemonic: accountMnemonic });
const account = client.accounts[0];
const sender = account.address;

//Set UP Zone
const to_pay_coin: CoinInfo = wUSDC;
const to_liquidate_address = '0xcaa4af4b06b6eed841bbd254cb19a3fcd64e3e902fe2bcbd4e02f6f9711e0c43';
const collectral_coin: CoinInfo = Sui;
//End of Set UP Zone
const txb = new Transaction();
let [coinObj, to_liquidate_amount] = await getCoinObj(txb,account, to_pay_coin);


async function monitorAndExecute(txb: any, account: any, to_liquidator_address: string): Promise<void> {
    const healthFactorStartThreshold = 1.003;
    const healthFactorStopThreshold = 1.02;
    const monitorInterval = 20000; // Interval for monitoring in milliseconds (10 seconds)
    let executionInterval = 100; // Interval for execution attempts in milliseconds (0.1 seconds)
    let attemptCount = 0; // Track the number of attempts

    // Function to get the current health factor
    const getCurrentHealthFactor = async (): Promise<number> => {
        return account.getHealthFactor(to_liquidator_address)
            .then((result: number) => {
                console.log('Current HF: ', result);
                return result;
            }).catch((error: any) => {
                console.error('Error fetching health factor:', error);
                throw error; // Propagate the error
            });
    };

    // Function to execute the operation
    const executeOperation = async () => {
        attemptCount++; // Increment attempt count
        console.log(`Attempt ${attemptCount}...`);

        try {
            const result = await account.liquidate(to_pay_coin, to_liquidate_address, collectral_coin, to_liquidate_amount)
            console.log('Success:', result);
            return 'success'; // Operation succeeded
        } catch (error) {
            return 'retry'; // Operation failed, but will retry
        }
    };

    return new Promise((resolve, reject) => {
        const monitorOrExecute = async () => {
            try {
                const healthFactor = await getCurrentHealthFactor();

                if (healthFactor > healthFactorStopThreshold) {
                    console.log(`Health Factor exceeds stop threshold (${healthFactorStopThreshold}). Stopping.`);
                    resolve(); // Stop the script
                    return;
                }

                if (healthFactor <= healthFactorStartThreshold) {
                    const result = await executeOperation();

                    if (result === 'success') {
                        console.log('Operation successful.');
                        resolve(); // Operation succeeded, stop script
                        return;
                    } else if (result === 'retry') {
                        setTimeout(monitorOrExecute, executionInterval); // Retry execution
                        return;
                    }
                } else {
                    console.log(`Health Factor is above the start threshold (${healthFactorStartThreshold}). Monitoring.`);
                    attemptCount = 0; // Reset attempt count when not in execution phase
                    setTimeout(monitorOrExecute, monitorInterval); // Go back to monitoring
                }
            } catch (error) {
                reject(error); // Handle errors
            }
        };

        monitorOrExecute(); // Start the process
    });
}

export async function getCoinObj(txb: Transaction,account: AccountManager, realCoin: CoinInfo) {

    let getCoinInfo = await account.getCoins(
        realCoin.address
    );
    let allBalance = await account.client.getBalance({owner: account.address, coinType: realCoin.address});
    
    if (getCoinInfo.data.length >= 2) {
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

monitorAndExecute(txb, account, to_liquidate_address).then(() => {
    console.log('Operation completed or stopped due to health factor.');
}).catch(error => {
    console.error('Operation encountered an error:', error);
});
