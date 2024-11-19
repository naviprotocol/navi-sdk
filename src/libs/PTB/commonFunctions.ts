import { Transaction } from "@mysten/sui/transactions";
import { getConfig, flashloanConfig, pool, vSuiConfig, PriceFeedConfig, OracleProConfig, IPriceFeed, AddressMap } from '../../address'
import { CoinInfo, Pool, PoolConfig, OptionType } from '../../types';
import { bcs } from '@mysten/sui.js/bcs';
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { moveInspect } from "../CallFunctions";
import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js'

interface Reward {
    asset_id: string;
    funds: string;
    available: string;
}

/**
 * Deposits a specified amount of a coin into a pool.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the coin you own.
 * @param amount - The amount of the coin to deposit.
 * @returns The updated transaction block object.
 */
export async function depositCoin(txb: Transaction, _pool: PoolConfig, coinObject: any, amount: any) {
    const config = await getConfig();

    let amountObj;
    if (typeof amount === 'number') {
        amountObj = txb.pure.u64(amount);
    }
    else {
        amountObj = amount;
    }
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_deposit`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            amountObj, // The amount you want to deposit, decimals must be carried, like 1 sui => 1000000000
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
export async function depositCoinWithAccountCap(txb: Transaction, _pool: PoolConfig, coinObject: any, account: string) {
    const config = await getConfig();

    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::deposit_with_account_cap`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
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
export async function withdrawCoin(txb: Transaction, _pool: PoolConfig, amount: number) {
    const config = await getConfig();

    const [ret] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::withdraw`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            txb.pure.u64(amount), // The amount you want to withdraw, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })

    //Transfer withdraw
    const [coin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [ret],
        typeArguments: [_pool.type]
    });

    return [coin];
}

/**
 * Withdraws a specified amount of coins from an account with an account cap.
 * @param txb - The Transaction object.
 * @param _pool - The PoolConfig object.
 * @param account - The account from which to withdraw the coins.
 * @param withdrawAmount - The amount of coins to withdraw.
 * @param sender - The sender of the transaction.
 */
export async function withdrawCoinWithAccountCap(txb: Transaction, _pool: PoolConfig, account: string, withdrawAmount: number, sender: string) {
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
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            txb.pure.u64(withdrawAmount), // The amount you want to withdraw, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
            txb.object(account)
        ],
        typeArguments: [_pool.type]
    });

    // const [ret] = txb.moveCall({ target: `${config.ProtocolPackage}::lending::create_account` });
    const [coin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [txb.object(ret)],
        typeArguments: [_pool.type]
    });

    return [coin];
}

/**
 * Borrows a specified amount of coins from a pool.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param borrowAmount - The amount of coins to borrow.
 * @returns The updated transaction block object.
 */
export async function borrowCoin(txb: Transaction, _pool: PoolConfig, borrowAmount: number) {
    const config = await getConfig();

    const [ret] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::borrow`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            txb.pure.u64(borrowAmount), // The amount you want to borrow, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })

    const [coin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [txb.object(ret)],
        typeArguments: [_pool.type]
    });

    return [coin];

}

/**
 * Repays a debt in the protocol.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the Coin you own.
 * @param repayAmount - The amount you want to repay.
 * @returns The updated transaction block object.
 */
export async function repayDebt(txb: Transaction, _pool: PoolConfig, coinObject: any, repayAmount: number) {
    const config = await getConfig();

    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_repay`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            txb.pure.u64(repayAmount), // The amount you want to borrow, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })
    return txb;

}

/**
 * Retrieves the health factor for a given address.
 * @param txb - The Transaction object.
 * @param address - The address for which to retrieve the health factor.
 * @returns The health factor balance.
 */
export async function getHealthFactor(txb: Transaction, address: string) {
    const config = await getConfig();

    const balance = txb.moveCall({
        target: `${config.ProtocolPackage}::logic::user_health_factor`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(config.PriceOracle), // Object id of Price Oracle
            txb.pure.address(address)
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
export function returnMergedCoins(txb: Transaction, coinInfo: any) {

    if (coinInfo.data.length >= 2) {
        let baseObj = coinInfo.data[0].coinObjectId;
        let all_list = coinInfo.data.slice(1).map((coin: any) => coin.coinObjectId);

        txb.mergeCoins(baseObj, all_list);
    }

    let mergedCoinObject = txb.object(coinInfo.data[0].coinObjectId);
    return mergedCoinObject;
}


/**
 * Executes a flash loan transaction.
 * @param txb - The Transaction object.
 * @param _pool - The PoolConfig object representing the pool.
 * @param amount - The amount of the flash loan.
 * @returns An array containing the balance and receipt of the flash loan transaction.
 */
export async function flashloan(txb: Transaction, _pool: PoolConfig, amount: number) {
    const config = await getConfig();

    const [balance, receipt] = txb.moveCall({
        target: `${config.ProtocolPackage}::lending::flash_loan_with_ctx`,
        arguments: [
            txb.object(flashloanConfig.id), // clock object id
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u64(amount), // the id of the asset in the protocol
        ],
        typeArguments: [_pool.type]
    })
    return [balance, receipt];
}

/**
 * Repays a flash loan by calling the flash_repay_with_ctx function in the lending protocol.
 * 
 * @param txb - The Transaction object.
 * @param _pool - The PoolConfig object representing the pool.
 * @param receipt - The receipt object.
 * @param repayCoin - The asset ID of the asset to be repaid.
 * @returns The balance after the flash loan is repaid.
 */
export async function repayFlashLoan(txb: Transaction, _pool: PoolConfig, receipt: any, repayCoin: any) {
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
 * Liquidates a transaction block.
 * @param txb - The transaction block to be liquidated.
 * @param payCoinType - The type of coin to be paid.
 * @param payCoinObj - The payment coin object.
 * @param collateralCoinType - The type of collateral coin.
 * @param to_liquidate_address - The address to which the liquidated amount will be sent.
 * @param to_liquidate_amount - The amount to be liquidated.
 * @returns An array containing the collateral coin and the remaining debt coin.
 */
export async function liquidateFunction(txb: Transaction, payCoinType: CoinInfo, payCoinObj: any, collateralCoinType: CoinInfo, to_liquidate_address: string, to_liquidate_amount: string) {
    const pool_to_pay: PoolConfig = pool[payCoinType.symbol as keyof Pool];
    const collateral_pool: PoolConfig = pool[collateralCoinType.symbol as keyof Pool];
    const config = await getConfig();

    const [collateralBalance, remainDebtBalance] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::liquidation`,
        arguments: [
            txb.object('0x06'),
            txb.object(config.PriceOracle),
            txb.object(config.StorageId),
            txb.pure.u8(pool_to_pay.assetId),
            txb.object(pool_to_pay.poolId),
            payCoinObj,
            txb.pure.u8(collateral_pool.assetId),
            txb.object(collateral_pool.poolId),
            txb.pure.address(to_liquidate_address),
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2),
        ],
        typeArguments: [pool_to_pay.type, collateral_pool.type],
    })

    return [collateralBalance, remainDebtBalance];
}

/**
 * Claims the reward for a transaction block.
 * @param txb - The transaction block.
 * @param incentiveFundsPool - The incentive funds pool.
 * @param assetId - The asset ID.
 * @param option - The option type.
 */
export async function claimRewardFunction(txb: Transaction, incentiveFundsPool: string, assetId: string, option: OptionType) {
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
            txb.pure.u8(Number(assetId)),
            txb.pure.u8(option),
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
export async function SignAndSubmitTXB(txb: Transaction, client: any, keypair: any) {
    const result = await client.signAndExecuteTransaction({
        transaction: txb,
        signer: keypair,
        requestType: 'WaitForLocalExecution',
        options: {
            showEffects: true
        }
    })
    return result;
}


/**
 * Stakes a given SUI coin object to the vSUI pool.
 * @param txb The transaction block object.
 * @param suiCoinObj The SUI coin object to be staked.
 * @returns vSui coin object.
 */
export async function stakeTovSuiPTB(txb: Transaction, suiCoinObj: any) {

    const [coin] = txb.moveCall({
        target: `${vSuiConfig.ProtocolPackage}::native_pool::stake_non_entry`,
        arguments: [
            txb.object(vSuiConfig.pool),
            txb.object(vSuiConfig.metadata),
            txb.object(vSuiConfig.wrapper),
            suiCoinObj,
        ],
        typeArguments: [],
    })
    return coin;
}

/**
 * Unstakes TOV SUI coins.
 * @param txb - The transaction block object.
 * @param vSuiCoinObj - The vSui coin object.
 * @returns The unstaked Sui coin.
 */
export async function unstakeTovSui(txb: Transaction, vSuiCoinObj: any) {

    const [coin] = txb.moveCall({
        target: `${vSuiConfig.ProtocolPackage}::native_pool::unstake`,
        arguments: [
            txb.object(vSuiConfig.pool),
            txb.object(vSuiConfig.metadata),
            txb.object(vSuiConfig.wrapper),
            vSuiCoinObj,
        ],
        typeArguments: [],
    })
    return coin;
}

/**
 * Retrieves the incentive pools for a given asset and option.
 * @param assetId - The ID of the asset.
 * @param option - The option type.
 * @param user - (Optional) The user's address. If provided, the rewards claimed by the user and the total rewards will be returned.
 * @returns The incentive pools information.
 */
export async function getIncentivePools(client: SuiClient, assetId: number, option: OptionType, user: string) {
    const config = await getConfig();
    const tx = new Transaction();
    const result: any = await moveInspect(
        tx,
        client,
        user,
        `${config.uiGetter}::incentive_getter::get_incentive_pools`,
        [
            tx.object('0x06'), // clock object id
            tx.object(config.IncentiveV2), // the incentive object v2
            tx.object(config.StorageId), // object id of storage
            tx.pure.u8(assetId),
            tx.pure.u8(option),
            tx.pure.address(user), // If you provide your address, the rewards that have been claimed by your address and the total rewards will be returned.
        ],
        [], // type arguments is null
        'vector<IncentivePoolInfo>' // parse type
    );
    return result[0];
}

/**
 * Retrieves the available rewards for a given address.
 * 
 * @param checkAddress - The address to check for rewards. Defaults to the current address.
 * @param option - The option type. Defaults to 1.
 * @param prettyPrint - Whether to print the rewards in a pretty format. Defaults to true.
 * @returns An object containing the summed rewards for each asset.
 * @throws If there is an error retrieving the available rewards.
 */
export async function getAvailableRewards(client: SuiClient, checkAddress: string, option: OptionType = 1, prettyPrint = true) {

    registerStructs();
    const assetIds = Array.from({ length: Number(Object.keys(pool).length) }, (_, i) => i);
    try {
        const allResults = await Promise.all(
            assetIds.map(assetId => getIncentivePools(client, assetId, option, checkAddress))
        );

        const allPools = allResults.flat();
        const activePools = allPools.filter(pool => pool.available.trim() != '0');
        const summedRewards = activePools.reduce((acc, pool) => {
            let assetId = pool.asset_id.toString();
            if (assetId == '0' && pool.funds == '9dae0cf104a193217904f88a48ce2cf0221e8cd9073878edd05101d6b771fa09') {
                assetId = '0extra' //Means Sui Rewards
            }
            if (assetId == '5' && pool.funds == '9dae0cf104a193217904f88a48ce2cf0221e8cd9073878edd05101d6b771fa09') {
                assetId = '5extra' //Means NAVX Rewards
            }
            if (assetId == '10' && pool.funds == '9dae0cf104a193217904f88a48ce2cf0221e8cd9073878edd05101d6b771fa09') {
                assetId = '10extra' //Means NAVX Rewards
            }
            if (assetId == '13' && pool.funds == 'bc14736bbe4ac59a4e3af6835a98765c15c5f7dbf9e7ba9b36679ce7ff00dc19') {
                assetId = '13extra' //Means NS Rewards
            }
            const availableDecimal = (BigInt(pool.available) / BigInt(10 ** 27)).toString();
            
            let availableFixed = (Number(availableDecimal) / 10 ** 9).toFixed(5); // Adjust for 5 decimal places
            if (assetId == '13extra') {
                availableFixed = (Number(availableDecimal) / 10 ** 6).toFixed(5); // Adjust for 5 decimal places
            }
            if (!acc[assetId]) {

                acc[assetId] = { asset_id: assetId, funds: pool.funds, available: availableFixed };
                if (assetId == '0extra') {
                    acc[assetId] = { asset_id: '0', funds: pool.funds, available: availableFixed };
                }
                if (assetId == '5extra') {
                    acc[assetId] = { asset_id: '5', funds: pool.funds, available: availableFixed };
                }
                if (assetId == '10extra') {
                    acc[assetId] = { asset_id: '10', funds: pool.funds, available: availableFixed };
                }
                if (assetId == '13extra') {
                    acc[assetId] = { asset_id: '13', funds: pool.funds, available: availableFixed };
                }
            } else {
                acc[assetId].available = (parseFloat(acc[assetId].available) + parseFloat(availableFixed)).toFixed(5);
            }

            return acc;
        }, {} as { [key: string]: { asset_id: string, funds: string, available: string } });

        if (prettyPrint) {
            const coinDictionary: { [key: string]: string } = {
                '0': 'Sui',
                '0extra': 'Sui',
                '1': 'wUSDC',
                '2': 'USDT',
                '3': 'WETH',
                '4': 'CETUS',
                '5': 'vSui',
                '5extra': 'vSui',
                '6': 'haSui',
                '7': 'NAVX',
                '8': 'WBTC',
                '9': 'AUSD',
                '10': 'nUSDC',
                '10extra': 'nUSDC',
                '11': 'ETH',
                '12': 'USDY',
                '13': 'NS',
                '13extra': 'NS'
            };
            console.log(checkAddress, ' available rewards:');
            Object.keys(summedRewards).forEach(key => {
                if (key == '0extra' || key == '5extra' || key == '10extra' || key == '13extra' || key == '7') {
                    console.log(`${coinDictionary[key]}: ${summedRewards[key].available} NAVX`);
                } else if (key == '13extra') {
                    console.log(`${coinDictionary[key]}: ${summedRewards[key].available} NS`);
                } else {
                    console.log(`${coinDictionary[key]}: ${summedRewards[key].available} vSui`);
                }
            });
        }

        return summedRewards;
    } catch (error) {
        console.error('Failed to get available rewards:', error);
        throw error;
    }
}

/**
   * Claims all available rewards for the specified account.
   * @returns PTB result
   */
export async function claimAllRewardsPTB(client: SuiClient, userToCheck: string, tx?: Transaction) {
    let txb = tx || new Transaction();

    const rewardsSupply: { [key: string]: Reward } = await getAvailableRewards(client, userToCheck, 1, false);
    // Convert the rewards object to an array of its values
    const rewardsArray: Reward[] = Object.values(rewardsSupply);
    for (const reward of rewardsArray) {
        await claimRewardFunction(txb, reward.funds, reward.asset_id, 1);
    }

    const rewardsBorrow: { [key: string]: Reward } = await getAvailableRewards(client, userToCheck, 3, false);
    // Convert the rewards object to an array of its values
    const rewardsBorrowArray: Reward[] = Object.values(rewardsBorrow);
    for (const reward of rewardsBorrowArray) {
        await claimRewardFunction(txb, reward.funds, reward.asset_id, 3);
    }

    return txb;
}


/**
 * Represents a connection to the SuiPriceService.
 * 
 * @remarks
 * This connection is used to communicate with the SuiPriceService API.
 * 
 * @param url - The URL of the SuiPriceService API.
 * @param options - Optional configuration options for the connection.
 * @returns A new instance of the SuiPriceServiceConnection.
 */
const suiPythConnection = new SuiPriceServiceConnection('https://hermes.pyth.network', { timeout: 20000 })

/**
 * Retrieves the stale price feed IDs from the given array of price IDs.
 * 
 * @param priceIds - An array of price IDs.
 * @returns A promise that resolves to an array of stale price feed IDs.
 * @throws If there is an error while retrieving the stale price feed IDs.
 */
async function getPythStalePriceFeedId(priceIds: string[]): Promise<string[]> {
    try {
        const returnData: string[] = []
        const latestPriceFeeds = await suiPythConnection.getLatestPriceFeeds(priceIds)
        if (!latestPriceFeeds) return returnData

        const currentTimestamp = Math.floor(new Date().valueOf() / 1000)
        for (const priceFeed of latestPriceFeeds) {
            const uncheckedPrice = priceFeed.getPriceUnchecked()
            if (uncheckedPrice.publishTime > currentTimestamp) {
                console.warn(
                    `pyth price feed is invalid, id: ${priceFeed.id}, publish time: ${uncheckedPrice.publishTime}, current timestamp: ${currentTimestamp}`,
                )
                continue
            }

            // From pyth state is 60, but setting it to 30 makes more sense.
            if (currentTimestamp - priceFeed.getPriceUnchecked().publishTime > 30) {
                console.info(
                    `stale price feed, id: ${priceFeed.id}, publish time: ${uncheckedPrice.publishTime}, current timestamp: ${currentTimestamp}`,
                )
                returnData.push(priceFeed.id)
            }
        }
        return returnData
    } catch (error) {
        throw new Error(`failed to get pyth stale price feed id, msg: ${(error as Error).message}`)
    }
}

/**
 * Updates the single price in the transaction.
 * 
 * @param txb - The transaction object.
 * @param input - The input object containing the feedId and pythPriceInfoObject.
 */
function updateSinglePrice(txb: Transaction, input: Pick<IPriceFeed, 'feedId' | 'pythPriceInfoObject'>) {
    txb.moveCall({
        target: `${OracleProConfig.PackageId}::oracle_pro::update_single_price`,
        arguments: [
            txb.object('0x6'),
            txb.object(OracleProConfig.OracleConfig),
            txb.object(OracleProConfig.PriceOracle),
            txb.object(OracleProConfig.SupraOracleHolder),
            txb.object(input.pythPriceInfoObject),
            txb.pure.address(input.feedId),
        ],
    })
}

/**
 * Updates the Pyth price feeds.
 * 
 * @param client - The SuiClient object.
 * @param txb - The Transaction object.
 * @param priceFeedIds - An array of price feed IDs.
 * @returns A Promise that resolves to the result of updating the price feeds.
 * @throws If there is an error updating the price feeds.
 */
async function updatePythPriceFeeds(client: SuiClient, txb: Transaction, priceFeedIds: string[]) {
    try {
        const priceUpdateData = await suiPythConnection.getPriceFeedsUpdateData(priceFeedIds)
        const suiPythClient = new SuiPythClient(client as any, OracleProConfig.PythStateId, OracleProConfig.WormholeStateId)

        return await suiPythClient.updatePriceFeeds(txb as any, priceUpdateData, priceFeedIds)
    } catch (error) {
        throw new Error(`failed to update pyth price feeds, msg: ${(error as Error).message}`)
    }
}

/**
 * Updates the price of the given transaction using the provided client.
 * 
 * @param client - The SuiClient used to update the price.
 * @param txb - The Transaction to update the price for.
 * @returns A Promise that resolves once the price has been updated.
 */
export async function updateOraclePTB(client: SuiClient, txb: Transaction) {
    const pythPriceFeedIds = Object.keys(PriceFeedConfig).map((key) => PriceFeedConfig[key].pythPriceFeedId)
    const stalePriceFeedIds = await getPythStalePriceFeedId(pythPriceFeedIds)
    if (stalePriceFeedIds.length > 0) {
        await updatePythPriceFeeds(client, txb, stalePriceFeedIds)
        console.info(`request update pyth price feed, ids: ${stalePriceFeedIds}`)
    }
    updateSinglePrice(txb, PriceFeedConfig.SUI)
    updateSinglePrice(txb, PriceFeedConfig.wUSDC)
    updateSinglePrice(txb, PriceFeedConfig.USDT)
    updateSinglePrice(txb, PriceFeedConfig.WETH)
    updateSinglePrice(txb, PriceFeedConfig.CETUS)
    updateSinglePrice(txb, PriceFeedConfig.CERT)
    updateSinglePrice(txb, PriceFeedConfig.HASUI)
    updateSinglePrice(txb, PriceFeedConfig.NAVX)
    updateSinglePrice(txb, PriceFeedConfig.WBTC)
    updateSinglePrice(txb, PriceFeedConfig.AUSD)
    updateSinglePrice(txb, PriceFeedConfig.NUSDC)
    updateSinglePrice(txb, PriceFeedConfig.ETH)
    updateSinglePrice(txb, PriceFeedConfig.USDY)
    updateSinglePrice(txb, PriceFeedConfig.NS)
    updateSinglePrice(txb, PriceFeedConfig.LorenzoBTC)
}



/**
 * Registers the required struct types for the PTB common functions.
 */
export function registerStructs() {
    /**
     * Represents the information about the APY (Annual Percentage Yield) for an incentive.
     * @typedef {Object} IncentiveAPYInfo
     * @property {string} asset_id - The ID of the asset.
     * @property {string} apy - The APY value.
     * @property {string[]} coin_types - The types of coins.
     */

    bcs.registerStructType('IncentiveAPYInfo', {
        asset_id: 'u8',
        apy: 'u256',
        coin_types: 'vector<string>',
    });

    /**
     * Represents the information about an incentive pool.
     * @typedef {Object} IncentivePoolInfo
     * @property {string} pool_id - The ID of the pool.
     * @property {string} funds - The funds available in the pool.
     * @property {number} phase - The phase of the pool.
     * @property {number} start_at - The start time of the pool.
     * @property {number} end_at - The end time of the pool.
     * @property {number} closed_at - The time when the pool was closed.
     * @property {number} total_supply - The total supply of the pool.
     * @property {string} asset_id - The ID of the asset.
     * @property {number} option - The option of the pool.
     * @property {string} factor - The factor of the pool.
     * @property {number} distributed - The distributed amount from the pool.
     * @property {string} available - The available amount in the pool.
     * @property {string} total - The total amount in the pool.
     */

    bcs.registerStructType('IncentivePoolInfo', {
        pool_id: 'address',
        funds: 'address',
        phase: 'u64',
        start_at: 'u64',
        end_at: 'u64',
        closed_at: 'u64',
        total_supply: 'u64',
        asset_id: 'u8',
        option: 'u8',
        factor: 'u256',
        distributed: 'u64',
        available: 'u256',
        total: 'u256',
    });

    /**
     * Represents the information about an incentive pool by phase.
     * @typedef {Object} IncentivePoolInfoByPhase
     * @property {number} phase - The phase of the pool.
     * @property {IncentivePoolInfo[]} pools - The list of pools in the phase.
     */

    bcs.registerStructType('IncentivePoolInfoByPhase', {
        phase: 'u64',
        pools: 'vector<IncentivePoolInfo>',
    });

    /**
     * Represents the information about the user's state.
     * @typedef {Object} UserStateInfo
     * @property {string} asset_id - The ID of the asset.
     * @property {string} borrow_balance - The borrow balance of the user.
     * @property {string} supply_balance - The supply balance of the user.
     */

    bcs.registerStructType('UserStateInfo', {
        asset_id: 'u8',
        borrow_balance: 'u256',
        supply_balance: 'u256',
    });

    /**
     * Represents the information about the reserve data.
     * @typedef {Object} ReserveDataInfo
     * @property {number} id - The ID of the reserve.
     * @property {number} oracle_id - The ID of the oracle.
     * @property {string} coin_type - The type of the coin.
     * @property {string} supply_cap - The supply cap of the reserve.
     * @property {string} borrow_cap - The borrow cap of the reserve.
     * @property {string} supply_rate - The supply rate of the reserve.
     * @property {string} borrow_rate - The borrow rate of the reserve.
     * @property {string} supply_index - The supply index of the reserve.
     * @property {string} borrow_index - The borrow index of the reserve.
     * @property {string} total_supply - The total supply of the reserve.
     * @property {string} total_borrow - The total borrow of the reserve.
     * @property {number} last_update_at - The last update time of the reserve.
     * @property {string} ltv - The loan-to-value ratio of the reserve.
     * @property {string} treasury_factor - The treasury factor of the reserve.
     * @property {string} treasury_balance - The treasury balance of the reserve.
     * @property {string} base_rate - The base rate of the reserve.
     * @property {string} multiplier - The multiplier of the reserve.
     * @property {string} jump_rate_multiplier - The jump rate multiplier of the reserve.
     * @property {string} reserve_factor - The reserve factor of the reserve.
     * @property {string} optimal_utilization - The optimal utilization of the reserve.
     * @property {string} liquidation_ratio - The liquidation ratio of the reserve.
     * @property {string} liquidation_bonus - The liquidation bonus of the reserve.
     * @property {string} liquidation_threshold - The liquidation threshold of the reserve.
     */

    bcs.registerStructType('ReserveDataInfo', {
        id: 'u8',
        oracle_id: 'u8',
        coin_type: 'string',
        supply_cap: 'u256',
        borrow_cap: 'u256',
        supply_rate: 'u256',
        borrow_rate: 'u256',
        supply_index: 'u256',
        borrow_index: 'u256',
        total_supply: 'u256',
        total_borrow: 'u256',
        last_update_at: 'u64',
        ltv: 'u256',
        treasury_factor: 'u256',
        treasury_balance: 'u256',
        base_rate: 'u256',
        multiplier: 'u256',
        jump_rate_multiplier: 'u256',
        reserve_factor: 'u256',
        optimal_utilization: 'u256',
        liquidation_ratio: 'u256',
        liquidation_bonus: 'u256',
        liquidation_threshold: 'u256',
    });
}