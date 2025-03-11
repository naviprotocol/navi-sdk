import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";
import { buildSwapPTBFromQuote } from "../src/libs/Aggregator/swapPTB";
import { getQuote } from "../src/libs/Aggregator/getQuote";
import { Dex, Quote } from "../src/types";

const sui = "0x2::sui::SUI";
const vsui =
  "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT";
const localBaseUrl = "http://localhost:8000/find_routes";

describe("buildSwapPTBFromQuote test", () => {
  it("should successfully swap SUI through cetus using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";

    const txb = createTransaction(account);
    const quote = await getQuote(sui, vsui, "1000000000", undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.CETUS],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.gas, [1e9]);
    const minAmountOut = 0;
    const coinOut = await buildSwapPTBFromQuote(
      account.address,
      txb,
      minAmountOut,
      coinIn,
      quote,
      0, // referral
      true // ifPrint
    );

    txb.transferObjects([coinOut], account.address);

    const tsRes = await handleTransactionResult(txb, account, testCaseName);
    console.log(tsRes);
    expect(tsRes).toEqual("success");
  }, 500000);

  // it("should successfully swap SUI through magma using single route", async () => {
  //   const testCaseName = expect.getState().currentTestName || "test_case";

  //   const txb = createTransaction(account);
  //   const quote = await getQuote(sui, vsui, "1000000000", undefined, {
  //     baseUrl: localBaseUrl,
  //     dexList: [Dex.MAGMA],
  //     byAmountIn: true,
  //     depth: 3,
  //   });

  //   const coinIn = txb.splitCoins(txb.gas, [1e9]);
  //   const minAmountOut = 0;
  //   const coinOut = await buildSwapPTBFromQuote(
  //     account.address,
  //     txb,
  //     minAmountOut,
  //     coinIn,
  //     quote,
  //     0, // referral
  //     true // ifPrint
  //   );

  //   txb.transferObjects([coinOut], account.address);

  //   const tsRes = await handleTransactionResult(txb, account, testCaseName);
  //   console.log(tsRes);
  //   expect(tsRes).toEqual("success");
  // }, 500000);
});
