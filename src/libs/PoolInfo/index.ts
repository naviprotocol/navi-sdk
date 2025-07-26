import axios from 'axios';
import { pool, getConfig } from '../../address';
import { CoinInfo, Pool, PoolConfig, PoolsResponse, PoolData } from "../../types";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import BigNumber from 'bignumber.js';

type FetchPoolDataArgs = { 
    poolId: number, 
    client: SuiClient, 
    reserveParentId: string, 
    poolInfo: any
}

type CoinPrice = {
  coinType: string;
  value: number;
  decimals: string;
  updateUnixTime: number;
  v24hChangePercent: number;
  updateHumanTime: string;
  priceChangePercent: number;
};

type ApiResponse = {
  data: {
    list: CoinPrice[];
  };
};

export const fetchPoolData = ({ poolId, client, reserveParentId, poolInfo }: FetchPoolDataArgs) => {
  const poolData = poolInfo.find((item: any) => item.id === poolId);

  const toFloat = (value: string, divisor: number) =>
    new BigNumber(value).dividedBy(divisor).toNumber();

  const result = {
    coinType: poolData.token.coinType,
    price: poolData.oracle.price,
    currentSupplyIndex: toFloat(poolData.currentSupplyIndex, 1e27),
    currentBorrowIndex: toFloat(poolData.currentBorrowIndex, 1e27),
    currentSupplyRate: toFloat(poolData.currentSupplyRate, 1e27),
    currentBorrowRate: toFloat(poolData.currentBorrowRate, 1e27),
    totalSupply: toFloat(poolData.totalSupply, 1e9),
    totalBorrow: toFloat(poolData.totalBorrow, 1e9),
    supplyCapCeiling: toFloat(poolData.supplyCapCeiling, 1e27),
    borrowCapCeiling: toFloat(poolData.borrowCapCeiling, 1e27),
    optimalUtilization: toFloat(poolData.borrowRateFactors.fields.optimalUtilization, 1e27),
    liquidationFactors: poolData.liquidationFactor.threshold,
    ltv: toFloat(poolData.ltv, 1e27),
  };
  const total_supply_with_index = result.totalSupply * result.currentSupplyIndex;
  const total_borrow_with_index = result.totalBorrow * result.currentBorrowIndex;

  return {
    coin_type: result.coinType,
    total_supply: total_supply_with_index,
    total_borrow: total_borrow_with_index,
    tokenPrice: result.price,
    base_borrow_rate: (result.currentBorrowRate * 100).toString(),
    base_supply_rate: (result.currentSupplyRate * 100).toString(),
    boosted_supply_rate: poolData.supplyIncentiveApyInfo.boostedApr,
    boosted_borrow_rate: poolData.borrowIncentiveApyInfo.boostedApr,
    supply_cap_ceiling: result.supplyCapCeiling,
    borrow_cap_ceiling: result.borrowCapCeiling * result.totalSupply,
    current_supply_utilization: total_supply_with_index / result.supplyCapCeiling,
    current_borrow_utilization: total_borrow_with_index / (result.borrowCapCeiling * result.totalSupply),
    optimal_borrow_utilization: result.optimalUtilization.toString(),
    pool: `${poolData.token.symbol}-Sui`,
    max_ltv: result.ltv.toString(),
    liquidation_threshold: result.liquidationFactors,
    symbol: poolData.token.symbol,
    rewardTokenAddress: [...new Set([...poolData.borrowIncentiveApyInfo.rewardCoin, ...poolData.supplyIncentiveApyInfo.rewardCoin])],
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
        const response = await axios.get('https://open-api.naviprotocol.io/api/navi/pools');
        const poolInfo = response.data.data;
        const config = await getConfig();
        const poolResults: { [key: string]: any } = {};

        if (coin) {
            const pool_real: PoolConfig = pool[coin.symbol as keyof Pool];
            const poolId = pool_real.assetId;
            return fetchPoolData({ poolId, reserveParentId: config.ReserveParentId, client, poolInfo });
        } else {
          for (const pool of poolInfo) {
            const poolId = pool.id;
            poolResults[poolId] = fetchPoolData({
              poolId,
              reserveParentId: config.ReserveParentId,
              client,
              poolInfo,
            });
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
        return '';
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

export async function getPoolsInfo(): Promise<PoolData[] | null> {
    const poolInfoUrl = `https://open-api.naviprotocol.io/api/navi/pools`;
    try {
      const response = await axios.get<PoolsResponse>(poolInfoUrl);
      if (response.data.code === 0){
        return response.data.data;
      } else {
        return null
      }
    } catch (error) {
      console.error('Error fetching pools information:', error);
      return null
    }
  }

export async function fetchCoinPrices(
    coinTypes: string[],
    isInternal = false,
    Token?: string,
    maxRetries = 3,
    delayTime = 1000
  ): Promise<CoinPrice[] | null> {
    if (coinTypes.length === 0) {
      console.warn("No coin types provided.");
      return null;
    }
  
    let API_URL = "https://open-aggregator-api.naviprotocol.io/coins/price";
    if (isInternal) {
      API_URL = "https://aggregator-api.naviprotocol.io/coins/price";
    }
  
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
    const fetchChunk = async (chunk: string[]): Promise<CoinPrice[] | null> => {
      const attemptFetch = async (retries: number): Promise<CoinPrice[] | null> => {
        try {
          const url = `${API_URL}?coinType=${chunk.join(",")}`;
          const headers: HeadersInit = {};
          if (!isInternal && Token) {
            headers['x-navi-token'] = Token;
          }
          const response = await fetch(url, { method: 'GET', headers });
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const jsonData: ApiResponse = await response.json();
          const adjustedPrices = jsonData.data.list.map((price) => {
            if (price.coinType === "0x2::sui::SUI") {
              return {
                ...price,
                coinType:
                  "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
              };
            }

            return price;
          });
          return adjustedPrices;
        } catch (error) {
          if (retries <= 0) {
            console.error("Failed to fetch coin prices after multiple attempts:", error);
            return null;
          }
          console.warn(`Attempt failed for chunk, retrying... (${maxRetries - retries + 1}/${maxRetries})`);
          await delay(delayTime);
          return attemptFetch(retries - 1);
        }
      };
  
      return attemptFetch(maxRetries);
    };
  
    const chunkSize = 10;
    const chunkPromises: Promise<CoinPrice[] | null>[] = [];
    for (let i = 0; i < coinTypes.length; i += chunkSize) {
      const chunk = coinTypes.slice(i, i + chunkSize);
      chunkPromises.push(fetchChunk(chunk));
    }
  
    const chunkResults = await Promise.all(chunkPromises);
    const results: CoinPrice[] = [];
    for (const chunkResult of chunkResults) {
      if (chunkResult) {
        results.push(...chunkResult);
      }
    }
    return results;
  }
  