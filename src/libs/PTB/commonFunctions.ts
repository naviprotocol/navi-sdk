import { TransactionBlock } from "@mysten/sui.js/transactions";
import { getConfig, flashloanConfig, pool } from '../../address'
import { CoinInfo, Pool, PoolConfig, OptionType } from '../../types';

/**
 * Deposits a specified amount of a coin into a pool.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the coin you own.
 * @param amount - The amount of the coin to deposit.
 * @returns The updated transaction block object.
 */
export async function depositCoin(txb: TransactionBlock, _pool: PoolConfig, coinObject: any, amount: number) {
    const config = await getConfig();

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
export async function depositCoinWithAccountCap(txb: TransactionBlock, _pool: PoolConfig, coinObject: any, account: string) {
    const config = await getConfig();

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
export async function withdrawCoin(txb: TransactionBlock, _pool: PoolConfig, amount: number) {
    const config = await getConfig();

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
export async function withdrawCoinWithAccountCap(txb: TransactionBlock, _pool: PoolConfig, account: string, withdrawAmount: number, sender: string) {
    const config = await getConfig();

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
export async function borrowCoin(txb: TransactionBlock, _pool: PoolConfig, borrowAmount: number) {
    const config = await getConfig();

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
export async function repayDebt(txb: TransactionBlock, _pool: PoolConfig, coinObject: any, repayAmount: number) {
    const config = await getConfig();

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
export async function getHealthFactor(txb: TransactionBlock, address: string) {
    const config = await getConfig();

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
export async function flashloan(txb: TransactionBlock, _pool: PoolConfig, amount: number) {
    const config = await getConfig();

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
export async function repayFlashLoan(txb: TransactionBlock, _pool: PoolConfig, receipt: any, repayCoin: any) {
    const config = await getConfig();

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
 * Liquidates a transaction block by calling the entry_liquidation function.
 * @param txb - The transaction block to be liquidated.
 * @param payCoinType - The coin type used for payment.
 * @param payCoinObj - The payment coin object.
 * @param collateralCoinType - The coin type used for collateral.
 * @param to_liquidate_address - The address to which the liquidated amount will be sent.
 * @param to_liquidate_amount - The amount to be liquidated.
 */
export async function liquidateFunction(txb: TransactionBlock, payCoinType: CoinInfo, payCoinObj: any, collateralCoinType: CoinInfo, to_liquidate_address: string, to_liquidate_amount: string) {
    const pool_to_pay: PoolConfig = pool[payCoinType.symbol as keyof Pool];
    const collateral_pool: PoolConfig = pool[collateralCoinType.symbol as keyof Pool];
    const config = await getConfig();

    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_liquidation`,
        arguments: [
            txb.object('0x06'),
            txb.object(config.PriceOracle),
            txb.object(config.StorageId),
            txb.pure(pool_to_pay.assetId),
            txb.object(pool_to_pay.poolId),
            payCoinObj,
            txb.pure(collateral_pool.assetId),
            txb.object(collateral_pool.poolId),
            txb.pure(to_liquidate_address),
            txb.pure(to_liquidate_amount),
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2),
        ],
        typeArguments: [pool_to_pay.type, collateral_pool.type],
    })
}

/**
 * Claims the reward for a transaction block.
 * @param txb - The transaction block.
 * @param incentiveFundsPool - The incentive funds pool.
 * @param assetId - The asset ID.
 * @param option - The option type.
 */
export async function claimRewardFunction(txb: TransactionBlock, incentiveFundsPool: string, assetId: string, option: OptionType) {
    const config = await getConfig();

    const ProFundsPoolInfo: any = {
        'f975bc2d4cca10e3ace8887e20afd77b46c383b4465eac694c4688344955dea4': {
          coinType: '0x2::sui::SUI',
          oracleId: 0,
        },
        'e2b5ada45273676e0da8ae10f8fe079a7cec3d0f59187d3d20b1549c275b07ea': {
          coinType: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
          oracleId: 5,
        },
        'a20e18085ce04be8aa722fbe85423f1ad6b1ae3b1be81ffac00a30f1d6d6ab51': {
          coinType: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
          oracleId: 6,
        },
        '9dae0cf104a193217904f88a48ce2cf0221e8cd9073878edd05101d6b771fa09': {
          coinType: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
          oracleId: 7,
        },
      }
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::claim_reward`,
        arguments: [
            txb.object('0x06'),
            txb.object(config.IncentiveV2),
            txb.object(`0x${incentiveFundsPool}`),
            txb.object(config.StorageId),
            txb.pure(assetId),
            txb.pure(option),
        ],
        typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
    })
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
