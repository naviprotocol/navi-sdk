import { getBorrowFee, getPoolApy, getCurrentRules, getPoolsApy, updateOraclePTB } from "../src/libs/PTB";
import { getConfig, PriceFeedConfig, pool } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import { describe, it, expect } from "vitest";
import { getReserveData, getIncentiveAPY } from "../src/libs/CallFunctions";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";

describe("query test", () => {
  it("should success get V3 borrow fee", async () => {
    const txRes = await getBorrowFee(account.client);
    expect(txRes).toEqual(0.3);
  }, 50000);

  it("should success cal apy V3", async () => {
    const txRes = await getPoolsApy(account.client);
    console.log(JSON.stringify(txRes, null, 2));
  }, 50000);

  it("should success getCurrentRules", async () => {
    const txRes = await getCurrentRules(account.client);
    console.log(JSON.stringify(txRes, null, 2));
  }, 50000);

  it("should success get ReserveData", async () => {
    const rawData = await getReserveData(account.address, account.client);
    console.log(JSON.stringify(rawData, null, 2));
  }, 50000);

  it("should success getIncentiveAPY", async () => {
    const rawData = await getIncentiveAPY(account.address, account.client, 1);
    console.log(JSON.stringify(rawData, null, 2));
  }, 50000);

  it('should get correct check user health factor', async () => {
    // const userToCheck = '0x523c19fd6af645a12c6cb69bff0740b693aedd3f7613b1b20aa40d78f45204be';
    const res = await client.getHealthFactor(account.address)
    console.log(res);
    // expect(res).toBeGreaterThan(1);
    // expect(res).toBeLessThan(20);
}, 50000);

it('should get correct return all accounts\' Navi Portfolio', async () => {

  const res = await client.getAllNaviPortfolios();
  console.log(res);
  // const haSui: any = res.get('HaedalSui');

  // expect(haSui.borrowBalance).toBe(0);
  // expect(haSui.supplyBalance).toBe(0);

}, 50000);

  it.only("should success update oracle", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    await updateOraclePTB(account.client, txb)

    const tsRes = await handleTransactionResult(txb, account, testCaseName, false);
    expect(tsRes).toEqual("success");
  }, 500000);
});
