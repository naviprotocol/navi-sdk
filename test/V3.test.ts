import {
    getAvailableRewards,
    claimAllRewardsPTB,
    getPoolApy,
  } from "../src/libs/PTB/V3";
  import * as V from "../src/libs/PTB";
  import { getConfig, PriceFeedConfig, pool } from "../src/address";
  import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
  import * as fs from "fs";
  import { describe, it, expect } from "vitest";
  import { NAVISDKClient } from "../src/index";
  import { Transaction } from "@mysten/sui/transactions";
  import dotenv from "dotenv";
  import { SuiClient } from "@mysten/sui/client";
  
  dotenv.config();
  
  const rpcUrl = process.env.RPC || "";
  const mnemonic = process.env.MNEMONIC || "";
  
  export async function dryRunTXB(txb: Transaction, client: SuiClient) {
    const dryRunTxBytes: Uint8Array = await txb.build({
      client: client,
    });
    const dryRunResult = await client.dryRunTransactionBlock({
      transactionBlock: dryRunTxBytes,
    });
    return dryRunResult;
  }
  
  const logToFile = (data: any, filePath: string) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Output written to ${filePath}`);
  };
  
  describe("NAVI SDK V3 test", async () => {
    const client = new NAVISDKClient({ networkType: rpcUrl, mnemonic: mnemonic });
    const account = client.accounts[0];
    it.skip('should success deposit Sui to NAVI protocol', async () => {
      let txb = new Transaction();
      txb.setSender(account.address);
      txb.setGasBudget(300_000_000);
      const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
      const suiObj = '0x2f29d3d4777d22f1f349c5364825c558a16f48d6cf8a221747eb9ef8357bc747'

      const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
      await V.depositCoin(txb, poolConfig, toDeposit , txb.pure.u64(1e9));

      // const result = await account.client.devInspectTransactionBlock({
      //     transactionBlock: txb,
      //     sender: account.address,
      // })
      const txRes = await V.SignAndSubmitTXB(txb, account.client, account.keypair);
      console.log(txRes)
      expect(txRes.effects.status.status).toEqual("success");
      if (txRes.effects.status.status === "failure") {
          throw new Error(txRes.effects.status.error)
      }
      expect(txRes.effects.status.status).toEqual("success");

  }, 500000);
  it.skip('should success deposit hsui to NAVI protocol', async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    const poolConfig: PoolConfig = pool["haSui" as keyof Pool];
    const hsuiObj = '0xc13c5f026b7b78aa17da377d39c6f749d9625bdf87a3a3aa5b53d65edadf37b0'

    // const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
    await V.depositCoin(txb, poolConfig, txb.object(hsuiObj) , txb.pure.u64(1e9));


    const txRes = await V.SignAndSubmitTXB(txb, account.client, account.keypair);
    console.log(txRes)
    expect(txRes.effects.status.status).toEqual("success");
    if (txRes.effects.status.status === "failure") {
        throw new Error(txRes.effects.status.error)
    }

}, 500000);
    it.skip("should success getAvailableRewards V3 ", async () => {
      const txRes = await getAvailableRewards(account.client, account.address);
      console.log(JSON.stringify(txRes, null, 2));
    }, 50000);
  
    it.skip("should success getAvailableRewards V3 for user", async () => {
      const txRes = await getAvailableRewards(
        account.client,
        // "0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914"
        "0xc8f5684afe4db0886a74563975c1fedad8225bb1c28211da96e10017237892cc"
      );
      // console.log(JSON.stringify(txRes, null, 2));
      console.log(txRes);
    }, 50000);
    it.skip("should success getAvailableRewards all ", async () => {
      const txRes = await V.getAvailableRewards(account.client, account.address);
      // console.log(JSON.stringify(txRes, null, 2))
    }, 50000);
    it.skip("should success getAvailableRewards all for user", async () => {
      const txRes = await V.getAvailableRewards(
        account.client,
        "0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914"
      );
      // console.log(JSON.stringify(txRes, null, 2))
    }, 50000);
  
    it.skip("should success get V3 rewards", async () => {
      let txb = new Transaction();
      txb.setSender(account.address);
      txb.setGasBudget(300_000_000);
      // await claimAllRewardsPTB(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914', txb);
      await claimAllRewardsPTB(account.client, account.address, txb);
  
      const txRes = await V.SignAndSubmitTXB(txb, account.client, account.keypair);
      // const txRes = await dryRunTXB(txb, account.client);
      // logToFile(txRes, './output.log');
      expect(txRes.effects.status.status).toEqual("success");
      if (txRes.effects.status.status === "failure") {
        throw new Error(txRes.effects.status.error);
      }
    }, 50000);
    it.skip("should success get V2/V3 rewards", async () => {
      let txb = new Transaction();
      txb.setSender(account.address);
      txb.setGasBudget(300_000_000);
      // await claimAllRewardsPTB(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914', txb);
      await V.claimAllRewardsPTB(account.client, account.address, txb);
  
      const txRes = await V.SignAndSubmitTXB(txb, account.client, account.keypair);
      // const txRes = await dryRunTXB(txb, account.client);
      // logToFile(txRes, './output.log');
      expect(txRes.effects.status.status).toEqual("success");
      if (txRes.effects.status.status === "failure") {
        throw new Error(txRes.effects.status.error);
      }
    }, 50000);
  
    it.skip("should success get V3 rewards by ueser", async () => {
      let txb = new Transaction();
      txb.setSender(account.address);
      txb.setGasBudget(300_000_000);
      await claimAllRewardsPTB(
        account.client,
        "0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914",
        txb
      );
  
      const txRes = await V.SignAndSubmitTXB(txb, account.client, account.keypair);
      // const txRes = await dryRunTXB(txb, account.client);
      // logToFile(txRes, './output3.log');
      expect(txRes.effects.status.status).toEqual("success");
      if (txRes.effects.status.status === "failure") {
        throw new Error(txRes.effects.status.error);
      }
    }, 50000);
  
    it("should success cal apy V3", async () => {

      const txRes = await getPoolApy(account.client);
      console.log(JSON.stringify(txRes, null, 2));
    }, 50000);
  });
  