import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";

export async function makeKriyaV2PTB(txb: Transaction, poolId: string, byAmountIn: boolean, coinA: any, amount: any, a2b: boolean, typeArguments: any) {

    const func = a2b ? 'swap_token_x' : 'swap_token_y';

    const args = [
        txb.object(poolId),
        coinA,
        typeof amount === 'number' ? txb.pure.u64(amount) : amount,
        txb.pure.u64(0),
      ]

      const [coinB] = txb.moveCall({
        target: `${AggregatorConfig.kriyaV2PackageId}::spot_dex::${func}`,
        typeArguments: typeArguments,
        arguments: args,
    })

    return coinB
}