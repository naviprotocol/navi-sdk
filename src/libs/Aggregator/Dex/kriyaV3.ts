import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";

export async function makeKriyaV3PTB(txb: Transaction, poolId: string, byAmountIn: boolean, coinA: any, amount: any, a2b: boolean, typeArguments: any) {

  const sqrtPriceLimit = BigInt(a2b ? '4295048016' : '79226673515401279992447579055')
  const args = [
    txb.object(poolId),
    txb.pure.bool(a2b),
    txb.pure.bool(byAmountIn),
    typeof amount === 'number' ? txb.pure.u64(amount) : amount,
    txb.pure.u128(sqrtPriceLimit),
    txb.object(AggregatorConfig.clockAddress),
    txb.object(AggregatorConfig.kriyaV3Version),
  ]
  const [receive_balance_a, receive_balance_b, receipt] = txb.moveCall({
    target: `${AggregatorConfig.kriyaV3PackageId}::trade::flash_swap`,
    typeArguments: typeArguments,
    arguments: args,
  })

  if (a2b) {
    txb.moveCall({
      target: '0x2::balance::destroy_zero',
      arguments: [receive_balance_a],
      typeArguments: [typeArguments[0]]
    })

    let BalanceA = txb.moveCall({
      target: "0x2::coin::into_balance",
      arguments: [coinA],
      typeArguments: [typeArguments[0]],
    });

    const [BalanceB] = txb.moveCall({
      target: '0x2::balance::zero',
      typeArguments: [typeArguments[1]]
    })

    txb.moveCall({
      target: `${AggregatorConfig.kriyaV3PackageId}::trade::repay_flash_swap`,
      arguments: [
        txb.object(poolId),
        receipt,

        BalanceA,
        BalanceB,
        txb.object(AggregatorConfig.kriyaV3Version),
      ],
      typeArguments: typeArguments
    })

    const receiveCoin: any = txb.moveCall({
      target: `0x2::coin::from_balance`,
      arguments: [receive_balance_b],
      typeArguments: [typeArguments[1]]
    })
    return receiveCoin
  }

  txb.moveCall({
    target: '0x2::balance::destroy_zero',
    arguments: [receive_balance_b],
    typeArguments: [typeArguments[1]]
  })

  let BalanceB = txb.moveCall({
    target: "0x2::coin::into_balance",
    arguments: [coinA],
    typeArguments: [typeArguments[1]],
  });

  const [BalanceA] = txb.moveCall({
    target: '0x2::balance::zero',
    typeArguments: [typeArguments[0]]
  })

  txb.moveCall({
    target: `${AggregatorConfig.kriyaV3PackageId}::trade::repay_flash_swap`,
    arguments: [
      txb.object(poolId),
      receipt,
      BalanceA,
      BalanceB,
      txb.object(AggregatorConfig.kriyaV3Version),
    ],
    typeArguments: typeArguments
  })

  const receiveCoin: any = txb.moveCall({
    target: `0x2::coin::from_balance`,
    arguments: [receive_balance_a],
    typeArguments: [typeArguments[0]]
  })
  return receiveCoin
}



