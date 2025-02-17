// import { getAvailableRewardsWithoutOption, getAvailableRewards, claimAllRewardsPTB, getPoolApy, claimAllRewardsResupplyPTB, getBorrowFee } from "../src/libs/PTB/V3";
import { normalizeStructTag } from '@mysten/sui/utils';
import {depositCoin} from "../src/libs/PTB";
import { getReserveData, getIncentiveAPY } from "../src/libs/CallFunctions";
import { getConfig, PriceFeedConfig, pool } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import * as fs from "fs";
import { describe, it, expect } from "vitest";
import { NAVISDKClient } from "../src/index";
import { Transaction } from "@mysten/sui/transactions";
import dotenv from "dotenv";
import { SuiClient } from "@mysten/sui/client";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";

describe("deposit test", () => {
  it("should success deposit 1 Sui", async () => {
    const testCaseName = expect.getState().currentTestName || 'test_case';

    const txb = createTransaction(account);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toDeposit] = txb.splitCoins(txb.gas, [1e7]);
    await depositCoin(txb, poolConfig, toDeposit, txb.pure.u64(1e7));
    const tsRes = await handleTransactionResult(txb,account,testCaseName)
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should failed insufficient SUI balance for deposit", async () => {
    const testCaseName = expect.getState().currentTestName || 'test_case';

    const txb = createTransaction(account);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toDeposit] = txb.splitCoins(txb.gas, [100e9]);
    await depositCoin(txb, poolConfig, toDeposit, txb.pure.u64(100e9));
    const tsRes = await handleTransactionResult(txb,account,testCaseName)
    console.log(tsRes)
    expect(tsRes).toEqual("failure");
  }, 500000);


});
