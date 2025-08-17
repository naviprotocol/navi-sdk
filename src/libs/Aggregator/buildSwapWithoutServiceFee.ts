import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { Quote } from "../../types";
import { AggregatorConfig } from "./config";
import { Dex } from "../../types";
import { makeCETUSPTB } from "./Dex/cetus";
import { makeTurbosPTB } from "./Dex/turbos";
import { makeKriyaV2PTB } from "./Dex/KriyaV2";
import { makeKriyaV3PTB } from "./Dex/kriyaV3";
import { makeAftermathPTB } from "./Dex/aftermath";
import { makeDeepbookPTB } from "./Dex/deepbook";
import { makeBluefinPTB } from "./Dex/bluefin";
import { makeMAGMAPTB } from "./Dex/magma";
import { makeVSUIPTB } from "./Dex/vSui";
import { makeHASUIPTB } from "./Dex/haSui";
import { makeMomentumPTB } from "./Dex/momentum";
import { makeSpringSuiPTB } from "./Dex/springSui";

/**
 * Build a swap transaction without service fee
 * @param userAddress - The address of the user
 * @param txb - The transaction builder
 * @param coinIn - The input coin
 * @param quote 
 * @param minAmountOut - The minimum amount out
 * @param referral - The referral
 * @param ifPrint - If print
 * @returns 
 */
export async function buildSwapWithoutServiceFee(
  userAddress: string,
  txb: Transaction,
  coinIn: TransactionResult,
  quote: Quote,
  minAmountOut: number,
  referral: number = 0,
  ifPrint: boolean = true,
  client?: any
): Promise<TransactionResult> {
  const tokenA = quote.from;
  const tokenB = quote.target;
  const allPaths = JSON.parse(JSON.stringify(quote.routes));

  if (ifPrint) {
    console.log(`tokenA: ${tokenA}, tokenB: ${tokenB}`);
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
          const coinA = a2b
            ? pathTempCoin
            : txb.moveCall({
              target: "0x2::coin::zero",
              typeArguments: [tempTokenB],
            });
          const coinB = a2b
            ? txb.moveCall({
              target: "0x2::coin::zero",
              typeArguments: [tempTokenB],
            })
            : pathTempCoin;

          const coinABs = await makeCETUSPTB(
            txb,
            poolId,
            true,
            coinA,
            coinB,
            amountInPTB,
            a2b,
            typeArguments,
          );

          if (a2b) {
            txb.transferObjects([coinABs[0]], userAddress);
            pathTempCoin = coinABs[1];
          } else {
            txb.transferObjects([coinABs[1]], userAddress);
            pathTempCoin = coinABs[0];
          }
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
        case Dex.MAGMA: {
          const coinA = a2b
            ? pathTempCoin
            : txb.moveCall({
              target: "0x2::coin::zero",
              typeArguments: [tempTokenB],
            });
          const coinB = a2b
            ? txb.moveCall({
              target: "0x2::coin::zero",
              typeArguments: [tempTokenB],
            })
            : pathTempCoin;

          const coinABs = await makeMAGMAPTB(
            txb,
            poolId,
            true,
            coinA,
            coinB,
            amountInPTB,
            a2b,
            typeArguments,
          );

          if (a2b) {
            txb.transferObjects([coinABs[0]], userAddress);
            pathTempCoin = coinABs[1];
          } else {
            txb.transferObjects([coinABs[1]], userAddress);
            pathTempCoin = coinABs[0];
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
        case Dex.MOMENTUM: {
          const outputCoin = await makeMomentumPTB(txb, poolId, pathTempCoin, amountInPTB, a2b, typeArguments);
          txb.transferObjects([pathTempCoin], userAddress);
          pathTempCoin = outputCoin;
          break;
        }
        case Dex.SPRING_SUI: {
          pathTempCoin = await makeSpringSuiPTB(txb, pathTempCoin, a2b);
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

  // Add slippage check
  txb.moveCall({
    target: `${AggregatorConfig.aggregatorContract}::slippage::check_slippage_v2`,
    arguments: [
      finalCoinB,
      txb.pure.u64(Math.floor(minAmountOut)),
      txb.pure.u64(quote.amount_in),
      txb.pure.u64(referral),
    ],
    typeArguments: [tokenA, tokenB],
  });

  return finalCoinB;
} 