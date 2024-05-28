import axios from 'axios';
import { pool } from '../../address';
import { CoinInfo, Pool, PoolConfig } from "../../types";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { getConfig } from "../../address";



/**
 * Retrieves pool information for a given coin symbol.
 * @param coinSymbol - The symbol of the coin.
 * @returns The pool information for the specified coin symbol, or all pool information if no coin symbol is provided.
 * @throws If there is an error fetching the pool information.
 */
export async function getPoolInfo(coin: CoinInfo) {
    const pool_real: PoolConfig = pool[coin.symbol as keyof Pool];
    let poolId = pool_real.assetId;
    const client = new SuiClient({
        url: getFullnodeUrl("mainnet"),
    });
    try {
        const response = await axios.get('https://api-defi.naviprotocol.io/getIndexAssetData');
        const poolInfo = response.data;

        const poolData = poolInfo[poolId];

        const config = await getConfig();
        const result: any = await client.getDynamicFieldObject({ parentId: config.ReserveParentId, name: { type: 'u8', value: poolId } });
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
            symbol: poolData.symbol,
            rewardTokenAddress: poolData.rewardTokens,
        };


    } catch (error) {
        console.error('Error fetching pool information:', error);
        throw error;
    }
}

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