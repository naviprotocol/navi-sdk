import BigNumber from "bignumber.js";

import { AggregatorConfig } from "./config";
import { Dex, Quote, SwapOptions } from "../../types";
import { returnMergedCoins } from "../PTB/commonFunctions";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { getQuote } from "./getQuote";
import { generateRefId } from "./utils";
import { handleServiceFee, emitServiceFeeEvent } from './serviceFee';
import { buildSwapWithoutServiceFee } from './buildSwapWithoutServiceFee';

export async function getCoins(
  client: SuiClient,
  address: string,
  coinType: any = "0x2::sui::SUI"
) {
  const coinAddress = coinType.address ? coinType.address : coinType;

  const coinDetails = await client.getCoins({
    owner: address,
    coinType: coinAddress,
  });
  return coinDetails;
}

export async function getCoinPTB(
  address: string,
  coin: string,
  amountIn: number | string | bigint,
  txb: Transaction,
  client: SuiClient
) {
  let coinA: TransactionResult;

  if (coin === "0x2::sui::SUI") {
    coinA = txb.splitCoins(txb.gas, [txb.pure.u64(amountIn)]);
  } else {
    const coinInfo = await getCoins(client, address, coin);

    // Check if user has enough balance for tokenA
    if (!coinInfo.data[0]) {
      throw new Error("Insufficient balance for this coin");
    }

    // Merge coins if necessary, to cover the amount needed
    const mergedCoin = returnMergedCoins(txb, coinInfo);
    coinA = txb.splitCoins(mergedCoin, [txb.pure.u64(amountIn)]);
  }
  return coinA;
}

export async function buildSwapPTBFromQuote(
  userAddress: string,
  txb: Transaction,
  minAmountOut: number,
  coinIn: TransactionResult,
  quote: Quote,
  referral: number = 0,
  ifPrint: boolean = true,
  apiKey?: string,
  swapOptions?: SwapOptions
): Promise<TransactionResult> {
  if (!quote.routes || quote.routes.length === 0) {
    throw new Error("No routes found in data");
  }

  if (
    Number(quote.amount_in) !==
    quote.routes.reduce(
      (sum: number, route: any) => sum + Number(route.amount_in),
      0
    )
  ) {
    throw new Error(
      "Outer amount_in does not match the sum of route amount_in values"
    );
  }

  const serviceFee = swapOptions?.serviceFee || swapOptions?.feeOption;

  // Calculate fee amounts if options provided
  if (
    serviceFee &&
    serviceFee.fee > 0 &&
    serviceFee.receiverAddress &&
    serviceFee.receiverAddress !== "0x0"
  ) {
    const { router, serviceFeeRouter, serviceFeeCoinIn } = await handleServiceFee(
      userAddress,
      txb,
      coinIn,
      quote,
      serviceFee,
      apiKey,
      swapOptions
    );

    const [coinOut, feeCoinOut] = await Promise.all([
      buildSwapWithoutServiceFee(
        userAddress,
        txb,
        coinIn,
        router,
        minAmountOut,
        referral,
        ifPrint
      ),
      !!serviceFeeRouter
        ? serviceFeeRouter.from === serviceFeeRouter.target
          ? serviceFeeCoinIn
          : buildSwapWithoutServiceFee(
            userAddress,
            txb,
            serviceFeeCoinIn,
            serviceFeeRouter,
            0,
            referral,
            ifPrint
          )
        : new Promise((resolve) => {
          resolve(null);
        }),
    ]);

    if (feeCoinOut) {
      emitServiceFeeEvent(
        txb,
        coinOut,
        feeCoinOut as any,
        serviceFee,
        router,
        referral
      );

      txb.transferObjects([feeCoinOut as any], serviceFee.receiverAddress);
    }

    return coinOut;
  }

  return await buildSwapWithoutServiceFee(
    userAddress,
    txb,
    coinIn,
    quote,
    minAmountOut,
    referral,
    ifPrint,
    swapOptions?.disablePositiveSlippage ?? false
  );
}

export async function swapPTB(
  address: string,
  txb: Transaction,
  fromCoinAddress: string,
  toCoinAddress: string,
  coin: TransactionResult,
  amountIn: number | string | bigint,
  minAmountOut: number,
  apiKey?: string,
  swapOptions: SwapOptions = {
    baseUrl: undefined,
    dexList: [],
    byAmountIn: true,
    depth: 3,
    ifPrint: true,
    disablePositiveSlippage: false
  }
): Promise<TransactionResult> {
  const refId = apiKey ? generateRefId(apiKey) : 0;

  // Get the output coin from the swap route and transfer it to the user
  const quote = await getQuote(
    fromCoinAddress,
    toCoinAddress,
    amountIn,
    apiKey,
    swapOptions
  );


  const finalCoinB = await buildSwapPTBFromQuote(
    address,
    txb,
    minAmountOut,
    coin,
    quote,
    refId,
    swapOptions.ifPrint,
    apiKey,
    swapOptions
  );

  return finalCoinB;
}

export async function checkIfNAVIIntegrated(
  digest: string,
  client: SuiClient
): Promise<boolean> {
  const results = await client.getTransactionBlock({
    digest,
    options: { showEvents: true },
  });
  return (
    results.events?.some((event) =>
      event.type.includes(`${AggregatorConfig.aggregatorContract}::slippage`)
    ) ?? false
  );
}
