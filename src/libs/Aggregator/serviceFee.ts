import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { Quote, SwapOptions } from "../../types";
import { getQuote } from "./getQuote";
import { AggregatorConfig } from "./config";

export interface ServiceFeeResult {
  router: Quote;
  serviceFeeRouter: Quote | null;
  serviceFeeCoinIn: TransactionResult;
}

/**
 * Handle service fee
 * @param userAddress - The address of the user
 * @param txb - The transaction builder
 * @param coinIn - The input coin
 * @param quote - The quote
 * @param serviceFee - The service fee
 * @param apiKey - The API key
 * @param swapOptions - The swap options
 * @returns The service fee result
 */
export async function handleServiceFee(
  userAddress: string,
  txb: Transaction,
  coinIn: TransactionResult,
  quote: Quote,
  serviceFee: any,
  apiKey?: string,
  swapOptions?: SwapOptions
): Promise<ServiceFeeResult> {
  const totalAmount = quote.amount_in;
  const serviceFeeAmount = new BigNumber(totalAmount)
    .multipliedBy(serviceFee.fee)
    .toFixed(0);
  const newAmountIn = new BigNumber(totalAmount)
    .minus(serviceFeeAmount)
    .toFixed(0);

  // split coins
  const serviceFeeCoinIn = txb.splitCoins(coinIn, [serviceFeeAmount]);

  // get router
  const [router, serviceFeeRouter] = await Promise.all([
    getQuote(quote.from, quote.target, newAmountIn, apiKey, swapOptions),
    new Promise<Quote | null>((resolve, reject) => {
      if (serviceFeeAmount === "0") {
        resolve(null);
        return;
      }
      if (
        quote.from ===
        "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT"
      ) {
        resolve({
          routes: [],
          amount_in: serviceFeeAmount,
          amount_out: serviceFeeAmount,
          from: quote.from,
          target: quote.from,
          dexList: [],
        });
        return;
      }
      getQuote(
        quote.from,
        "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
        serviceFeeAmount,
        apiKey,
        swapOptions
      )
        .then((router: Quote) => {
          resolve(router);
        })
        .catch(reject);
    }),
  ]);

  if (!router.amount_out) {
    router.amount_out = "0";
  }
  if (serviceFeeRouter && !serviceFeeRouter.amount_out) {
    serviceFeeRouter.amount_out = "0";
  }

  return {
    router,
    serviceFeeRouter,
    serviceFeeCoinIn
  };
}

/**
 * Emit a service fee event
 * @param txb - The transaction builder
 * @param coinOut - The output coin
 * @param feeCoinOut - The fee output coin
 * @param serviceFee - The service fee
 * @param router - The router
 * @param referral - The referral
 */
export function emitServiceFeeEvent(
  txb: Transaction,
  coinOut: TransactionResult,
  feeCoinOut: TransactionResult,
  serviceFee: any,
  router: Quote,
  referral: number
) {
  txb.moveCall({
    package: AggregatorConfig.aggregatorContract,
    module: "slippage",
    function: "emit_referral_event",
    arguments: [
      coinOut,
      feeCoinOut,
      txb.pure.address(serviceFee.receiverAddress),
      txb.pure.u8(router.from_token?.decimals || 9),
      txb.pure.u8(router.to_token?.decimals || 9),
      txb.pure.u8(9),
      txb.pure.u64(router.amount_in),
      txb.pure.u64(Math.floor((router.from_token?.price || 0) * 1e9)),
      txb.pure.u64(Math.floor((router.to_token?.price || 0) * 1e9)),
      txb.pure.u64(
        BigNumber(serviceFee.fee).multipliedBy(1e4).toFixed(0)
      ),
      txb.pure.u64(referral),
    ],
    typeArguments: [
      router.from,
      router.target,
      "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    ],
  });
} 