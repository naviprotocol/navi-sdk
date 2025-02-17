import { normalizeStructTag } from "@mysten/sui/utils";
import { depositCoin, borrowCoin } from "../src/libs/PTB";
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

describe("borrow test", () => {
  it("should success borrow Sui", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toDeposit] = txb.splitCoins(txb.gas, [1e7]);
    await depositCoin(txb, poolConfig, toDeposit, 1e5);
    await borrowCoin(txb, poolConfig, 0.1e9);
    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  });
});
