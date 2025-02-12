import {
  getAvailableRewardsWithoutOption,
  getAvailableRewards,
  claimAllRewardsPTB,
  getPoolApy,
  claimAllRewardsResupplyPTB,
  getBorrowFee
} from "../src/libs/PTB/V3";
import * as V from "../src/libs/PTB";
import {getReserveData,getIncentiveAPY} from "../src/libs/CallFunctions";
import { getConfig, PriceFeedConfig, pool } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import * as fs from "fs";
import { describe, it, expect } from "vitest";
import { NAVISDKClient } from "../src/index";
import { Transaction } from "@mysten/sui/transactions";
import dotenv from "dotenv";
import { SuiClient } from "@mysten/sui/client";

dotenv.config();

const rpcUrl = "";
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
  it.skip("should success deposit Sui to NAVI protocol", async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const suiObj =
      "0x2f29d3d4777d22f1f349c5364825c558a16f48d6cf8a221747eb9ef8357bc747";

    const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
    await V.depositCoin(txb, poolConfig, toDeposit, txb.pure.u64(1e9));

    // const result = await account.client.devInspectTransactionBlock({
    //     transactionBlock: txb,
    //     sender: account.address,
    // })
    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
    console.log(txRes);
    expect(txRes.effects.status.status).toEqual("success");
    if (txRes.effects.status.status === "failure") {
      throw new Error(txRes.effects.status.error);
    }
    expect(txRes.effects.status.status).toEqual("success");
  }, 500000);
  it.skip("should success deposit haSui to NAVI protocol", async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    const poolConfig: PoolConfig = pool["haSui" as keyof Pool];
    const hasuiObj =
      txb.object("0xc13c5f026b7b78aa17da377d39c6f749d9625bdf87a3a3aa5b53d65edadf37b0");

    // const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
    await V.depositCoin(txb, poolConfig, hasuiObj, txb.pure.u64(1e8));

    // const result = await account.client.devInspectTransactionBlock({
    //     transactionBlock: txb,
    //     sender: account.address,
    // })
    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
    console.log(txRes);
    expect(txRes.effects.status.status).toEqual("success");
    if (txRes.effects.status.status === "failure") {
      throw new Error(txRes.effects.status.error);
    }
    expect(txRes.effects.status.status).toEqual("success");
  }, 500000);
  it.skip("should get correct return all accounts' Navi Portfolio", async () => {
    const res = await client.getAllNaviPortfolios();
    // const haSui: any = res.get('HaedalSui');

    console.log(res);
  }, 500000);
  it.skip("should success borrow Sui from NAVI protocol", async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    // const [toDeposit] = txb.splitCoins(txb.gas, [1000e6]);
    // await depositCoin(txb, poolConfig, toDeposit, 1e9);
    // await V.updateOraclePTB(account.client, txb);
    const [borrowCoind] = await V.borrowCoin(txb, poolConfig, 14e6);
    // borrowCoind
    txb.transferObjects([borrowCoind as any], account.address);
    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );

    // const txRes = await dryRunTXB(txb, account.client);
    // logToFile(txRes, './bbboutput.log');
    console.log(txRes);
    expect(txRes.effects.status.status).toEqual("success");
    if (txRes.effects.status.status === "failure") {
      throw new Error(txRes.effects.status.error);
    }
  }, 50000);
  it.skip("should success deposit hsui to NAVI protocol", async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    const poolConfig: PoolConfig = pool["haSui" as keyof Pool];
    const hsuiObj =
      "0xc13c5f026b7b78aa17da377d39c6f749d9625bdf87a3a3aa5b53d65edadf37b0";

    // const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
    await V.depositCoin(
      txb,
      poolConfig,
      txb.object(hsuiObj),
      txb.pure.u64(1e9)
    );

    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
    console.log(txRes);
    expect(txRes.effects.status.status).toEqual("success");
    if (txRes.effects.status.status === "failure") {
      throw new Error(txRes.effects.status.error);
    }
  }, 500000);
  it.skip("should success getAvailableRewardsWithoutOption V3 ", async () => {
    const txRes = await getAvailableRewardsWithoutOption(account.client, account.address);
    // console.log(JSON.stringify(txRes, null, 2));
  }, 50000);
  it.skip("should success getAvailableRewards V3 ", async () => {
    const txRes = await getAvailableRewards(account.client, account.address);
    // console.log(JSON.stringify(txRes, null, 2));
  }, 50000);

  it.skip("should success getAvailableRewardsWithoutOption V3 for user", async () => {
    const txRes = await getAvailableRewardsWithoutOption(
      account.client,
      // "0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914"
      "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c"
    );
    // console.log(JSON.stringify(txRes, null, 2));
    console.log(txRes);
  }, 50000);
  it.skip("should success getAvailableRewards all ", async () => {
    const txRes = await V.getAvailableRewards(account.client, account.address, [3,1]);
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);
  it.skip("should success getAvailableRewards all for user", async () => {
    const txRes = await V.getAvailableRewards(
      account.client,
      "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c",
      [3,1]
    );
    console.log(JSON.stringify(txRes, null, 2));
  }, 50000);

  it.skip("should success get V3 rewards", async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    // await claimAllRewardsPTB(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914', txb);
    await claimAllRewardsPTB(account.client, account.address, txb);

    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
    // const txRes = await dryRunTXB(txb, account.client);
    // logToFile(txRes, './output.log');
    expect(txRes.effects.status.status).toEqual("success");
    if (txRes.effects.status.status === "failure") {
      throw new Error(txRes.effects.status.error);
    }
  }, 50000);
  it.skip("should success claimAllRewardsResupplyPTB V3 rewards", async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    // await claimAllRewardsPTB(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914', txb);
    await claimAllRewardsResupplyPTB(account.client, account.address, txb);

    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
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

    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
    // const txRes = await dryRunTXB(txb, account.client);
    // logToFile(txRes, './output.log');
    expect(txRes.effects.status.status).toEqual("success");
    if (txRes.effects.status.status === "failure") {
      throw new Error(txRes.effects.status.error);
    }
  }, 50000);
  it.skip("should success get V2/V3 claimAllRewardsResupplyPTB", async () => {
    let txb = new Transaction();
    txb.setSender(account.address);
    txb.setGasBudget(300_000_000);
    // await claimAllRewardsPTB(account.client, '0xf89bf436d166578e84fcd4e726ae206ff24851f1647b0a264114180cc2591914', txb);
    await V.claimAllRewardsResupplyPTB(account.client, account.address, txb);

    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
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

    const txRes = await V.SignAndSubmitTXB(
      txb,
      account.client,
      account.keypair
    );
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
  it.skip("should success get v3 borrow fee", async () => {
    const txRes = await getBorrowFee(account.client);
    console.log(JSON.stringify(txRes, null, 2));
  }, 50000);
  it.skip("query ReserveParentId", async () => {
    const rawData: any = await account.client.getDynamicFields({
      parentId:
        "0x5db4063954356f37ebdc791ec30f4cfd39734feff18820ee44dc2d2de96db899",
    });
    console.log(JSON.stringify(rawData, null, 2));
  }, 50000);
  it.skip("query ReserveParentId", async () => {
    const rawData: any = await account.client.getObject({
      id: '0x5db4063954356f37ebdc791ec30f4cfd39734feff18820ee44dc2d2de96db899',
      options: {
        showContent: true,
      },
    });
    console.log(JSON.stringify(rawData.data.content.fields.borrow_fee_rate, null, 2));
  }, 50000);
  it.skip("query oracle", async () => {
    const rawData: any = await account.client.getDynamicFields({
      parentId:
        "0x05537e42f0b1e5f79167103fae36addc5d48d250d253aa98a1988595702eb5e1",
    });
    console.log(JSON.stringify(rawData, null, 2));
  }, 50000);
  it.skip("query", async () => {
    interface AssetData {
      name: string;
      assetId: number;
      type: string;
      reserveObjectId: string;
      borrowBalanceParentId: string;
      supplyBalanceParentId: string;
    }

    function extractAssetData(data: any): AssetData {
      const type = data.content.fields.value.fields.coin_type;
      const name = type.split("::").pop() || "Unknown";
      return {
        name: name, // 可以根据 coin_type 解析出更具体的名称
        assetId: data.content.fields.value.fields.id,
        type: data.content.fields.value.fields.coin_type,
        reserveObjectId: data.objectId,
        borrowBalanceParentId:
          data.content.fields.value.fields.borrow_balance.fields.user_state
            .fields.id.id,
        supplyBalanceParentId:
          data.content.fields.value.fields.supply_balance.fields.user_state
            .fields.id.id,
      };
    }
    let res = [];
    const arr = [
      "0x06b658f63902ffe866787d5dfa8b5335d57a26b186cbdb60aeddeea75e1701a3",
      "0x09072667183f8f634f75656fd7b065e3f96d14bcdc5d95eaed3303974baa0ec1",
      "0x0b9180b5ce4654a31a58bdbdba4df5f4e6c44db606a665f33732177577b3feba",
      "0x19218b90c7a219497fa4050eaf94c5e76a911b059b97f99466a38db9ec625e5b",
      "0x239b1026413181a1e78b8b187bc9954e8f488f0d62c33246bd4bfb3af3382341",
      "0x278cec0691f79d7ba7a4dfef5490d9419eb4e7a48d6cab88d9fa187952ee5462",
      "0x3321b80228ac92e9f6d3c58be1a859053f513bbfb340d4527f1cc0000bd68c42",
      "0x44dbd23ca122eda5bb982371ffb5deb24daf31e42befa66bedc111f626d8de37",
      "0x4ae60e09f6b326b2c29054f1381a74e6cb7688220a1dad5cead3b2ab3decf029",
      "0x4d712e2acea9339b4613a31501fafd03cb2987285da25e8254c731d29c8f11e8",
      "0x5bb709497addd45ad3c56e03feebaac002d854b3037243dcf7927018a0b797d4",
      "0x5e89d2f1efeceed394e5feca32ccb873afa3ac494124d3d5247e706c12214870",
      "0x5ed96cb34c2005f6be120bac670760f673062236d5215c05569a003d73b50e2e",
      "0x61ab088159c9ac868e5292869190b72185ab7ea28839f74184b81d0546c66fa5",
      "0x61da4ef8555558997b4428a34d8ba1bc9335041f4c3cfc3260e8523e5859fdb0",
      "0x85023c9a57a95c5c08d37e275e8be6b40f12a2eb09bfb4cc258f3576523b4d4f",
      "0x95e25ef72ab7b1613dcbbb0aa2554cb7ae9f9048aa09a99b96d3ccaf1213a0d3",
      "0xaa7f15b7f2bfce2d6d50dfbe16ab712c6d855e60e406098f6e34ee4a5de5bc2f",
      "0xadceed70c7c83a390e200854ef399a9cf895c9e09843e053db21308079eb2ff4",
      "0xb15d067c42280307ddeeb14cdfb6263febea7947d743544cef7224b9af3e73b9",
      "0xbf20842ec67af28c3cf30e65a95890b0b78057b14e1297d8c4aa2c7453639555",
      "0xcffbf7ce9a1766b9cd109bd42b14e364c078c07f43c2bbae47ecd7dc9bca2d46",
      "0xd2e0865bb361e21109ace6569625804c988b7a7865b57ef3dba25f445dbb1b5a",
      "0xd81096867c2177b61134df549a282c80f207380f581a52bf7b0789a4d984f6cf",
      "0xe1fdcbad49a6c094c9434a77b0ea8d3cc68dd9966926aa6fcd7251c16f7e5897",
    ];
    for (let index = 0; index < arr.length; index++) {
      const element = arr[index];
      const rawData: any = await account.client.getObject({
        id: element,
        options: {
          showContent: true,
        },
      });
      const assetData = extractAssetData(rawData.data);
      res.push(assetData);
    }

    console.log(JSON.stringify(res, null, 2));
  }, 50000);

  it.skip("query ProFundsPoolInfo", async () => {
    interface AssetData {
      name: string;
      coinType: string;
      oracle_id: number;
    }

    function extractAssetData(data: any): AssetData {
      return {
        name: data.content.fields.name,
        coinType: data.content.fields.value.fields.coin_type.fields.name,
        oracle_id: data.content.fields.value.fields.oracle_id,
      };
    }
    let res = [];
    const arr = [
      "0x17d6a9ab405fe3a887e842f1bf714b1a5ae55ed40f47e64e12bc9158cc2cea0b",
      "0x17f096cdb52f13db049704195d51c7f40c33001822ac47df7942a4597cba9a5e",
      "0x461be4c45138c34aae0a66a51d8647fbe70314f1ac645dec94eba707af3f22ce",
      "0xb43b1eb3bd9ac90acf1f1429e6b828fb32dd27fb5046f86809e75978548387bc",
      "0xc3c8ff1b0af3d83bdbc7da642b3844eba7f8523b9794a1dc1fdcf91ebd83c527",
      "0xc9be79a7c4db59c9d5e71e59cfcb68058f4649186ad56c829f83d545da08cb45",
      "0xd24a90c53f8f903d653c384cc7ac0593627d4199bb839e3e502cbb77be6ccfb1",
    ];

    for (let index = 0; index < arr.length; index++) {
      const element = arr[index];
      const rawData: any = await account.client.getObject({
        id: element,
        options: {
          showContent: true,
        },
      });
      const assetData = extractAssetData(rawData.data);
      res.push(assetData);
    }
    //   const rawData: any = await account.client.getObject({
    //     id: '0x6bbebf47ec7f0cd70aa42780d0e110a06c6b410a9567e8790f3a1295408dd459',
    //     options: {
    //         showContent: true
    //     }
    // })
    console.log(JSON.stringify(res, null, 2));
  }, 50000);

  it.skip("query getReserveData", async () => {
    const rawData: any = await getReserveData(account.address,account.client)
    console.log(JSON.stringify(rawData, null, 2));
  }, 50000);
  it.skip("query getIncentiveAPY", async () => {
    const rawData1: any = await getIncentiveAPY(account.address,account.client, 1)
    // const rawData3: any = await getIncentiveAPY(account.address,account.client, 3)
    console.log(JSON.stringify(rawData1, null, 2));
    // console.log(JSON.stringify(rawData3, null, 2));
  }, 50000);



});
