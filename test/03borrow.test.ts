import { depositCoin, borrowCoin } from "../src/libs/PTB";
import { pool } from "../src/address";
import { Pool, PoolConfig } from "../src/types";
import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";

describe("borrow test", () => {
  it("should success borrow Sui", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toDeposit] = txb.splitCoins(txb.gas, [1e7]);
    await depositCoin(txb, poolConfig, toDeposit, 1e5);
    const [borrowCoins] =await borrowCoin(txb, poolConfig, 0.1e9);
    txb.transferObjects([borrowCoins as any], account.address);
    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  });
});
