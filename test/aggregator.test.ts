import { describe, it, expect } from "vitest";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

import { buildSwapPTBFromQuote, swapPTB } from "../src/libs/Aggregator/swapPTB";
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
  vSui: {
    address: "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    holder: "0xb2630a7cdbe44adb2844b7715c7e6c54ec67e4558249deb71ba7b2df3c85915e"
  },
  haSui: {
    address: "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    holder: "0xb2630a7cdbe44adb2844b7715c7e6c54ec67e4558249deb71ba7b2df3c85915e"
  },
  deep: {
    address: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    holder: "0x60dd01bc037e2c1ea2aaf02187701f9f4453ba323338d2f2f521957065b0984d"
  },
};

describe("swap test", () => {
  it("should successfully swap SUI through cetus using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    const quote = await getQuote(coins.sui.address, coins.vSui.address, amountIn, undefined, {
      dexList: [Dex.CETUS],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);
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

  it("should successfully swap SUI through magma using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    const quote = await getQuote(coins.sui.address, coins.vSui.address, amountIn, undefined, {
      dexList: [Dex.MAGMA],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);
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

  it("should successfully swap SUI through turbos using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    const quote = await getQuote(coins.sui.address, coins.vSui.address, amountIn, undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.TURBOS],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);
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

  it("should successfully swap DEEP through deepbook using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.deep.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get DEEP coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.deep.holder,
      coinType: coins.deep.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    const quote = await getQuote(coins.deep.address, coins.sui.address, amountIn, undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.DEEPBOOK],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);
    const minAmountOut = 0;
    const coinOut = await buildSwapPTBFromQuote(
      coins.deep.holder,
      txb,
      minAmountOut,
      coinIn,
      quote,
      0, // referral
      true // ifPrint
    );

    txb.transferObjects([coinOut], coins.deep.holder);

    const tsRes = await handleTransactionResult(txb, account, testCaseName, true);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should successfully swap SUI through haSui stake using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    const quote = await getQuote(coins.sui.address, coins.haSui.address, amountIn, undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.HASUI],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);
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

  it("should successfully swap haSui through haSui unstake using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.haSui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
    
    // Get haSui coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.haSui.holder,
      coinType: coins.haSui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const coinInStructBalance = coinInStruct.data[0].balance;
    
    const quote = await getQuote(coins.haSui.address, coins.sui.address, coinInStructBalance, undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.HASUI],
      byAmountIn: true,
      depth: 3,
    });

    // Use actual haSui coin
    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [coinInStructBalance]);
    const minAmountOut = 0;
    const coinOut = await buildSwapPTBFromQuote(
      coins.haSui.holder,
      txb,
      minAmountOut,
      coinIn,
      quote,
      0, // referral
      true // ifPrint
    );

    txb.transferObjects([coinOut], coins.haSui.holder);

    const tsRes = await handleTransactionResult(txb, account, testCaseName, true);
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should successfully swap SUI through vSui stake anyway", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
    
    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";
    
    const quote = await getQuote(coins.sui.address, coins.vSui.address, amountIn, undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.VSUI, Dex.CETUS],
      byAmountIn: true,
      depth: 3,
    });
    expect(quote.routes[0].path[0].provider).toEqual(Dex.VSUI);

    // Use SUI coin
    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);
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

describe("fee options test", () => {
  it("should successfully swap SUI through cetus using single route with fee", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    const quote = await getQuote(coins.sui.address, coins.vSui.address, amountIn, undefined, {
      dexList: [Dex.CETUS],
      byAmountIn: true,
      depth: 3,
    });

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);
    const minAmountOut = 0;
    const coinOut = await buildSwapPTBFromQuote(
      coins.sui.holder,
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

    txb.transferObjects([coinOut], coins.sui.holder);

    const tsRes = await handleTransactionResult(
      txb,
      account,
      testCaseName,
      true,
      true
    );
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should successfully swap vSUI through cetus using single route with fee", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.vSui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get vSUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.vSui.holder,
      coinType: coins.vSui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const coinInStructBalance = coinInStruct.data[0].balance;
    
    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [
      coinInStructBalance,
    ]);
    const quote = await getQuote(coins.vSui.address, coins.sui.address, coinInStructBalance, undefined, {
      dexList: [Dex.CETUS],
      byAmountIn: true,
      depth: 3,
    });
    const minAmountOut = 0;

    const coinOut = await buildSwapPTBFromQuote(
      coins.vSui.holder,
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

    txb.transferObjects([coinOut], coins.vSui.holder);

    const tsRes = await handleTransactionResult(
      txb,
      account,
      testCaseName,
      true,
      true
    );
    expect(tsRes).toEqual("success");
  }, 500000);

  it("should swap PTB with fee options successfully", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    // Test sui to vSui swap
    const fromCoin = coins.sui.address;
    const toCoin = coins.vSui.address;
    const minAmountOut = 0;
    const swapOptions = {
      dexList: [],
      byAmountIn: true,
      depth: 3,
      feeOption: {
        fee: 0.5,
        receiverAddress:
          "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c",
      },
    };

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);

    // Execute swap
    const result = await swapPTB(
      coins.sui.holder,
      txb,
      fromCoin,
      toCoin,
      coinIn,
      amountIn,
      minAmountOut,
      undefined,
      swapOptions
    );

    // Transfer result back to holder
    txb.transferObjects([result], coins.sui.holder);

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
    const txb = createTransaction(account, coins.sui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get SUI coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sui.holder,
      coinType: coins.sui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const amountIn = "1000000000";

    // Test sui to vSui swap
    const fromCoin = coins.sui.address;
    const toCoin = coins.vSui.address;
    const minAmountOut = 0;
    const swapOptions = {
      dexList: [],
      byAmountIn: true,
      depth: 3,
      serviceFee: {
        fee: 0.5,
        receiverAddress:
          "0x3be8db6ca4adf33387f16c86c443737e78fd14db85a4e1c68cc8f256ac68549c",
      },
    };

    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [1e9]);

    // Execute swap
    const result = await swapPTB(
      coins.sui.holder,
      txb,
      fromCoin,
      toCoin,
      coinIn,
      amountIn,
      minAmountOut,
      undefined,
      swapOptions
    );

    // Transfer result back to holder
    txb.transferObjects([result], coins.sui.holder);

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
})