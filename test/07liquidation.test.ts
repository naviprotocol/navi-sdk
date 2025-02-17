
import {depositCoin, withdrawCoin} from "../src/libs/PTB";
import { getConfig, PriceFeedConfig, pool } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";


describe("liqudation test", () => {
  it("should success deposit Sui to NAVI protocol", async () => {
    const testCaseName = expect.getState().currentTestName || 'test_case';

    const txb = createTransaction(account);
        const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
        const [toDeposit] = txb.splitCoins(txb.gas, [1e7]);
        await depositCoin(txb, poolConfig, toDeposit, 1e7);
        await withdrawCoin(txb, poolConfig, 1e9);

        const tsRes = await handleTransactionResult(txb,account,testCaseName)
        expect(tsRes).toEqual("success");

  }, 500000)
});
