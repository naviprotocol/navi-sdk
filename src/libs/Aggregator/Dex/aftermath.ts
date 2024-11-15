import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";

export async function makeAftermathPTB(txb: Transaction, poolId: string, coinA: any, amountOut: any, a2b: boolean, typeArguments: any) {

    const args = [
        txb.object(poolId),
        txb.object(AggregatorConfig.aftermathPoolRegistry),
        txb.object(AggregatorConfig.aftermathFeeVault),
        txb.object(AggregatorConfig.aftermathTreasury),
        txb.object(AggregatorConfig.aftermathInsuranceFund),
        txb.object(AggregatorConfig.aftermathReferralVault),
        coinA,
        txb.pure.u64(amountOut),
        txb.pure.u64('800000000000000000'), // 80%， use https://suivision.xyz/txblock/AvASModFbU6Bmu6FNghqBsVqktnhB9QZKQjdYfnuxNvo?tab=Overview as an reference
    ]

    const res = txb.moveCall({
        target: `${AggregatorConfig.aftermathPackageId}::swap::swap_exact_in`,
        typeArguments: typeArguments,
        arguments: args,
    })

    return res
}