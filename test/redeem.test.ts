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
    holder: "0x394482448a69618e8c73d36e086805b2a60da6faa07791966c2599f0c074d876"
  },
  sSui: {
    address: "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI",
    holder: "0x394482448a69618e8c73d36e086805b2a60da6faa07791966c2599f0c074d876"
  },
};

describe("redeem test", () => {
  it("should successfully redeem sSui through springSui unstake using single route", async () => {
    const testCaseName = expect.getState().currentTestName || "test_case";
    const txb = createTransaction(account, coins.sSui.holder);
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get sSui coins owned by the holder
    const coinInStruct = await suiClient.getCoins({
      owner: coins.sSui.holder,
      coinType: coins.sSui.address
    });
    const coinInStructObjectId = coinInStruct.data[0].coinObjectId;
    const coinInStructBalance = coinInStruct.data[0].balance;

    const quote = await getQuote(coins.sSui.address, coins.sui.address, coinInStructBalance, undefined, {
      baseUrl: localBaseUrl,
      dexList: [Dex.SSUI],
      byAmountIn: true,
      depth: 3,
    });

    // Use actual sSui coin
    const coinIn = txb.splitCoins(txb.object(coinInStructObjectId), [coinInStructBalance]);
    const minAmountOut = 0;
    const coinOut = await buildSwapPTBFromQuote(
      coins.sSui.holder,
      txb,
      minAmountOut,
      coinIn,
      quote,
      0, // referral
      true // ifPrint
    );

    txb.transferObjects([coinOut], coins.sSui.holder);

    const tsRes = await handleTransactionResult(txb, account, testCaseName, true);
    expect(tsRes).toEqual("success");
  }, 500000);
});
