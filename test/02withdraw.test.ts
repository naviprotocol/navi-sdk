
import {depositCoin, withdrawCoin} from "../src/libs/PTB";
import { pool } from "../src/address";
import { Pool, PoolConfig } from "../src/types";
import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";


describe("withdraw test", () => {
  it("should success withdraw Sui to NAVI protocol", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toDeposit] = txb.splitCoins(txb.gas, [1e8]);
    await depositCoin(txb, poolConfig, toDeposit, 1e8);
    const [withdrawCoins] = await withdrawCoin(txb, poolConfig, 1e7);
    txb.transferObjects([withdrawCoins as any], account.address);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000)
});
