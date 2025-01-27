import { getAvailableRewards, claimAllRewardsPTB, getPoolApy } from "../src/libs/PTB/V3";
import * as V from "../src/libs/PTB";
import * as fs from 'fs';
import { describe, it, expect } from 'vitest';
import { NAVISDKClient } from '../src/index';
import { Transaction } from "@mysten/sui/transactions";
import dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui/client';

dotenv.config();

const rpcUrl = process.env.RPC || '';
const mnemonic = process.env.MNEMONIC || '';

export async function dryRunTXB(txb: Transaction, client: SuiClient) {
    const dryRunTxBytes: Uint8Array = await txb.build({
        client: client
    });
    const dryRunResult = await client.dryRunTransactionBlock({ transactionBlock: dryRunTxBytes });
    return dryRunResult;
}

const logToFile = (data: any, filePath: string) => {
            
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Output written to ${filePath}`);
  };

describe('NAVI SDK V3 test', async () => {
    const client = new NAVISDKClient({ networkType: rpcUrl, mnemonic: mnemonic });
    const account = client.accounts[0];

    it.skip('should success getAvailableRewards V3 ', async () => {
        const txRes = await getAvailableRewards(account.client, account.address);
        // console.log(JSON.stringify(txRes, null, 2))
    }, 50000);

    it.skip('should success getAvailableRewards V3 for user', async () => {
        const txRes = await getAvailableRewards(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914');
        // console.log(JSON.stringify(txRes, null, 2))
    }, 50000);
    it('should success getAvailableRewards all ', async () => {
        const txRes = await V.getAvailableRewards(account.client, account.address);
        // console.log(JSON.stringify(txRes, null, 2))
    }, 50000);
    it('should success getAvailableRewards all for user', async () => {
        const txRes = await V.getAvailableRewards(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914');
        // console.log(JSON.stringify(txRes, null, 2))
    }, 50000);

    it.skip('should success get V3 rewards', async () => {
        let txb = new Transaction();
        txb.setSender(account.address);
        txb.setGasBudget(300_000_000);
        // await claimAllRewardsPTB(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914', txb);
        await claimAllRewardsPTB(account.client, account.address, txb);

        // const txRes = await SignAndSubmitTXB(txb, account.client, account.keypair);
        const txRes = await dryRunTXB(txb, account.client);
        // logToFile(txRes, './output.log');
        expect(txRes.effects.status.status).toEqual("success");
        if (txRes.effects.status.status === "failure") {
            throw new Error(txRes.effects.status.error)
        }
    }, 50000);

    it.skip('should success get V3 rewards by ueser', async () => {
        let txb = new Transaction();
        txb.setSender(account.address);
        txb.setGasBudget(300_000_000);
        await claimAllRewardsPTB(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914', txb);

        // const txRes = await SignAndSubmitTXB(txb, account.client, account.keypair);
        const txRes = await dryRunTXB(txb, account.client);
        // logToFile(txRes, './output.log');
        expect(txRes.effects.status.status).toEqual("success");
        if (txRes.effects.status.status === "failure") {
            throw new Error(txRes.effects.status.error)
        }
    }, 50000);

    it.skip('should success cal apy V3', async () => {
        // const poolInfo = await getPoolsInfo()
        const poolInfo = [
            {
            "borrowCapCeiling": "900000000000000000000000000",
            "coinType": "b954dfc209b5536828fdc82dd451029d13c7b591dcbba38a5079ca912becaa5f::SUI_TEST::SUI_TEST",
            "totalSupplyAmount": "42387921824030657",
            "minimumAmount": "7500000",
            "leftSupply": "32612078.17596934",
            "validBorrowAmount": "38149129641627591.3",
            "borrowedAmount": "26607190839659689",
            "leftBorrowAmount": "38149129615020400.3",
            "availableBorrow": "11541938801967902.3",
            "oracle": {
            "decimal": 9,
            "value": "4371533100",
            "price": "4.3715331",
            "oracleId": 0,
            "valid": true
            },
            },
            {
            "borrowCapCeiling": "900000000000000000000000000",
            "coinType": "a3c8f6988cf4694e5b032f82934a6ec5e848a6cb3af302a12b23521a49d27f95::USDC_TEST::USDC_TEST",
            "totalSupplyAmount": "4982143121335951",
            "minimumAmount": "3000000",
            "leftSupply": "25017856.878664049",
            "validBorrowAmount": "4483928809202355.9",
            "borrowedAmount": "3895223301183381",
            "leftBorrowAmount": "4483928805307132.9",
            "availableBorrow": "588705508018974.9",
            "oracle": {
            "decimal": 6,
            "value": "1000000",
            "price": "1",
            "oracleId": 1,
            "valid": true
            },
            },
            ];
        const txRes = await getPoolApy(account.client, poolInfo);
        console.log(JSON.stringify(txRes, null, 2))
    }, 50000);

});
