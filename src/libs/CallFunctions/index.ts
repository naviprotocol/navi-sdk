
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { bcs } from '@mysten/sui.js/bcs';
import { DevInspectResults, getFullnodeUrl, SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from '@mysten/sui.js/client';

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
async function moveInspectImpl(txb: TransactionBlock, client: SuiClient, sender: string, funName: string, typeName?: string) {
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
export async function moveInspect(client: SuiClient, sender: string, target: `${string}::${string}::${string}`, args: any[], typeArgs?: string[], typeName?: string) {
    const tx = new TransactionBlock();

    const args_: {
        kind: 'Input';
        index: number;
        type?: 'object' | 'pure' | undefined;
        value?: any;
    }[] = [];

    for (let arg of args) {
        args_.push(tx.pure(arg));
    }

    const funcName = target.split('::');

    tx.moveCall({
        target: target,
        arguments: args_,
        typeArguments: typeArgs,
    });
    return await moveInspectImpl(tx, client, sender, funcName.slice(1, 3).join('::'), typeName);
}