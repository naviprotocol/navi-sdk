import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { bcs } from "@mysten/sui.js/bcs";

import { moveInspect } from "../CallFunctions";
import { depositCoin } from "./commonFunctions";
import { getPoolsInfo, getPoolsInfoFake } from "../PoolInfo";
import { getConfig, PriceFeedConfig, pool } from "../../address";
import { V3Type, PoolData, Pool, PoolConfig } from "../../types";

const SECONDS_PER_DAY = 86400;
const RATE_MULTIPLIER = 1000;
export function registerStructs() {
  bcs.registerStructType("ClaimableReward", {
    asset_coin_type: "string",
    reward_coin_type: "string",
    user_claimable_reward: "u256",
    user_claimed_reward: "u256",
    rule_ids: "vector<address>",
  });
}

/**
 * Retrieves the available rewards for a specific user in the protocol.
 *
 * This function communicates with the Sui blockchain to fetch and process
 * claimable rewards for a user based on their interactions with the protocol.
 *
 * @param {SuiClient} client - The Sui client instance used to interact with the blockchain.
 * @param {string} userAddress - The blockchain address of the user whose rewards are being fetched.
 * @param {boolean} [prettyPrint=true] - Whether to log the rewards data in a readable format.
 * @returns {Promise<V3Type.GroupedRewards>} A promise resolving to the grouped rewards by asset type.
 * @throws {Error} If fetching rewards data fails or returns undefined.
 */
export async function getAvailableRewards(
    client: SuiClient,
    userAddress: string,
    prettyPrint = true
  ): Promise<V3Type.GroupedRewards | null> {

    const protocolConfig = await getConfig();
  
    registerStructs();
  
    const tx = new Transaction();
    const claimableRewardsCall = tx.moveCall({
      target: `${protocolConfig.ProtocolPackage}::incentive_v3::get_user_claimable_rewards`,
      arguments: [
        tx.object("0x06"), 
        tx.object(protocolConfig.StorageId), 
        tx.object(protocolConfig.IncentiveV3), 
        tx.pure.address(userAddress), 
      ],
    });
  
    const rewardsData = await moveInspect(
      tx,
      client,
      userAddress,
      `${protocolConfig.ProtocolPackage}::incentive_v3::parse_claimable_rewards`,
      [claimableRewardsCall],
      [],
      "vector<ClaimableReward>"
    );

    if (!rewardsData) {
      throw new Error(
        "Failed to fetch v3 rewards data: moveInspect returned undefined."
      );
    }
  
    const rawRewards: V3Type.RewardsList = rewardsData[0];
    if (rawRewards.length === 0) {
      console.log("No v3 rewards");
      return null;
    }
    
    // Group the rewards by the asset's coin type for better organization.
    const groupedRewards: V3Type.GroupedRewards = rawRewards.reduce(
      (acc: V3Type.GroupedRewards, reward: V3Type.Reward) => {
        const {
          asset_coin_type,
          reward_coin_type,
          user_claimable_reward, 
          user_claimed_reward, 
          rule_ids, 
        } = reward;
  
        // Initialize the grouping for the asset coin type if not present.
        if (!acc[asset_coin_type]) {
          acc[asset_coin_type] = [];
        }
        const assertCoinKey = Object.keys(PriceFeedConfig).find(
          (key) => PriceFeedConfig[key].coinType === `0x${asset_coin_type}`
        );
        // Map reward coin types to their respective configuration for precision.
        const rewardCoinKey = Object.keys(PriceFeedConfig).find(
          (key) => PriceFeedConfig[key].coinType === `0x${reward_coin_type}`
        );
        if (!rewardCoinKey || !assertCoinKey) {
          return acc
        }
  
        // Determine decimal precision based on the coin configuration.
        const decimalPrecision = PriceFeedConfig[rewardCoinKey].priceDecimal
  
        // Convert raw reward amounts to human-readable values.
        const convertedClaimable =
          Number(user_claimable_reward) / Math.pow(10, decimalPrecision);
        const convertedClaimed =
          Number(user_claimed_reward) / Math.pow(10, decimalPrecision);
  
        // Append the reward details to the grouped rewards.
        acc[asset_coin_type].push({
          assert_id: PriceFeedConfig[assertCoinKey].oracleId.toString(),
          reward_id: PriceFeedConfig[rewardCoinKey].oracleId.toString(),
          reward_coin_type,
          user_claimable_reward: convertedClaimable,
          user_claimed_reward: convertedClaimed,
          rule_ids,
        });
  
        return acc;
      },
      {}
    );
  
    // Log the rewards data in a readable format if prettyPrint is enabled.
    if (prettyPrint) {
      console.log(`-- V3 Available Rewards --`);
      for (const [assetCoinType, rewards] of Object.entries(groupedRewards)) {
        // Map the asset coin type to a readable identifier.
        const assetCoinKey = Object.keys(PriceFeedConfig).find(
          (key) => PriceFeedConfig[key].coinType === `0x${assetCoinType}`
        );
        console.log(`Asset: ${assetCoinKey}`);
  
        rewards.forEach((reward, idx) => {
          const rewardCoinKey = Object.keys(PriceFeedConfig).find(
            (key) => PriceFeedConfig[key].coinType === `0x${reward.reward_coin_type}` 
          );
          console.log(
            `  ${idx + 1}. Reward Coin: ${rewardCoinKey}, ` +
            `Claimable: ${reward.user_claimable_reward}, Claimed: ${reward.user_claimed_reward}`
          );
        });
      }
    }

    return groupedRewards;
  }

/**
 * Claim a specific reward by calling the Move entry function.
 * @param tx The Transaction object.
 * @param rewardInfo The minimal reward info, including asset_coin_type, reward_coin_type, rule_ids
 */
export async function claimRewardFunction(
    tx: Transaction,
    rewardInfo: V3Type.ClaimRewardInput
  ): Promise<void> {
    const config = await getConfig();
    // console.log("Claiming reward:", rewardInfo);
  
    // Find matching rewardFund from the pool config
    let matchedRewardFund: string | null = null;
  
    for (const key of Object.keys(pool) as (keyof Pool)[]) {
      // e.g. "0x2::sui::SUI".slice(2) => "2::sui::SUI"
      const coinTypeWithoutHex = pool[key].type.startsWith("0x")
        ? pool[key].type.slice(2)
        : pool[key].type;
  
      const rewardCoinTypeWithoutHex = rewardInfo.reward_coin_type.startsWith("0x")
        ? rewardInfo.reward_coin_type.slice(2)
        : rewardInfo.reward_coin_type;
  
      if (coinTypeWithoutHex === rewardCoinTypeWithoutHex) {
        matchedRewardFund = pool[key].rewardFundId;
        break;
      }
    }
  
    if (!matchedRewardFund) {
      throw new Error(
        `No matching rewardFund found for reward_coin_type: ${rewardInfo.reward_coin_type}`
      );
    }
  
    // Construct the Move call 
    tx.moveCall({
      target: `${config.ProtocolPackage}::incentive_v3::claim_reward_entry`,
      arguments: [
        tx.object("0x06"),                  
        tx.object(config.IncentiveV3),
        tx.object(config.StorageId),
        tx.object(matchedRewardFund),
        tx.pure.vector("string", rewardInfo.asset_vector),
        tx.pure.vector("address", rewardInfo.rules_vector)
      ],
      typeArguments: [rewardInfo.reward_coin_type]
    });
  }

  /**
 * Claim all rewards for a user by iterating through the grouped rewards.
 * @param client SuiClient instance
 * @param userAddress The address of the user to claim for
 * @param existingTx (Optional) If provided, we append to this Transaction instead of creating a new one
 * @returns The Transaction with all claim commands appended
 */
export async function claimAllRewardsPTB(
    client: SuiClient,
    userAddress: string,
    existingTx?: Transaction
  ): Promise<Transaction> {

  // Initialize the transaction object, use existingTx if provided
  const tx = existingTx ?? new Transaction();
  
  // Fetch the available grouped rewards for the user
  const groupedRewards = await getAvailableRewards(client, userAddress);
  if (!groupedRewards) {
    return tx
  }
  
  // Object to store aggregated rewards by coin type
  const rewardMap = new Map<string, { assetIds: string[]; ruleIds: string[] }>();

  // Single-pass aggregation using Map for O(1) lookups
  for (const [poolId, rewards] of Object.entries(groupedRewards)) {
    for (const reward of rewards) {
      const { reward_coin_type: coinType, rule_ids: ruleIds } = reward;
      
      for (const ruleId of ruleIds) {
        if (!rewardMap.has(coinType)) {
          rewardMap.set(coinType, { assetIds: [], ruleIds: [] });
        }
        
        const group = rewardMap.get(coinType)!;
        group.assetIds.push(poolId);
        group.ruleIds.push(ruleId);
      }
    }
  }

  // Asynchronously create claim transaction instructions for each reward coin type
  Array.from(rewardMap).map(
    async ([coinType, { assetIds, ruleIds }]) => {
      const claimInput: V3Type.ClaimRewardInput = {
        reward_coin_type: coinType,
        asset_vector: assetIds,
        rules_vector: ruleIds,
      };
      await claimRewardFunction(tx, claimInput);
    }
  );

  return tx;
  }

/**
 * Claim a specific reward by calling the Move entry function.
 * @param tx The Transaction object.
 * @param rewardInfo The minimal reward info, including asset_coin_type, reward_coin_type, rule_ids
 */
export async function claimRewardResupplyFunction(
  tx: Transaction,
  rewardInfo: V3Type.ClaimRewardInput,
  userAddress: string
): Promise<void> {
  const config = await getConfig();
  const notDepositCoinType = [
    '0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT',
    '0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH'
  ]
  console.log("Claiming reward:", rewardInfo);

  // Find matching rewardFund from the pool config
  let matchedRewardFund: string | null = null;
  let toPoolConfig: PoolConfig | null = null;

  for (const key of Object.keys(pool) as (keyof Pool)[]) {
    // e.g. "0x2::sui::SUI".slice(2) => "2::sui::SUI"
    const coinTypeWithoutHex = pool[key].type.startsWith("0x")
      ? pool[key].type.slice(2)
      : pool[key].type;

    const rewardCoinTypeWithoutHex = rewardInfo.reward_coin_type.startsWith("0x")
      ? rewardInfo.reward_coin_type.slice(2)
      : rewardInfo.reward_coin_type;

    if (coinTypeWithoutHex === rewardCoinTypeWithoutHex) {
      matchedRewardFund = pool[key].rewardFundId;
      toPoolConfig = pool[key];
      break;
    }
  }

  if (!matchedRewardFund || !toPoolConfig) {
    throw new Error(
      `No matching rewardFund found for reward_coin_type: ${rewardInfo.reward_coin_type}`
    );
  }

  // Construct the Move call 
  const reward_balance = tx.moveCall({
    target: `${config.ProtocolPackage}::incentive_v3::claim_reward`,
    arguments: [
      tx.object("0x06"),                  
      tx.object(config.IncentiveV3),
      tx.object(config.StorageId),
      tx.object(matchedRewardFund),
      tx.pure.vector("string", rewardInfo.asset_vector),
      tx.pure.vector("address", rewardInfo.rules_vector)
    ],
    typeArguments: [toPoolConfig.type]
  });

    const [reward_coin]: any = tx.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [reward_balance],
        typeArguments: [toPoolConfig.type],
    });

    if (notDepositCoinType.includes(rewardInfo.reward_coin_type)) {
      tx.transferObjects([reward_coin], userAddress)
    } else {
      const reward_coin_value = tx.moveCall({
        target: '0x2::coin::value',
        arguments: [reward_coin],
        typeArguments: [toPoolConfig.type],
    });
  console.log(toPoolConfig)
  // tx.transferObjects([reward_coin], userAddress)
    await depositCoin(tx, toPoolConfig, reward_coin, reward_coin_value);
    }

}

/**
* Claim all rewards for a user by iterating through the grouped rewards.
* @param client SuiClient instance
* @param userAddress The address of the user to claim for
* @param existingTx (Optional) If provided, we append to this Transaction instead of creating a new one
* @returns The Transaction with all claim commands appended
*/
export async function claimAllRewardsResupplyPTB(
  client: SuiClient,
  userAddress: string,
  existingTx?: Transaction
): Promise<Transaction> {

// Initialize the transaction object, use existingTx if provided
const tx = existingTx ?? new Transaction();

// Fetch the available grouped rewards for the user
const groupedRewards = await getAvailableRewards(client, userAddress);
if (!groupedRewards) {
  return tx
}
console.log(groupedRewards)
// Object to store aggregated rewards by coin type
const rewardMap = new Map<string, { assetIds: string[]; ruleIds: string[] }>();

// Single-pass aggregation using Map for O(1) lookups
for (const [poolId, rewards] of Object.entries(groupedRewards)) {
  for (const reward of rewards) {
    const { reward_coin_type: coinType, rule_ids: ruleIds } = reward;
    
    for (const ruleId of ruleIds) {
      if (!rewardMap.has(coinType)) {
        rewardMap.set(coinType, { assetIds: [], ruleIds: [] });
      }
      
      const group = rewardMap.get(coinType)!;
      group.assetIds.push(poolId);
      group.ruleIds.push(ruleId);
    }
  }
}

// Asynchronously create claim transaction instructions for each reward coin type
Array.from(rewardMap).map(
  async ([coinType, { assetIds, ruleIds }]) => {
    const claimInput: V3Type.ClaimRewardInput = {
      reward_coin_type: coinType,
      asset_vector: assetIds,
      rules_vector: ruleIds,
    };
    await claimRewardResupplyFunction(tx, claimInput, userAddress);
  }
);

return tx;
}

/**
 * Build a map of coinType -> price from the provided pool information.
 *
 * @param poolsInfo - An array of pool data which contains oracle price information
 * @returns A record (key/value pairs) where key is the coinType and value is the current price
 */
function buildCoinPriceMap(poolsInfo: PoolData[]): Record<string, number> {
  const coinPriceMap: Record<string, number> = {};

  for (const pool of poolsInfo) {
    if (pool?.oracle?.valid) {
      coinPriceMap[pool.coinType] = parseFloat(pool.oracle.price || '0');
    } else {
      coinPriceMap[pool.coinType] = 0;
    }
  }

  return coinPriceMap;
}

/**
 * Calculate the sum of reward rates and collect reward coin types.
 *
 * @param rules - The list of enabled rules
 * @param coinPriceMap - A mapping of coin types to their prices
 * @returns An object containing the total rateSum and a list of reward coin types
 */
function calculateRateSumAndCoins(
  rules: V3Type.ComputedRule[],
  coinPriceMap: Record<string, number>
): { rateSum: number; rewardCoins: string[] } {
  let rateSum = 0;
  const rewardCoins: string[] = [];

  for (const rule of rules) {
    const ruleRate = Number(rule.rate) / 1e27; // Convert from a large integer representation
    const rewardPrice = coinPriceMap[rule.reward_coin_type] || 0;
    rateSum += ruleRate * rewardPrice;
    rewardCoins.push(rule.reward_coin_type);
  }

  return { rateSum, rewardCoins };
}

/**
 * Compute the final APY based on the total rate and the value in the pool.
 *
 * Formula: (rateSum * RATE_MULTIPLIER * SECONDS_PER_DAY * 365) / totalValue * 100
 *
 * @param rateSum - The aggregated rate sum after conversion
 * @param totalValue - Typically totalAmount * assetPrice
 * @returns The APY value, or 0 if totalValue <= 0
 */
function apyFormula(rateSum: number, totalValue: number): number {
  if (totalValue <= 0) return 0;
  return (
    (rateSum * RATE_MULTIPLIER * SECONDS_PER_DAY * 365) /
    totalValue *
    100
  );
}

/**
 * Calculate APY information (supply and borrow) for a list of grouped asset pools.
 *
 * @param groupedPools - The grouped pool data after calling `groupByAssetCoinType`
 * @param poolsInfo - The full pool information (usually fetched from backend or a mock)
 * @returns An array of ApyResult objects containing APY info for each pool
 */
export async function calculateApy(
  groupedPools: V3Type.GroupedAssetPool[],
  poolsInfo: PoolData[]
): Promise<V3Type.ApyResult[]> {
  // 1. Build the coin price map
  const coinPriceMap = buildCoinPriceMap(poolsInfo);

  // 2. Iterate over each grouped pool to calculate APY
  return groupedPools.map((group) => {
    const matchingPool = poolsInfo.find(
      (p) => p.coinType === group.asset_coin_type
    );

    // If no matching pool info found or no rules are enabled, return default
    if (!matchingPool || !group.rules || group.rules.length === 0) {
      return {
        asset: group.asset,
        asset_coin_type: group.asset_coin_type,
        supplyIncentiveApyInfo: { rewardCoin: [], apy: 0 },
        borrowIncentiveApyInfo: { rewardCoin: [], apy: 0 },
      };
    }

    const assetPrice = coinPriceMap[group.asset_coin_type] || 0;
    const totalSupplyAmount = Number(matchingPool.totalSupplyAmount || 0);
    const borrowedAmount = Number(matchingPool.borrowedAmount || 0);

    // Filter out disabled rules
    const enabledRules = group.rules.filter((rule) => rule.enable);

    // --- Calculate Supply APY (option = 1) ---
    const supplyRules = enabledRules.filter((r) => r.option === 1);
    const {
      rateSum: supplyRateSum,
      rewardCoins: supplyRewardCoins,
    } = calculateRateSumAndCoins(supplyRules, coinPriceMap);

    const supplyApy = apyFormula(
      supplyRateSum,
      totalSupplyAmount * assetPrice
    );

    // --- Calculate Borrow APY (option = 3) ---
    const borrowRules = enabledRules.filter((r) => r.option === 3);
    const {
      rateSum: borrowRateSum,
      rewardCoins: borrowRewardCoins,
    } = calculateRateSumAndCoins(borrowRules, coinPriceMap);

    const borrowApy = apyFormula(borrowRateSum, borrowedAmount * assetPrice);

    // Return the final APY result
    return {
      asset: group.asset,
      asset_coin_type: group.asset_coin_type,
      supplyIncentiveApyInfo: {
        rewardCoin: supplyRewardCoins,
        apy: supplyApy,
      },
      borrowIncentiveApyInfo: {
        rewardCoin: borrowRewardCoins,
        apy: borrowApy,
      },
    };
  });
}

/**
 * Group the raw incentive data by asset_coin_type.
 *
 * @param incentiveData - The data structure returned by the Sui client
 * @returns A list of GroupedAssetPool items, each containing an array of rules
 */
export function groupByAssetCoinType(
  incentiveData: V3Type.IncentiveData
): V3Type.GroupedAssetPool[] {
  const groupedMap = new Map<string, V3Type.GroupedAssetPool>();

  const rawPools = incentiveData.data.content.fields.pools.fields.contents;

  for (const poolEntry of rawPools) {
    const assetPool = poolEntry.fields.value.fields;
    const { asset, asset_coin_type } = assetPool;
    const rulesList = assetPool.rules.fields.contents;

    if (!groupedMap.has(asset_coin_type)) {
      groupedMap.set(asset_coin_type, {
        asset,
        asset_coin_type,
        rules: [],
      });
    }

    const groupedPool = groupedMap.get(asset_coin_type)!;

    for (const ruleEntry of rulesList) {
      const rule = ruleEntry.fields.value.fields;
      groupedPool.rules.push({
        option: rule.option,
        reward_coin_type: rule.reward_coin_type,
        rate: rule.rate,
        enable: rule.enable,
      });
    }
  }

  return Array.from(groupedMap.values());
}

/**
 * Main function to fetch on-chain data and compute APY information.
 *
 * @param client - The SuiClient instance used to fetch the raw data
 * @returns An array of FinalResult items representing APY for each pool
 */
export async function getPoolApy(
  client: SuiClient,
): Promise<V3Type.ApyResult[]> {
  // 1. Fetch raw incentive data from on-chain
  const protocolConfig = await getConfig();

  // TODO: change
  // const poolsInfo: PoolData[] = await getPoolsInfo()
  const poolsInfo: PoolData[] = await getPoolsInfoFake()

  const rawData: any = await client.getObject({
    id: protocolConfig.IncentiveV3,
    options: {
      showType: true,
      showOwner: true,
      showContent: true,
    },
  });

  // 2. Type assertion if needed
  const incentiveData = rawData as V3Type.IncentiveData;

  // 3. Group the data by asset_coin_type
  const groupedPools = groupByAssetCoinType(incentiveData);
  // 4. Calculate APY based on the grouped pools and provided pool info
  return calculateApy(groupedPools, poolsInfo);
}
