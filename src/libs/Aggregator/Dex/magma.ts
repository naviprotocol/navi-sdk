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
  amountLimit: number
) {
  let coinTypeA = typeArguments[0];
  let coinTypeB = typeArguments[1];

  const sqrtPriceLimit = BigInt(
    a2b ? "4295048016" : "79226673515401279992447579055"
  );

  const moduleName = a2b ? 'swap_a2b' : 'swap_b2a';

  const coinABs = txb.moveCall({
    target: `${AggregatorConfig.magmaPackageId}::pool_script_v2::${moduleName}`,
    arguments: [
      txb.object(AggregatorConfig.magmaConfigId),
      txb.object(poolId),
      coinA,
      coinB,
      txb.pure.bool(byAmountIn),
      amount,
      txb.pure.u64(amountLimit),
      txb.pure.u128(sqrtPriceLimit),
      txb.pure.bool(false),
      txb.object(AggregatorConfig.clockAddress),
    ],
    typeArguments: [coinTypeA, coinTypeB],
  });

  return coinABs;
}
