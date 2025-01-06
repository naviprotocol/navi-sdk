import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";
import { SUI_CLOCK_OBJECT_ID, normalizeSuiAddress } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";;

export async function makeBluefinPTB(txb: Transaction, poolId: string, pathTempCoin: any, amount: any, a2b: boolean, amountLimit: any, typeArguments: string[]) {
  const coinA = a2b ? pathTempCoin : zeroCoin(txb, typeArguments[0])
  const coinB = a2b ? zeroCoin(txb, typeArguments[1]) : pathTempCoin
  const coinAInBalance = coinToBalance(txb, coinA, typeArguments[0])
  const coinBInBalance = coinToBalance(txb, coinB, typeArguments[1])
  const sqrtPriceLimit = BigInt(a2b ? '4295048016' : '79226673515401279992447579054');

  const args =
    [
      txb.object(SUI_CLOCK_OBJECT_ID),
      txb.object(AggregatorConfig.bluefinGlobalConfig),
      txb.object(poolId),
      coinAInBalance,
      coinBInBalance,
      txb.pure.bool(a2b),
      txb.pure.bool(true),
      txb.pure.u64(new BigNumber(amount).toFixed(0)),
      txb.pure.u64(new BigNumber(amountLimit).toFixed(0)),
      txb.pure.u128(sqrtPriceLimit.toString())
    ]
  const [coinAOutInBalance, coinBOutInBalance] = txb.moveCall({
    target: `${AggregatorConfig.bluefinPackageId}::pool::swap`,
    typeArguments: typeArguments,
    arguments: args,
  });

  const coinAOut = balanceToCoin(txb, coinAOutInBalance, typeArguments[0]);
  const coinBOut = balanceToCoin(txb, coinBOutInBalance, typeArguments[1]);

  return {
    coinAOut,
    coinBOut
  }
}

const zeroCoin = (txb: Transaction, coinType: string) => {
  return txb.moveCall({
    target: "0x2::coin::zero",
    typeArguments: [coinType]
  });
}

function coinToBalance(txb: Transaction, coin: any, coinType: string) {
  return txb.moveCall({
    target: "0x2::coin::into_balance",
    arguments: [coin],
    typeArguments: [coinType],
  });
}

function balanceToCoin(txb: Transaction, coin: any, coinType: string) {
  return txb.moveCall({
    target: `0x2::coin::from_balance`,
    arguments: [coin],
    typeArguments: [coinType]
  });
}