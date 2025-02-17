import {
  claimAllRewardsPTB,
  claimAllRewardsResupplyPTB,
} from "../src/libs/PTB";
import * as v2 from "../src/libs//PTB/V2";
import * as v3 from "../src/libs//PTB/V3";
import { getConfig, PriceFeedConfig, pool } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";

describe("claim reward test", () => {
  it("should success claim v2 reward", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await v2.claimAllRewardsPTB(account.client, account.address, txb);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should success claim v2 reward and resupply", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await v2.claimAllRewardsResupplyPTB(account.client, account.address, txb);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should success claim v3 reward", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await v3.claimAllRewardsPTB(account.client, account.address, txb);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should success claim v3 reward and resupply", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await v3.claimAllRewardsResupplyPTB(account.client, account.address, txb);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should success claim v2/v3 reward", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await claimAllRewardsPTB(account.client, account.address, txb);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should success claim v2/v3 reward and resupply", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await claimAllRewardsResupplyPTB(account.client, account.address, txb);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  }, 500000);
});
