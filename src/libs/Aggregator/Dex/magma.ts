import { Transaction } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";

export async function makeMAGMAPTB(
  txb: Transaction,
  poolId: string,
  byAmountIn: boolean,
  coinA: any,
  coinB: any,
  amount: any,
  a2b: boolean,
  typeArguments: any,
) {
  let coinTypeA = typeArguments[0];
  let coinTypeB = typeArguments[1];

  const sqrtPriceLimit = BigInt(
    a2b ? "4295048016" : "79226673515401279992447579055"
  );

  const coinABs = txb.moveCall({
    target: `${AggregatorConfig.magmaPackageId}::router::swap`,
    arguments: [
      txb.object(AggregatorConfig.magmaConfigId),
      txb.object(poolId),
      coinA,
      coinB,
      txb.pure.bool(a2b),
      txb.pure.bool(byAmountIn),
      amount,
      txb.pure.u128(sqrtPriceLimit),
      txb.pure.bool(false),
      txb.object(AggregatorConfig.clockAddress),
    ],
    typeArguments: [coinTypeA, coinTypeB],
  });

  return coinABs;
}
