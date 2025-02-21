import { getConfig, PriceFeedConfig, pool, Sui } from "../src/address";
import { V3Type, PoolData, Pool, PoolConfig } from "../src/types";
import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";
import { flashloan, repayDebt, repayFlashLoan } from "../src/libs/PTB";
import { getFlashloanFee } from "../src/libs/PTB/migrate";

describe("flashloan test", () => {
  it("flashloan test", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
    const [toLoanBalance, receipt] = await flashloan(txb, poolConfig, 2e9);

    const [toLoan] = txb.moveCall({
      target: "0x2::coin::from_balance",
      arguments: [toLoanBalance],
      typeArguments: [poolConfig.type],
    });

    txb.mergeCoins(txb.gas, [toLoan]);
    const flashloanFee = await getFlashloanFee(Sui);
    console.log("flashloanFee", flashloanFee);
    const repayAmount = Math.floor(2e9 + 2e9 * flashloanFee);
    const [toRepay] = txb.splitCoins(txb.gas, [repayAmount]);
    const [toRepayBalance] = txb.moveCall({
      target: "0x2::coin::into_balance",
      arguments: [toRepay],
      typeArguments: [poolConfig.type],
    });
    const [remainingBalance] = await repayFlashLoan(
      txb,
      poolConfig,
      receipt,
      toRepayBalance
    );
    const [toReturn] = txb.moveCall({
      target: "0x2::coin::from_balance",
      arguments: [remainingBalance],
      typeArguments: [poolConfig.type],
    });

    txb.transferObjects([toReturn], account.address);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    expect(tsRes).toEqual("success");
  });
});
