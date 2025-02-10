import axios from 'axios';
import { pool } from '../../address';
import { CoinInfo, Pool, PoolConfig, PoolsResponse, PoolData } from "../../types";
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

export async function getPoolsInfo(): Promise<PoolData[]> {
    const poolInfoUrl = `https://open-api.naviprotocol.io/api/navi/pools`;
    try {
      const response = await axios.get<PoolsResponse>(poolInfoUrl);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching pools information:', error);
      throw error;
    }
  }
export function getPoolsInfoFake(): PoolData[] {

    return [
        {
            borrowCapCeiling: "900000000000000000000000000",
            coinType:
              "0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
            totalSupplyAmount: "41077517017522846",
            minimumAmount: "7500000",
            leftSupply: "33922482.98247715",
            validBorrowAmount: "36969765315770561.4",
            borrowedAmount: "26413719230966424",
            leftBorrowAmount: "36969765289356842.4",
            availableBorrow: "10556046084804137.4",
            oracle: {
              decimal: 9,
              value: "3432559920",
              price: "3.43255992",
              oracleId: 0,
              valid: true,
            },
          },
          {
            borrowCapCeiling: "900000000000000000000000000",
            coinType:
              "bde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
            totalSupplyAmount: "23667403562788886",
            minimumAmount: "3500000",
            leftSupply: "11332596.437211115",
            validBorrowAmount: "20117293028370553.1",
            borrowedAmount: "390122340331251",
            leftBorrowAmount: "20117293027980431.1",
            availableBorrow: "19727170688039302.1",
            oracle: {
              decimal: 9,
              value: "3432559920",
              price: "3.43255992",
              oracleId: 6,
              valid: true,
            },
          },
        {
          borrowCapCeiling: "900000000000000000000000000",
          coinType:
            "549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
          totalSupplyAmount: "22785078106925185",
          minimumAmount: "5500000",
          leftSupply: "32214921.893074814",
          validBorrowAmount: "19367316390886407.25",
          borrowedAmount: "1446893362959561",
          leftBorrowAmount: "19367316389439514.25",
          availableBorrow: "17920423027926846.25",
          oracle: {
            decimal: 9,
            value: "3432559920",
            price: "3.43255992",
            oracleId: 5,
            valid: true,
          },
        },
        {
          borrowCapCeiling: "900000000000000000000000000",
          coinType:
            "0xeedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT",
          totalSupplyAmount: "4982143121335951",
          minimumAmount: "3000000",
          leftSupply: "25017856.878664049",
          validBorrowAmount: "4483928809202355.9",
          borrowedAmount: "3895223301183381",
          leftBorrowAmount: "4483928805307132.9",
          availableBorrow: "588705508018974.9",
          oracle: {
            decimal: 6,
            value: "1000000",
            price: "1",
            oracleId: 1,
            valid: true,
          },
        },
        {
            borrowCapCeiling: "900000000000000000000000000",
            coinType:
              "0xeedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH",
            totalSupplyAmount: "1946540534229",
            minimumAmount: "400",
            leftSupply: "2053.459465771",
            validBorrowAmount: "1751886480806.1",
            borrowedAmount: "144532003143",
            leftBorrowAmount: "1751886480661.1",
            availableBorrow: "1607354477663.1",
            oracle: {
            decimal: 8,
            value: "281374096002",
            price: "2813.74096002",
            oracleId: 3,
            valid: true
            },
          },
      ] as any;

  }
