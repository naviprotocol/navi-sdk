import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";

export async function makeDeepbookPTB(
  txb: Transaction,
  poolId: string,
  coinA: any,
  amountLimit: any,
  a2b: boolean,
  typeArguments: any
) {
  let baseCoin;
  let quoteCoin;

  // const deepCoin = txb.moveCall({
  //     target: '0x2::coin::zero',
  //     typeArguments: [AggregatorConfig.deepTokenAddress]
  // })

  // if (a2b) {
  //     baseCoin = coinA;
  //     quoteCoin = txb.moveCall({
  //         target: '0x2::coin::zero',
  //         typeArguments: [typeArguments[1]]
  //     })

  // }
  // else {
  //     baseCoin = txb.moveCall({
  //         target: '0x2::coin::zero',
  //         typeArguments: [typeArguments[0]]
  //     })
  //     quoteCoin = coinA;

  // }
  const func = a2b
    ? "swap_exact_base_for_quote_sponsored"
    : "swap_exact_quote_for_base_sponsored";

  const [baseCoinOut, quoteCoinOut] = txb.moveCall({
    target: `${AggregatorConfig.deepSponsoredPackageId}::sponsored_deep::${func}`,
    arguments: [
      txb.object(AggregatorConfig.deepSponsoredPoolConfig),
      txb.object(poolId),
      coinA,
      txb.pure.u64(amountLimit),
      txb.object(AggregatorConfig.clockAddress),
    ],
    typeArguments: typeArguments,
  });

  return { baseCoinOut, quoteCoinOut };
}