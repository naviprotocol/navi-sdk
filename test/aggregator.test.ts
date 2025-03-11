import { describe, it, expect } from "vitest";
import { createTransaction, handleTransactionResult } from "./helper";
import { client, account } from "./client";
import { buildSwapPTBFromQuote, swapPTB } from "../src/libs/Aggregator/swapPTB";
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

  it("should successfully swap SUI through cetus using single route with fee", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account);

    const quote = await getQuote(sui, vsui, "1000000000", undefined, {
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
      true, // ifPrint
      undefined,
      {
        serviceFee: {
          fee: 0.5,
          receiverAddress:
            "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c", // random address
        },
      }
    );
    console.log("coinOut at aggregator", coinOut);
    console.log("Transaction:", txb.getData());

    txb.transferObjects([coinOut], account.address);

    const tsRes = await handleTransactionResult(
      txb,
      account,
      testCaseName,
      true,
      true
    );
    console.log(tsRes);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should successfully swap vSUI through cetus using single route with fee", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account);

    const coinInStruct = await account.getCoins(vsui);
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const coinInStructBalance = coinInStruct.data[0].balance;
    console.log("coinInStructBalance", coinInStructBalance);
    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [
      coinInStructBalance,
    ]);
    const quote = await getQuote(vsui, sui, coinInStructBalance, undefined, {
      dexList: [Dex.CETUS],
      byAmountIn: true,
      depth: 3,
    });
    const minAmountOut = 0;

    const coinOut = await buildSwapPTBFromQuote(
      account.address,
      txb,
      minAmountOut,
      coinIn,
      quote,
      0, // referral
      true, // ifPrint
      undefined,
      {
        serviceFee: {
          fee: 0.5,
          receiverAddress:
            "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c", // random address
        },
      }
    );

    txb.transferObjects([coinOut], account.address);

    const tsRes = await handleTransactionResult(
      txb,
      account,
      testCaseName,
      true,
      true
    );
    console.log(tsRes);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should swap PTB with fee options successfully", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account);

    // Test sui to vsui swap
    const fromCoin = sui;
    const toCoin = vsui;
    const amountIn = "1000000000";
    const minAmountOut = 0;
    const swapOptions = {
      dexList: [Dex.TURBOS],
      byAmountIn: true,
      depth: 3,
      feeOption: {
        fee: 0.5,
        receiverAddress:
          "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c",
      },
    };

    const coinIn = txb.splitCoins(txb.gas, [1e9]);

    // Execute swap
    const result = await swapPTB(
      account.address,
      txb,
      fromCoin,
      toCoin,
      coinIn,
      amountIn,
      minAmountOut,
      undefined,
      swapOptions
    );

    // Transfer result back to account
    txb.transferObjects([result], account.address);

    // Verify transaction succeeded
    const txResult = await handleTransactionResult(
      txb,
      account,
      testCaseName,
      true,
      true
    );
    expect(txResult).toEqual("success");
  }, 500000);

  it("should swap PTB with service fee options successfully", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account);

    // Test sui to vsui swap
    const fromCoin = sui;
    const toCoin = vsui;
    const amountIn = "1000000000";
    const minAmountOut = 0;
    const swapOptions = {
      dexList: [Dex.TURBOS],
      byAmountIn: true,
      depth: 3,
      serviceFee: {
        fee: 0.5,
        receiverAddress:
          "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c",
      },
    };

    const coinIn = txb.splitCoins(txb.gas, [1e9]);

    // Execute swap
    const result = await swapPTB(
      account.address,
      txb,
      fromCoin,
      toCoin,
      coinIn,
      amountIn,
      minAmountOut,
      undefined,
      swapOptions
    );

    // Transfer result back to account
    txb.transferObjects([result], account.address);

    // Verify transaction succeeded
    const txResult = await handleTransactionResult(
      txb,
      account,
      testCaseName,
      true,
      true
    );
    expect(txResult).toEqual("success");
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
