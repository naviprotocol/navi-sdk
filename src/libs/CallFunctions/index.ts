
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui.js/bcs';
import { DevInspectResults, SuiClient } from '@mysten/sui/client';
import { getConfig, pool } from '../../address';
import { Pool, PoolConfig } from '../../types';

/**
 * Parses and prints the inspection results.
 * @param data - The inspection results to be parsed and printed.
 * @param funName - The name of the function being inspected.
 * @param parseType - The type of parsing to be applied (optional).
 * @returns An array of parsed values.
 */
function inspectResultParseAndPrint(data: DevInspectResults, funName: string, parseType?: string) {
    if (data.results && data.results.length > 0) {
        if (data.results[0].returnValues && data.results[0].returnValues.length > 0) {
            let values: any[] = [];
            for (let v of data.results[0].returnValues) {
                const _type = parseType ? parseType : v[1];
                let result = bcs.de(_type, Uint8Array.from(v[0]));
                values.push(result);
            }
            return values;
        }
    } else if (data.error) {
        console.log(`Get an error, msg: ${data.error}`);
    }
}

/**
 * Executes the specified function on the provided transaction block and prints the inspection result.
 * @param txb - The transaction block to execute the function on.
 * @param client - The SuiClient instance.
 * @param sender - The sender of the transaction block.
 * @param funName - The name of the function to execute.
 * @param typeName - Optional. The type name associated with the function.
 * @returns A promise that resolves to the inspection result.
 */
async function moveInspectImpl(txb: Transaction, client: SuiClient, sender: string, funName: string, typeName?: string) {
    const result = await client.devInspectTransactionBlock({
        transactionBlock: txb,
        sender: sender,
    });
    return inspectResultParseAndPrint(result, funName, typeName);
}

/**
 * Moves and inspects a function call.
 * @param client - The SuiClient object.
 * @param sender - The sender of the function call.
 * @param target - The target of the function call in the format `${string}::${string}::${string}`.
 * @param args - The arguments for the function call.
 * @param typeArgs - Optional type arguments for the function call.
 * @param typeName - Optional type name for the function call.
 * @returns A Promise that resolves to the result of the move and inspect operation.
 */
export async function moveInspect(tx: Transaction, client: SuiClient, sender: string, target: `${string}::${string}::${string}`, args: any[], typeArgs?: string[], typeName?: string) {

    const funcName = target.split('::');

    tx.moveCall({
        target: target,
        arguments: args,
        typeArguments: typeArgs,
    });
    return await moveInspectImpl(tx, client, sender, funcName.slice(1, 3).join('::'), typeName);
}

/**
 * Retrieves the detailed information of a reserve based on the provided asset ID.
 * @param assetId - The ID of the asset for which to retrieve the reserve details.
 * @returns A Promise that resolves to the parsed result of the reserve details.
 */
export async function getReservesDetail(assetId: number, client: SuiClient) {
    const config = await getConfig();
    const result = await client.getDynamicFieldObject({ parentId: config.ReserveParentId, name: { type: 'u8', value: assetId } });
    return result;
}

export async function getAddressPortfolio(address: string, prettyPrint: boolean = true, client: SuiClient) {
    const balanceMap = new Map<string, { borrowBalance: number, supplyBalance: number }>();

    await Promise.all(Object.keys(pool).map(async (poolKey) => {
        const reserve: PoolConfig = pool[poolKey as keyof Pool];
        const borrowBalance: any = await client.getDynamicFieldObject({ parentId: reserve.borrowBalanceParentId, name: { type: 'address', value: address } });
        const supplyBalance: any = await client.getDynamicFieldObject({ parentId: reserve.supplyBalanceParentId, name: { type: 'address', value: address } });

        const borrowIndexData: any = await getReservesDetail(reserve.assetId, client);
        const borrowIndex = borrowIndexData.data?.content?.fields?.value?.fields?.current_borrow_index / Math.pow(10, 27);
        const supplyIndex = borrowIndexData.data?.content?.fields?.value?.fields?.current_supply_index / Math.pow(10, 27);

        let borrowValue = borrowBalance && borrowBalance.data?.content?.fields.value !== undefined ? borrowBalance.data?.content?.fields.value / Math.pow(10, 9) : 0;
        let supplyValue = supplyBalance && supplyBalance.data?.content?.fields.value !== undefined ? supplyBalance.data?.content?.fields.value / Math.pow(10, 9) : 0;
        borrowValue *= borrowIndex;
        supplyValue *= supplyIndex;

        if (prettyPrint) {
            console.log(`| ${reserve.name} | ${borrowValue} | ${supplyValue} |`);
        }
        balanceMap.set(reserve.name, { borrowBalance: borrowValue, supplyBalance: supplyValue });
    }));

    return balanceMap;
}
