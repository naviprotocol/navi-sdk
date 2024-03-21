import { TransactionBlock } from "@mysten/sui.js/transactions";
import { config, flashloanConfig } from '../../address'
import { Pool, PoolConfig } from '../../types';

/**
 * Deposits a specified amount of a coin into a pool.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the coin you own.
 * @param amount - The amount of the coin to deposit.
 * @returns The updated transaction block object.
 */
export function depositCoin(txb: TransactionBlock, _pool: PoolConfig, coinObject: any, amount: number) {
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_deposit`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            txb.pure(amount), // The amount you want to deposit, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })
    return txb;
}

/**
 * Deposits a coin with account cap.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the coin you own.
 * @param account - The account to deposit the coin into.
 * @returns The updated transaction block object.
 */
export function depositCoinWithAccountCap(txb: TransactionBlock, _pool: PoolConfig, coinObject: any, account: string) {
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::deposit_with_account_cap`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
            txb.object(account)
        ],
        typeArguments: [_pool.type]
    })
    return txb;
}

/**
 * Withdraws a specified amount of coins from a pool.
 * 
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param amount - The amount of coins to withdraw.
 * @returns The updated transaction block object.
 */
export function withdrawCoin(txb: TransactionBlock, _pool: PoolConfig, amount: number) {

    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_withdraw`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure(_pool.assetId), // the id of the asset in the protocol
            txb.pure(amount), // The amount you want to withdraw, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })
    return txb;

}

/**
 * Withdraws a specified amount of coins from an account with an account cap.
 * @param txb - The TransactionBlock object.
 * @param _pool - The PoolConfig object.
 * @param account - The account from which to withdraw the coins.
 * @param withdrawAmount - The amount of coins to withdraw.
 * @param sender - The sender of the transaction.
 */
export function withdrawCoinWithAccountCap(txb: TransactionBlock, _pool: PoolConfig, account: string, withdrawAmount: number, sender: string) {

    const [ret] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::withdraw_with_account_cap`,
        arguments: [
            txb.sharedObjectRef({
                objectId: '0x06',
                initialSharedVersion: 1,
                mutable: false,
              }), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure(_pool.assetId), // the id of the asset in the protocol
            txb.pure(withdrawAmount), // The amount you want to withdraw, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
            txb.object(account)
        ],
        typeArguments: [_pool.type]
    });

    // const [ret] = txb.moveCall({ target: `${config.ProtocolPackage}::lending::create_account` });
    txb.transferObjects([ret], sender);
}

/**
 * Borrows a specified amount of coins from a pool.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param borrowAmount - The amount of coins to borrow.
 * @returns The updated transaction block object.
 */
export function borrowCoin(txb: TransactionBlock, _pool: PoolConfig, borrowAmount: number) {
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_borrow`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure(_pool.assetId), // the id of the asset in the protocol
            txb.pure(borrowAmount), // The amount you want to borrow, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })
    return txb;

}

/**
 * Repays a debt in the protocol.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the Coin you own.
 * @param repayAmount - The amount you want to repay.
 * @returns The updated transaction block object.
 */
export function repayDebt(txb: TransactionBlock, _pool: PoolConfig, coinObject: any, repayAmount: number) {
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_repay`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            txb.pure(repayAmount), // The amount you want to borrow, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })
    return txb;

}

/**
 * Retrieves the health factor for a given address.
 * @param txb - The TransactionBlock object.
 * @param address - The address for which to retrieve the health factor.
 * @returns The health factor balance.
 */
export function getHealthFactor(txb: TransactionBlock, address: string) {
    const balance = txb.moveCall({
        target: `${config.ProtocolPackage}::logic::user_health_factor`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(config.PriceOracle), // Object id of Price Oracle
            txb.pure(address)
        ],
        
    })

    return balance;
}

/**
 * Merges multiple coins into a single coin object.
 * 
 * @param txb - The transaction block object.
 * @param coinInfo - The coin information object.
 * @returns The merged coin object.
 */
export function mergeCoins(txb: TransactionBlock, coinInfo: any) {
    if (coinInfo.data.length >= 2) {
        let baseObj = coinInfo.data[0].coinObjectId;
        let i = 1;
        while (i < coinInfo.data.length) {
            txb.mergeCoins(baseObj, [coinInfo.data[i].coinObjectId]);
            i++;
        }
    }
    
    let mergedCoinObject = txb.object(coinInfo.data[0].coinObjectId);
    return mergedCoinObject;
}


/**
 * Executes a flash loan transaction.
 * @param txb - The TransactionBlock object.
 * @param _pool - The PoolConfig object representing the pool.
 * @param amount - The amount of the flash loan.
 * @returns An array containing the balance and receipt of the flash loan transaction.
 */
export function flashloan(txb: TransactionBlock, _pool: PoolConfig, amount: number) {
    const [balance, receipt] = txb.moveCall({
        target: `${config.ProtocolPackage}::lending::flash_loan_with_ctx`,
        arguments: [
            txb.object(flashloanConfig.id), // clock object id
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure(amount), // the id of the asset in the protocol
        ],
        typeArguments: [_pool.type]
    })
    return [balance, receipt];
}

/**
 * Repays a flash loan by calling the flash_repay_with_ctx function in the lending protocol.
 * 
 * @param txb - The TransactionBlock object.
 * @param _pool - The PoolConfig object representing the pool.
 * @param receipt - The receipt object.
 * @param repayCoin - The asset ID of the asset to be repaid.
 * @returns The balance after the flash loan is repaid.
 */
export function repayFlashLoan(txb: TransactionBlock, _pool: PoolConfig, receipt: any, repayCoin: any) {
    const [balance] = txb.moveCall({
        target: `${config.ProtocolPackage}::lending::flash_repay_with_ctx`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId),
            txb.object(_pool.poolId), // pool id of the asset
            receipt,
            repayCoin, // the id of the asset in the protocol
        ],
        typeArguments: [_pool.type]
    })
    return [balance];
}

/**
 * Signs and submits a transaction block using the provided client and keypair.
 * @param txb - The transaction block to sign and submit.
 * @param client - The client object used to sign and execute the transaction block.
 * @param keypair - The keypair used as the signer for the transaction block.
 * @returns A promise that resolves to the result of signing and executing the transaction block.
 */
export async function SignAndSubmitTXB(txb: TransactionBlock, client: any, keypair: any) {
    const result = await client.signAndExecuteTransactionBlock({
        transactionBlock: txb,
        signer: keypair,
        requestType: 'WaitForLocalExecution',
        options: {
            showEffects: true
        }
    })
    return result;
}
