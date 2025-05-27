import { normalizeSuiObjectId } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";

export async function makeMomentumPTB(txb: Transaction, poolId: string, pathTempCoin: any, amount: any, a2b: boolean, typeArguments: string[]) {
  const LowLimitPrice = BigInt('4295048017');
  const HighLimitPrice = BigInt('79226673515401279992447579050');
  const limitSqrtPrice = a2b ? LowLimitPrice : HighLimitPrice;
  const poolObject = txb.object(poolId);

  const [receive_a, receive_b, flash_receipt] = txb.moveCall({
    target: `${AggregatorConfig.momentumPackageId}::trade::flash_swap`,
    typeArguments,
    arguments: [
      poolObject,
      txb.pure.bool(a2b),
      txb.pure.bool(true),
      amount,
      txb.pure.u128(limitSqrtPrice),
      txb.object(normalizeSuiObjectId('0x6')),
      txb.object(AggregatorConfig.momentumVersionId),
    ],
  });

  txb.moveCall({
    target: `0x2::balance::destroy_zero`,
    arguments: [a2b ? receive_a : receive_b],
    typeArguments: [a2b ? typeArguments[0] : typeArguments[1]],
  });

  const [zeroCoin] = txb.moveCall({
    target: `0x2::coin::zero`,
    arguments: [],
    typeArguments: [a2b ? typeArguments[1] : typeArguments[0]],
  });

  const [coinADebt, coinBDebt] = txb.moveCall({
    target: `${AggregatorConfig.momentumPackageId}::trade::swap_receipt_debts`,
    typeArguments: [],
    arguments: [flash_receipt],
  });

  const pay_coin_a = a2b
    ? txb.moveCall({
      target: `0x2::coin::split`,
      arguments: [pathTempCoin, coinADebt],
      typeArguments: [typeArguments[0]],
    })
    : zeroCoin;

  const pay_coin_b = a2b
    ? zeroCoin
    : txb.moveCall({
      target: `0x2::coin::split`,
      arguments: [pathTempCoin, coinBDebt],
      typeArguments: [typeArguments[1]],
    });

  const pay_coin_a_balance = txb.moveCall({
    target: `0x2::coin::into_balance`,
    typeArguments: [typeArguments[0]],
    arguments: [pay_coin_a],
  });

  const pay_coin_b_balance = txb.moveCall({
    target: `0x2::coin::into_balance`,
    typeArguments: [typeArguments[1]],
    arguments: [pay_coin_b],
  });

  txb.moveCall({
    target: `${AggregatorConfig.momentumPackageId}::trade::repay_flash_swap`,
    typeArguments,
    arguments: [
      poolObject,
      flash_receipt,
      pay_coin_a_balance,
      pay_coin_b_balance,
      txb.object(AggregatorConfig.momentumVersionId),
    ],
  });

  txb.moveCall({
    target: `${AggregatorConfig.momentumSlippageCheckPackageId}::slippage_check::assert_slippage`,
    typeArguments,
    arguments: [poolObject, txb.pure.u128(limitSqrtPrice), txb.pure.bool(a2b)],
  });

  const [outputCoin] = txb.moveCall({
    target: `0x2::coin::from_balance`,
    typeArguments: [a2b ? typeArguments[1] : typeArguments[0]],
    arguments: [a2b ? receive_b : receive_a],
  });

  return outputCoin;
}

