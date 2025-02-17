import { normalizeStructTag } from "@mysten/sui/utils";
import { depositCoin, borrowCoin, repayDebt } from "../src/libs/PTB";
import { getReserveData, getIncentiveAPY } from "../src/libs/CallFunctions";
import { getConfig, PriceFeedConfig, pool } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import * as fs from "fs";
import { describe, it, expect } from "vitest";
import { NAVISDKClient } from "../src/index";
import { Transaction } from "@mysten/sui/transactions";
import dotenv from "dotenv";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";

describe("repay test", () => {
  it("should success repay sui", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(
      account,
    );
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toDeposit] = txb.splitCoins(txb.gas, [1e7]);
    await depositCoin(txb, poolConfig, toDeposit, 1e5);
    const [borrowedCoin] = await borrowCoin(txb, poolConfig, 0.1e6);
    await repayDebt(txb, poolConfig, borrowedCoin, 0.1e6);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should success repay sui by user", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(
      account,
      "0x010ac247d4b9f8fcc9704b53b4aee5c4b00c3263b17bc39d3898ea802518bac9"
    );
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toDeposit] = txb.splitCoins(txb.gas, [1e7]);
    await depositCoin(txb, poolConfig, toDeposit, 1e5);
    const [borrowedCoin] = await borrowCoin(txb, poolConfig, 0.1e6);
    await repayDebt(txb, poolConfig, borrowedCoin, 0.1e6);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);
});
