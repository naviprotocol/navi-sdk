import BigNumber from "bignumber.js";

import { AggregatorConfig } from "./config";
import { Dex, Quote, SwapOptions } from "../../types";
import { returnMergedCoins } from "../PTB/commonFunctions";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { makeCETUSPTB } from "./Dex/cetus";
import { makeTurbosPTB } from "./Dex/turbos";
import { makeKriyaV3PTB } from "./Dex/kriyaV3";
import { makeAftermathPTB } from "./Dex/aftermath";
import { makeKriyaV2PTB } from "./Dex/KriyaV2";
import { makeDeepbookPTB } from "./Dex/deepbook";
import { getQuote } from "./getQuote";
import { generateRefId } from "./utils";
import { makeBluefinPTB } from "./Dex/bluefin";
import { makeVSUIPTB } from "./Dex/vSui";
import { makeHASUIPTB } from "./Dex/haSui";

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
  ifPrint: boolean = true, // Set ifPrint to be optional with a default value
  apiKey?: string,
  swapOptions?: SwapOptions
): Promise<TransactionResult> {
  if (!quote.routes || quote.routes.length === 0) {
    throw new Error("No routes found in data");
  }
  const tokenA = quote.from;
  const tokenB = quote.target;
  const allPaths = JSON.parse(JSON.stringify(quote.routes));

  if (ifPrint) {
    console.log(`tokenA: ${tokenA}, tokenB: ${tokenB}`);
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
      getQuote(tokenA, tokenB, newAmountIn, apiKey, swapOptions),
      new Promise<Quote | null>((resolve, reject) => {
        if (serviceFeeAmount === "0") {
          resolve(null);
          return;
        }
        if (
          tokenA ===
          "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT"
        ) {
          resolve({
            routes: [],
            amount_in: serviceFeeAmount,
            amount_out: serviceFeeAmount,
            from: tokenA,
            target: tokenA,
            dexList: [],
          });
          return;
        }
        getQuote(
          tokenA,
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

    const [coinOut, feeCoinOut] = await Promise.all([
      buildSwapPTBFromQuote(
        userAddress,
        txb,
        minAmountOut,
        coinIn as any,
        router as any,
        referral
      ),
      !!serviceFeeRouter && serviceFeeCoinIn
        ? serviceFeeRouter.from === serviceFeeRouter.target
          ? serviceFeeCoinIn
          : buildSwapPTBFromQuote(
              userAddress,
              txb,
              0,
              serviceFeeCoinIn as any,
              serviceFeeRouter as any,
              referral
            )
        : new Promise((resolve) => {
            resolve(null);
          }),
    ]);

    if (feeCoinOut) {
      txb.moveCall({
        package: AggregatorConfig.aggregatorContract,
        module: "slippage",
        function: "emit_referral_event",
        arguments: [
          coinOut,
          feeCoinOut as any,
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

      txb.transferObjects([feeCoinOut as any], serviceFee.receiverAddress);
    }

    return coinOut;
  }

  const finalCoinB = txb.moveCall({
    target: "0x2::coin::zero",
    typeArguments: [tokenB],
  });

  for (let i = 0; i < allPaths.length; i++) {
    const path = allPaths[i];
    const pathCoinAmountIn = Math.floor(path.amount_in);
    const pathCoinAmountOut = path.amount_out;

    if (ifPrint) {
      console.log(
        `Path Index: `,
        i,
        `Amount In: `,
        pathCoinAmountIn,
        `Expected Amount Out: `,
        pathCoinAmountOut
      );
    }

    let pathTempCoin: any = txb.splitCoins(coinIn, [pathCoinAmountIn]);

    for (let j = 0; j < path.path.length; j++) {
      const route = path.path[j];

      const poolId = route.id;
      const provider = route.provider;
      const tempTokenA = route.from;
      const tempTokenB = route.target;
      const a2b = route.a2b;
      const typeArguments = route.info_for_ptb.typeArguments;

      let amountInPTB;
      let tuborsVersion;

      if (provider === "turbos") {
        tuborsVersion = route.info_for_ptb.contractVersionId;
      }

      if (ifPrint) {
        console.log(
          `Route Index: `,
          i,
          "-",
          j,
          `provider: `,
          provider,
          `from: `,
          tempTokenA,
          `to: `,
          tempTokenB
        );
      }

      amountInPTB = txb.moveCall({
        target: "0x2::coin::value",
        arguments: [pathTempCoin],
        typeArguments: [tempTokenA],
      });

      switch (provider) {
        case Dex.CETUS: {
          let toSwapBalance = txb.moveCall({
            target: "0x2::coin::into_balance",
            arguments: [pathTempCoin],
            typeArguments: [tempTokenA],
          });
          const { receiveCoin, leftCoin } = await makeCETUSPTB(
            txb,
            poolId,
            true,
            toSwapBalance,
            amountInPTB,
            a2b,
            typeArguments
          );

          txb.transferObjects([leftCoin], userAddress);
          pathTempCoin = receiveCoin;
          break;
        }
        case Dex.TURBOS: {
          pathTempCoin = txb.makeMoveVec({
            elements: [pathTempCoin!],
          });
          const { turbosCoinB, turbosCoinA } = await makeTurbosPTB(
            txb,
            poolId,
            true,
            pathTempCoin,
            amountInPTB,
            a2b,
            typeArguments,
            userAddress,
            tuborsVersion
          );
          txb.transferObjects([turbosCoinA], userAddress);
          pathTempCoin = turbosCoinB;
          break;
        }
        case Dex.KRIYA_V2: {
          pathTempCoin = await makeKriyaV2PTB(
            txb,
            poolId,
            true,
            pathTempCoin,
            amountInPTB,
            a2b,
            typeArguments
          );
          break;
        }
        case Dex.KRIYA_V3: {
          pathTempCoin = await makeKriyaV3PTB(
            txb,
            poolId,
            true,
            pathTempCoin,
            amountInPTB,
            a2b,
            typeArguments
          );
          break;
        }
        case Dex.AFTERMATH: {
          const amountLimit = route.info_for_ptb.amountLimit;
          pathTempCoin = await makeAftermathPTB(
            txb,
            poolId,
            pathTempCoin,
            amountLimit,
            a2b,
            typeArguments
          );
          break;
        }
        case Dex.DEEPBOOK: {
          const amountLimit = route.info_for_ptb.amountLimit;
          const { baseCoinOut, quoteCoinOut } = await makeDeepbookPTB(
            txb,
            poolId,
            pathTempCoin,
            amountLimit,
            a2b,
            typeArguments
          );
          if (a2b) {
            pathTempCoin = quoteCoinOut;
            txb.transferObjects([baseCoinOut], userAddress);
          } else {
            pathTempCoin = baseCoinOut;
            txb.transferObjects([quoteCoinOut], userAddress);
          }
          break;
        }
        case Dex.BLUEFIN: {
          const { coinAOut, coinBOut } = await makeBluefinPTB(
            txb,
            poolId,
            pathTempCoin,
            amountInPTB,
            a2b,
            typeArguments
          );
          if (a2b) {
            txb.transferObjects([coinAOut], userAddress);
            pathTempCoin = coinBOut;
          } else {
            txb.transferObjects([coinBOut], userAddress);
            pathTempCoin = coinAOut;
          }
          break;
        }
        case Dex.VSUI: {
          pathTempCoin = await makeVSUIPTB(txb, pathTempCoin, a2b);
          break;
        }
        case Dex.HASUI: {
          pathTempCoin = await makeHASUIPTB(txb, pathTempCoin, a2b);
          break;
        }

        default: {
          break;
        }
      }
    }

    txb.mergeCoins(finalCoinB, [pathTempCoin]);
  }

  txb.transferObjects([coinIn], userAddress);

  txb.moveCall({
    target: `${AggregatorConfig.aggregatorContract}::slippage::check_slippage_v2`,
    arguments: [
      finalCoinB, // output coin object
      txb.pure.u64(Math.floor(minAmountOut)), // min amount out
      txb.pure.u64(quote.amount_in), // amount in
      txb.pure.u64(referral), // refferal id
    ],
    typeArguments: [tokenA, tokenB],
  });

  return finalCoinB;
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
