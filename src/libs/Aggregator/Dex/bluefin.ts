import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";
import { SUI_CLOCK_OBJECT_ID, normalizeSuiAddress } from "@mysten/sui/utils";
import { CoinStruct, getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import BigNumber from "bignumber.js";

type TransactionObjcet = {
    $kind: "Input";
    Input: number;
    type?: "object";
} | TransactionResult

export async function makeBluefinPTB(txb: Transaction, poolId: string, byAmountIn: boolean, pathTempCoin: any, fromCoin: string, toCoin: string, amount: any, a2b: boolean, amountLimit: any) {
    const coinA = a2b ? pathTempCoin : zeroCoin(txb, toCoin)
    const coinB = a2b ? zeroCoin(txb, toCoin) : pathTempCoin
    const sqrtPriceLimit = BigInt(a2b ? '4295048016' : '79226673515401279992447579055');

  const args = 
    [
        txb.object(SUI_CLOCK_OBJECT_ID),
        txb.object(AggregatorConfig.bluefinGlobalConfig),
        txb.object(poolId),
        coinA,
        coinB,
        txb.pure.bool(a2b),
        txb.pure.bool(byAmountIn),
        txb.pure.u64(new BigNumber(amount).toFixed(0)),
        txb.pure.u64(new BigNumber(amountLimit).toFixed(0)),
        txb.pure.u128(sqrtPriceLimit.toString())
    ]
  const res = txb.moveCall({
    target: `${AggregatorConfig.bluefinPackageId}::gateway::swap_assets`,
    typeArguments: [fromCoin, toCoin],
    arguments: args,
  });

  return res;
}

const zeroCoin = (txb: Transaction, coinType: string) => {
    return txb.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [coinType]
    });
}