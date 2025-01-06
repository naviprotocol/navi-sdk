import { AggregatorConfig } from "./config";
import { Dex, FeeOption, Quote, SwapOptions } from '../../types';
import { returnMergedCoins } from "../PTB/commonFunctions";

import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { makeCETUSPTB } from "./Dex/cetus";
import { makeTurbosPTB } from "./Dex/turbos";
import { makeKriyaV3PTB } from "./Dex/kriyaV3";
import { makeAftermathPTB } from "./Dex/aftermath";
import { makeKriyaV2PTB } from "./Dex/KriyaV2";
import { makeDeepbookPTB } from "./Dex/deepbook";
import { getQuote } from "./getQuote";
import { SuiClient } from "@mysten/sui/dist/cjs/client";
import { vSui } from "../../address";
import { generateRefId } from "./utils";
import { makeBluefinPTB } from "./Dex/bluefin";

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

export async function getCoinPTB(address: string, coin: string, amountIn: number | string | bigint, txb: Transaction, client: SuiClient) {
    let coinA: TransactionResult;

    if (coin === '0x2::sui::SUI') {
        coinA = txb.splitCoins(txb.gas, [txb.pure.u64(amountIn)]);
    } else {
        const coinInfo = await getCoins(client, address, coin);

        // Check if user has enough balance for tokenA
        if (!coinInfo.data[0]) {
            throw new Error('Insufficient balance for this coin');
        }

        // Merge coins if necessary, to cover the amount needed
        const mergedCoin = returnMergedCoins(txb, coinInfo);
        coinA = txb.splitCoins(mergedCoin, [txb.pure.u64(amountIn)]);
    }
    return coinA;
}

export async function buildSwapPTBFromQuote(userAddress: string, txb: Transaction, minAmountOut: number, coinIn: TransactionResult, quote: Quote, referral: number = 0): Promise<TransactionResult> {
    if (!quote.routes || quote.routes.length === 0) {
        throw new Error("No routes found in data");
    }
    const tokenA = quote.from;
    const tokenB = quote.target;
    const allPaths = JSON.parse(JSON.stringify(quote.routes));
    console.log(`tokenA: ${tokenA}, tokenB: ${tokenB}`);
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

    const finalCoinB = txb.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [tokenB],
    });

    for (let i = 0; i < allPaths.length; i++) {
        const path = allPaths[i];
        const pathCoinAmountIn = Math.floor(path.amount_in);
        const pathCoinAmountOut = path.amount_out;
        console.log(
            `Path Index: `,
            i,
            `Amount In: `,
            pathCoinAmountIn,
            `Expected Amount Out: `,
            pathCoinAmountOut
        );
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
                const { baseCoinOut, quoteCoinOut, deepCoinOut } =
                  await makeDeepbookPTB(
                    txb,
                    poolId,
                    pathTempCoin,
                    amountLimit,
                    a2b,
                    typeArguments
                  );
                if (a2b) {
                  pathTempCoin = quoteCoinOut;
                  txb.transferObjects([baseCoinOut, deepCoinOut], userAddress);
                } else {
                  pathTempCoin = baseCoinOut;
                  txb.transferObjects([quoteCoinOut, deepCoinOut], userAddress);
                }
                break;
              }
              case Dex.BLUEFIN: {
                const amountLimit = route.info_for_ptb.amountLimit;
                const { coinAOut, coinBOut } = await makeBluefinPTB(txb, poolId, pathTempCoin, pathCoinAmountIn, a2b, amountLimit, typeArguments)
                if (a2b) {
                  txb.transferObjects([coinAOut], userAddress);
                  pathTempCoin = coinBOut;
                }
                else {
                  txb.transferObjects([coinBOut], userAddress);
                  pathTempCoin = coinAOut;
                }
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
    swapOptions: SwapOptions = { baseUrl: undefined, dexList: [], byAmountIn: true, depth: 3, feeOption: { fee: 0, receiverAddress: "0x0" } }
): Promise<TransactionResult> {

    let finalCoinB: TransactionResult;
    const refId = apiKey ? generateRefId(apiKey) : 0;
    if (swapOptions.feeOption && swapOptions.feeOption.fee > 0 && swapOptions.feeOption.receiverAddress !== "0x0") {
        const feeAmount = Math.floor(Number(swapOptions.feeOption.fee) * Number(amountIn));
        const leftAmount = Number(amountIn) - Number(feeAmount);

        const feeCoin = txb.splitCoins(coin, [feeAmount]);

        if (fromCoinAddress === vSui.address) {
            txb.transferObjects([feeCoin], swapOptions.feeOption.receiverAddress);
            const quote = await getQuote(fromCoinAddress, toCoinAddress, leftAmount, apiKey, swapOptions);

            const newMinAmountOut = Math.max(0, Math.floor(minAmountOut * (1 - swapOptions.feeOption.fee)));

            finalCoinB = await buildSwapPTBFromQuote(address, txb, newMinAmountOut, coin, quote, refId);
        } else {
            const [feeQuote, quote] = await Promise.all([
                getQuote(fromCoinAddress, vSui.address, feeAmount, apiKey, swapOptions),
                getQuote(fromCoinAddress, toCoinAddress, leftAmount, apiKey, swapOptions)
            ]);

            const newMinAmountOut = Math.max(0, Math.floor(minAmountOut - Number(feeQuote.amount_out)));

            const [feeCoinB, finalCoinBResult] = await Promise.all([
                buildSwapPTBFromQuote(address, txb, 0, feeCoin, feeQuote, refId),
                buildSwapPTBFromQuote(address, txb, newMinAmountOut, coin, quote, refId)
            ]);

            txb.transferObjects([feeCoinB], swapOptions.feeOption.receiverAddress);
            finalCoinB = finalCoinBResult;
        }
    } else {
        // Get the output coin from the swap route and transfer it to the user
        const quote = await getQuote(fromCoinAddress, toCoinAddress, amountIn, apiKey, swapOptions);
        finalCoinB = await buildSwapPTBFromQuote(address, txb, minAmountOut, coin, quote, refId);
    }

    return finalCoinB;
}

export async function checkIfNAVIIntegrated(digest: string, client: SuiClient): Promise<boolean> {
    const results = await client.getTransactionBlock({ digest, options: { showEvents: true } });
    return results.events?.some(event => event.type.includes(`${AggregatorConfig.aggregatorContract}::slippage`)) ?? false;
}
