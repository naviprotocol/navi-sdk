import { describe, it, expect } from "vitest";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

import { buildSwapPTBFromQuote } from "../src/libs/Aggregator/swapPTB";
import { getQuote } from "../src/libs/Aggregator/getQuote";
import { Dex } from "../src/types";

import { createTransaction, handleTransactionResult } from "./helper";
import { account } from "./client";

const localBaseUrl = "http://localhost:8000/find_routes";
const coins = {
  sui: {
    address: "0x2::sui::SUI",
    holder: "0x80841329787fd577639add61cc955ace969af60fadfb05b8ff752c2de4a8aa65"
  },
  sSui: {
    address: "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI",
    holder: "0x80841329787fd577639add61cc955ace969af60fadfb05b8ff752c2de4a8aa65"
  },
};

describe("mint test", () => {
 
 
  it("should successfully mint sSui through springSui stake using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);

    const amountIn = "100000000";

    const quote = await getQuote(coins.sui.address, coins.sSui.address, amountIn, undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.SSUI],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.gas, [1e8]);
    const minAmountOut = 0;
    const coinOut = await buildSwapPTBFromQuote(
      coins.sui.holder,
      txb,
      minAmountOut,
      coinIn,
      quote,
      0, // referral
      true // ifPrint
    );

    txb.transferObjects([coinOut], coins.sui.holder);

    const tsRes = await handleTransactionResult(txb, account, testCaseName, true);
    expect(tsRes).toEqual("success");
  }, 500000);
});
 