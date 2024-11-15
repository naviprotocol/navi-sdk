import { Transaction } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";

export const MAX_TICK_INDEX = 443636;
export const MIN_TICK_INDEX = -443636;
export const MAX_TICK_INDEX_X64 = '79226673515401279992447579055';
export const MIN_TICK_INDEX_X64 = '4295048016';


export async function makeTurbosPTB(txb: Transaction, poolId: string, byAmountIn: boolean, coinA: any, amount_in: any, a2b: boolean, typeArguments: any, userAddress: string, contractVersionId: string) {

    const ONE_MINUTE = 60 * 1000;

    const [turbosCoinB, turbosCoinA] = txb.moveCall({
        target: `${AggregatorConfig.turbosPackageId}::swap_router::swap_${a2b ? 'a_b' : 'b_a'}_with_return_`,
        arguments: [
            txb.object(poolId),
            coinA,
            amount_in,
            txb.pure.u64(0),
            txb.pure.u128(
                a2b ? MIN_TICK_INDEX_X64 : MAX_TICK_INDEX_X64
            ),
            txb.pure.bool(byAmountIn),
            txb.pure.address(userAddress),
            txb.pure.u64(Date.now() + ONE_MINUTE * 3),
            txb.object(AggregatorConfig.clockAddress),
            txb.object(contractVersionId),
        ],
        typeArguments: typeArguments
    })
    return { turbosCoinB, turbosCoinA }
}