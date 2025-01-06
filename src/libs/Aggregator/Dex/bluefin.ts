import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";
import { SUI_CLOCK_OBJECT_ID, normalizeSuiAddress } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";;

export async function makeBluefinPTB(txb: Transaction, poolId: string, byAmountIn: boolean, pathTempCoin: any, amount: any, a2b: boolean, amountLimit: any, typeArguments: string[]) {
  const typeArgs = [typeArguments[1], typeArguments[0]]
  const coinA = a2b ? pathTempCoin : zeroCoin(txb, typeArgs[1])
  const coinB = a2b ? zeroCoin(txb, typeArgs[1]) : pathTempCoin
  const coinAInBalance = coinToBalance(txb, coinA, a2b ? typeArgs[0] : typeArgs[1])
  const coinBInBalance = coinToBalance(txb, coinB, a2b ? typeArgs[1] : typeArgs[0])
  const sqrtPriceLimit = BigInt(a2b ? '4295048016' : '79226673515401279992447579055');

  const args = 
    [
        txb.object(SUI_CLOCK_OBJECT_ID),
        txb.object(AggregatorConfig.bluefinGlobalConfig),
        txb.object(poolId),
        coinAInBalance,
        coinBInBalance,
        txb.pure.bool(a2b),
        txb.pure.bool(byAmountIn),
        txb.pure.u64(new BigNumber(amount).toFixed(0)),
        txb.pure.u64(new BigNumber(amountLimit).toFixed(0)),
        txb.pure.u128(sqrtPriceLimit.toString())
    ]
  const [coinAOutInBalance, coinBOutInBalance] = txb.moveCall({
    target: `${AggregatorConfig.bluefinPackageId}::pool::swap`,
    typeArguments,
    arguments: args,
  });

  return balanceToCoin(txb, coinBOutInBalance, a2b ? typeArgs[1] : typeArgs[0]);
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