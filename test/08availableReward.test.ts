import { getAvailableRewards } from "../src/libs/PTB";
import * as v2 from "../src/libs//PTB/V2";
import * as v3 from "../src/libs//PTB/V3";
import { getConfig, PriceFeedConfig, pool } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";

describe("chain query test", () => {
  it("should success get v2 supply  available rewards ", async () => {
    const txRes = await v2.getAvailableRewards(
      account.client,
      account.address,
      1
    );
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);

  it("should success get v2 borrow  available rewards ", async () => {
    const txRes = await v2.getAvailableRewards(
      account.client,
      account.address,
      1
    );
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);

  it.only("should success get v3  available rewards ", async () => {
    const txRes = await v3.getAvailableRewards(account.client, account.address);
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);

  it("should success get v3  available rewards without option ", async () => {
    const txRes = await v3.getAvailableRewardsWithoutOption(account.client, account.address);
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);

  it("should success get v2/v3 supply  available rewards ", async () => {
    const txRes = await getAvailableRewards(account.client, account.address, [
      1,
    ]);
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);

  it("should success get v2/v3 borrow  available rewards ", async () => {
    const txRes = await getAvailableRewards(account.client, account.address, [
      3,
    ]);
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);

  it("should success get v2/v3 all available rewards ", async () => {
    const txRes = await getAvailableRewards(
      account.client,
      account.address,
      [1, 3]
    );
    console.log(JSON.stringify(txRes, null, 2));
  }, 5000000);
});
