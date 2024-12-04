import axios from 'axios';
import { pool } from '../../address';
import { CoinInfo, Pool, PoolConfig } from "../../types";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getConfig } from "../../address";

type FetchPoolDataArgs = { 
    poolId: string, 
    client: SuiClient, 
    reserveParentId: string, 
    poolInfo: any
}

export const fetchPoolData = async ({ poolId, client, reserveParentId, poolInfo }: FetchPoolDataArgs ) => {
    const poolData = poolInfo[poolId];
    const result: any = await client.getDynamicFieldObject({ parentId: reserveParentId, name: { type: 'u8', value: poolId } });
    const filedsData = result.data?.content?.fields?.value?.fields;
    const total_supply_with_index = poolData.total_supply * filedsData.current_supply_index / 1e27;
    const total_borrow_with_index = poolData.total_borrow * filedsData.current_borrow_index / 1e27;

    return {
        coin_type: poolData.coin_type,
        total_supply: total_supply_with_index,
        total_borrow: total_borrow_with_index,
        tokenPrice: poolData.price,
        base_supply_rate: poolData.supply_rate,
        base_borrow_rate: poolData.borrow_rate,
        boosted_supply_rate: poolData.boosted,
        boosted_borrow_rate: poolData.borrow_reward_apy,
        supply_cap_ceiling: Number((filedsData.supply_cap_ceiling / 1e36)),
        borrow_cap_ceiling: Number((filedsData.borrow_cap_ceiling / 1e27).toFixed(2)) * poolData.total_supply,
        current_supply_utilization: total_supply_with_index / Number((filedsData.supply_cap_ceiling / 1e36)),
        current_borrow_utilization: total_borrow_with_index / (Number((filedsData.borrow_cap_ceiling / 1e27).toFixed(2)) * poolData.total_supply),
        optimal_borrow_utilization: (Number(filedsData.borrow_rate_factors?.fields?.optimal_utilization) / 1e27).toFixed(2),
        pool: poolData.pool,
        max_ltv: (Number(filedsData.ltv) / 1e27).toFixed(2),
        liquidation_threshold: (Number(filedsData.liquidation_factors.fields.threshold) / 1e27).toFixed(2),
        symbol: poolData.symbol,
        rewardTokenAddress: poolData.rewardTokens,
    };
};

export const fetchFlashloanData = async (client: SuiClient) => {
    const config = await getConfig();
    const result: any = await client.getDynamicFields({
        parentId: config.flashloanSupportedAssets,
    });

    const resultList: { [key: string]: any } = {};

    await Promise.all(result.data.map(async (item: any) => {
        const result2: any = await client.getObject({
            id: item.objectId,
            options: {
                showContent: true
            }
        });
        const fields = result2.data?.content?.fields?.value?.fields;
        const coin_type = fields?.coin_type;
        if (coin_type) {
            const hexCoinType = '0x' + coin_type
            resultList[hexCoinType] = {
                max: fields.max,
                min: fields.min,
                assetId: fields.asset_id,
                poolId: fields.pool_id,
                supplierFee: Number(fields.rate_to_supplier) / 10000,
                flashloanFee: Number(fields.rate_to_treasury) / 10000,
            };
        }
    }));

    return resultList;
};

/**
 * Retrieves pool information for a given coin symbol.
 * @param coinSymbol - The symbol of the coin.
 * @returns The pool information for the specified coin symbol, or all pool information if no coin symbol is provided.
 * @throws If there is an error fetching the pool information.
 */
export async function getPoolInfo(coin?: CoinInfo, client?: SuiClient) {
    if (!client) {
        client = new SuiClient({
            url: getFullnodeUrl("mainnet"),
        });
    }

    try {
        const response = await axios.get('https://api-defi.naviprotocol.io/getIndexAssetData');
        const poolInfo = response.data;
        const config = await getConfig();
        const poolResults: { [key: string]: any } = {};

        if (coin) {
            const pool_real: PoolConfig = pool[coin.symbol as keyof Pool];
            const poolId = String(pool_real.assetId);
            return await fetchPoolData({ poolId, reserveParentId: config.ReserveParentId, client, poolInfo });
        } else {
            for (const poolId in poolInfo) {
                if (poolInfo.hasOwnProperty(poolId)) {
                    poolResults[poolId] = await fetchPoolData({ poolId, reserveParentId: config.ReserveParentId, client, poolInfo });
                }
            }
            return poolResults;
        }
    } catch (error) {
        console.error('Error fetching pool information:', error);
        throw error;
    }
}

/**
 * Retrieves the latest protocol package ID from the Navi Protocol API.
 * @returns The latest protocol package ID.
 */
export async function getLatestProtocolPackageId() {
    const apiUrl = 'https://open-api.naviprotocol.io/api/package';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.packageId;
    } catch (error) {
        console.error('Failed to update ProtocolPackage:');
    }
}

export async function getUserRewardHistory(userAddress: string, page: number = 1, size: number = 400) {
    const endpoint = `https://open-api.naviprotocol.io/api/navi/user/rewards?userAddress=${userAddress}&page=${page}&pageSize=${size}`;
    console.log(endpoint);
    try {
        const response = await axios.get(endpoint);
        const rewards = response.data?.data?.rewards || [];

        // Process and return the rewards data as needed
        return rewards;
    } catch (error) {
        console.error('Error fetching user reward history:', error);
        throw error;
    }
}
