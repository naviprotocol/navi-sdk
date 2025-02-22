import {
  claimAllRewardsPTB,
  claimAllRewardsResupplyPTB,
  claimRewardsByAssetIdPTB
} from "../src/libs/PTB";
import * as v2 from "../src/libs//PTB/V2";
import * as v3 from "../src/libs//PTB/V3";
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

  it("should success claim v2 reward by asset", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await v2.claimRewardsByAssetIdPTB(account.client, account.address, 5, txb);

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

  it("should success claim v3 reward by asset id", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await v3.claimRewardsByAssetIdPTB(account.client, account.address, 5, txb);

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

  it("should success claim v2/v3 reward", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await claimRewardsByAssetIdPTB(account.client, account.address, 5, txb);

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
