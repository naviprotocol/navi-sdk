import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { normalizeStructTag } from '@mysten/sui/utils'
import { bcs } from "@mysten/sui.js/bcs";

import { moveInspect, getReserveData, getIncentiveAPY } from "../CallFunctions";
import { depositCoin } from "./commonFunctions";
import { getPoolsInfo, fetchCoinPrices } from "../PoolInfo";
import {
  getConfig,
  PriceFeedConfig,
  pool,
  noDepositCoinType,
} from "../../address";
import { V3Type, PoolData, Pool, PoolConfig } from "../../types";

const SECONDS_PER_DAY = 86400;
const RATE_MULTIPLIER = 1000;

/**
 * Ensure that a coin type string starts with "0x".
 * @param coinType - The original coin type.
 * @returns The formatted coin type.
 */
function formatCoinType(coinType: string): string {
  return coinType.startsWith("0x") ? coinType : "0x" + coinType;
}

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
 * Fetch and group available v3 rewards for a user.
 *
 * @param {SuiClient} client - The Sui client instance used to interact with the blockchain.
 * @param {string} userAddress - The blockchain address of the user whose rewards are being fetched.
 * @param {boolean} [prettyPrint=true] - Whether to log the rewards data in a readable format.
 * @returns {Promise<V3Type.GroupedRewards | null>} A promise resolving to the grouped rewards by asset type, or null if no rewards.
 * @throws {Error} If fetching rewards data fails or returns undefined.
 */
export async function getAvailableRewards(
  client: SuiClient,
  checkAddress: string,
  prettyPrint = true
): Promise<V3Type.GroupedRewards | null> {
  // Fetch the protocol configuration
  const protocolConfig = await getConfig();

  // Create a new transaction instance
  const tx = new Transaction();

  // Call the Move function to fetch the user's claimable rewards
  const rewardsData = await moveInspect(
    tx,
    client,
    checkAddress,
    `${protocolConfig.uiGetterV3}::incentive_v3_getter::get_user_atomic_claimable_rewards`,
    [
      tx.object("0x06"),
      tx.object(protocolConfig.StorageId),
      tx.object(protocolConfig.IncentiveV3),
      tx.pure.address(checkAddress),
    ]
  );

  if (!rewardsData) {
    throw new Error(
      "Failed to fetch v3 rewards data: moveInspect returned undefined."
    );
  }

  // Parse the raw rewards data into an array of reward objects.
  // The data may be in the new tuple format (5 arrays) or the legacy object array format.
  let rewardsList: V3Type.Reward[] = [];
  if (Array.isArray(rewardsData)) {
    // Check if the data is in the new tuple format (5 arrays and the first element is an array)
    if (rewardsData.length === 5 && Array.isArray(rewardsData[0])) {
      const count = rewardsData[0].length;
      for (let i = 0; i < count; i++) {
        rewardsList.push({
          asset_coin_type: rewardsData[0][i],
          reward_coin_type: rewardsData[1][i],
          option: Number(rewardsData[2][i]),
          // Ensure rule_ids is always an array
          rule_ids: Array.isArray(rewardsData[3][i])
            ? rewardsData[3][i]
            : [rewardsData[3][i]],
          user_claimable_reward: Number(rewardsData[4][i]),
        });
      }
    } else {
      // Assume the data is in the legacy format: an array of reward objects
      rewardsList = rewardsData;
    }
  }

  if (rewardsList.length === 0) {
    console.log("No v3 rewards");
    return null;
  }

  // Inline helper functions to retrieve configuration keys.
  const getPriceFeedKey = (coinType: string): string | undefined =>
    Object.keys(PriceFeedConfig).find(
      (key) => PriceFeedConfig[key].coinType === `0x${coinType}`
    );

  const getPoolKey = (coinType: string): string | undefined =>
    Object.keys(pool).find((key) => normalizeStructTag(pool[key].type) === `0x${coinType}`);

  // Group rewards by asset coin type.
  const groupedRewards: V3Type.GroupedRewards = {};
  for (const reward of rewardsList) {
    const {
      asset_coin_type,
      reward_coin_type,
      option,
      rule_ids,
      user_claimable_reward,
    } = reward;

    // Retrieve configuration keys for asset and reward coin types.
    const assetPriceFeedKey = getPriceFeedKey(asset_coin_type);
    const rewardPriceFeedKey = getPriceFeedKey(reward_coin_type);
    const assetPoolKey = getPoolKey(asset_coin_type);
    const rewardPoolKey = getPoolKey(reward_coin_type);

    // Skip reward if any necessary configuration is missing.
    if (
      !assetPriceFeedKey ||
      !rewardPriceFeedKey ||
      !assetPoolKey ||
      !rewardPoolKey
    ) {
      continue;
    }

    // Initialize rewards array for this asset if not already present.
    if (!groupedRewards[asset_coin_type]) {
      groupedRewards[asset_coin_type] = [];
    }

    // Convert the raw claimable reward into a human-readable value using the proper decimal precision.
    const decimalPrecision = PriceFeedConfig[rewardPriceFeedKey].priceDecimal;
    const convertedClaimable =
      Number(user_claimable_reward) / Math.pow(10, decimalPrecision);

    groupedRewards[asset_coin_type].push({
      asset_id: pool[assetPoolKey].assetId.toString(),
      reward_id: pool[rewardPoolKey].assetId.toString(),
      reward_coin_type,
      option,
      rule_ids,
      user_claimable_reward: convertedClaimable,
    });
  }

  // If prettyPrint is enabled, log the grouped rewards in a user-friendly format.
  if (prettyPrint) {
    console.log(`-- V3 Available Rewards --`);
    console.log(`address: ${checkAddress}`);
    for (const [assetCoinType, rewards] of Object.entries(groupedRewards)) {
      const assetKey = getPriceFeedKey(assetCoinType) ?? assetCoinType;
      console.log(`Asset: ${assetKey}`);
      rewards.forEach((reward, idx) => {
        const rewardKey =
          getPriceFeedKey(reward.reward_coin_type) ?? reward.reward_coin_type;
        console.log(
          `  ${idx + 1}. Reward Coin: ${rewardKey}, Option: ${
            reward.option
          }, ` + `Claimable: ${reward.user_claimable_reward}`
        );
      });
    }
  }

  return groupedRewards;
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
 * @returns {Promise<V3Type.GroupedRewards | null>} A promise resolving to the grouped rewards by asset type, or null if no rewards.
 * @throws {Error} If fetching rewards data fails or returns undefined.
 */
export async function getAvailableRewardsWithoutOption(
  client: SuiClient,
  userAddress: string,
  prettyPrint = true
): Promise<V3Type.GroupedRewards | null> {
  // Fetch the protocol configuration.
  const protocolConfig = await getConfig();

  // Register necessary Move structs.
  registerStructs();

  // Create a transaction and invoke the Move function to get user claimable rewards.
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

  // Helper function: Retrieve the corresponding key from PriceFeedConfig based on coin type.
  const getPriceFeedKey = (coinType: string): string | undefined =>
    Object.keys(PriceFeedConfig).find(
      (key) => PriceFeedConfig[key].coinType === `0x${coinType}`
    );

  // Helper function: Retrieve the corresponding key from pool based on coin type.
  const getPoolKey = (coinType: string): string | undefined =>
    Object.keys(pool).find((key) => normalizeStructTag(pool[key].type) === `0x${coinType}`);

  // Group the rewards by asset coin type.
  const groupedRewards: V3Type.GroupedRewards = rawRewards.reduce(
    (acc: V3Type.GroupedRewards, reward: V3Type.Reward) => {
      const {
        asset_coin_type,
        reward_coin_type,
        user_claimable_reward,
        user_claimed_reward,
        rule_ids,
      } = reward;

      // Retrieve configuration keys for asset and reward coin types.
      const assetPriceFeedKey = getPriceFeedKey(asset_coin_type);
      const rewardPriceFeedKey = getPriceFeedKey(reward_coin_type);
      const assetPoolKey = getPoolKey(asset_coin_type);
      const rewardPoolKey = getPoolKey(reward_coin_type);

      // Skip this reward if any necessary configuration is missing.
      if (
        !assetPriceFeedKey ||
        !rewardPriceFeedKey ||
        !assetPoolKey ||
        !rewardPoolKey
      ) {
        return acc;
      }

      // Initialize the grouping for the asset coin type if not present.
      if (!acc[asset_coin_type]) {
        acc[asset_coin_type] = [];
      }

      // Determine decimal precision based on the reward coin's configuration.
      const decimalPrecision = PriceFeedConfig[rewardPriceFeedKey].priceDecimal;

      // Convert raw reward amounts to human-readable values.
      const convertedClaimable =
        Number(user_claimable_reward) / Math.pow(10, decimalPrecision);
      const convertedClaimed =
        Number(user_claimed_reward) / Math.pow(10, decimalPrecision);

      // Append the reward details to the grouped rewards.
      acc[asset_coin_type].push({
        asset_id: pool[assetPoolKey].assetId.toString(),
        reward_id: pool[rewardPoolKey].assetId.toString(),
        reward_coin_type,
        user_claimable_reward: convertedClaimable,
        user_claimed_reward: convertedClaimed,
        rule_ids,
      });

      return acc;
    },
    {} as V3Type.GroupedRewards
  );

  // If prettyPrint is enabled, log the rewards data in a human-readable format.
  if (prettyPrint) {
    console.log(`-- V3 Available Rewards --`);
    for (const [assetCoinType, rewards] of Object.entries(groupedRewards)) {
      // Map the asset coin type to a human-readable identifier.
      const assetKey = getPriceFeedKey(assetCoinType) ?? assetCoinType;
      console.log(`Asset: ${assetKey}`);

      rewards.forEach((reward, idx) => {
        const rewardKey =
          getPriceFeedKey(reward.reward_coin_type) ?? reward.reward_coin_type;
        console.log(
          `  ${idx + 1}. Reward Coin: ${rewardKey}, ` +
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
    const normalizedType = normalizeStructTag(pool[key].type);
    const coinTypeWithoutHex = normalizedType.startsWith("0x") 
      ? normalizedType.slice(2) 
      : normalizedType;

    const rewardCoinTypeWithoutHex = rewardInfo.reward_coin_type.startsWith(
      "0x"
    )
      ? rewardInfo.reward_coin_type.slice(2)
      : rewardInfo.reward_coin_type;

    if (coinTypeWithoutHex === rewardCoinTypeWithoutHex) {
      matchedRewardFund = pool[key].rewardFundId;
      break;
    }
  }

  if (!matchedRewardFund) {
    console.log(
      `No matching rewardFund found for reward_coin_type: ${rewardInfo.reward_coin_type}`
    );
    return;
  } else {
    tx.moveCall({
      target: `${config.ProtocolPackage}::incentive_v3::claim_reward_entry`,
      arguments: [
        tx.object("0x06"),
        tx.object(config.IncentiveV3),
        tx.object(config.StorageId),
        tx.object(matchedRewardFund),
        tx.pure.vector("string", rewardInfo.asset_vector),
        tx.pure.vector("address", rewardInfo.rules_vector),
      ],
      typeArguments: [rewardInfo.reward_coin_type],
    });
  }
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
  const groupedRewards = await getAvailableRewardsWithoutOption(
    client,
    userAddress,
    false
  );
  if (!groupedRewards) {
    return tx;
  }

  // Object to store aggregated rewards by coin type
  const rewardMap = new Map<
    string,
    { assetIds: string[]; ruleIds: string[] }
  >();

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
  Array.from(rewardMap).map(async ([coinType, { assetIds, ruleIds }]) => {
    const claimInput: V3Type.ClaimRewardInput = {
      reward_coin_type: coinType,
      asset_vector: assetIds,
      rules_vector: ruleIds,
    };
    await claimRewardFunction(tx, claimInput);
  });

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

  // Find matching rewardFund from the pool config
  let matchedRewardFund: string | null = null;
  let toPoolConfig: PoolConfig | null = null;

  for (const key of Object.keys(pool) as (keyof Pool)[]) {
    // e.g. "0x2::sui::SUI".slice(2) => "2::sui::SUI"
    const normalizedType = normalizeStructTag(pool[key].type);
    const coinTypeWithoutHex = normalizedType.startsWith("0x") 
      ? normalizedType.slice(2) 
      : normalizedType;

    const rewardCoinTypeWithoutHex = rewardInfo.reward_coin_type.startsWith(
      "0x"
    )
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
      tx.pure.vector("address", rewardInfo.rules_vector),
    ],
    typeArguments: [toPoolConfig.type],
  });

  const [reward_coin]: any = tx.moveCall({
    target: "0x2::coin::from_balance",
    arguments: [reward_balance],
    typeArguments: [toPoolConfig.type],
  });

  if (noDepositCoinType.includes(rewardInfo.reward_coin_type)) {
    tx.transferObjects([reward_coin], userAddress);
  } else {
    const reward_coin_value = tx.moveCall({
      target: "0x2::coin::value",
      arguments: [reward_coin],
      typeArguments: [toPoolConfig.type],
    });

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
  const groupedRewards = await getAvailableRewardsWithoutOption(
    client,
    userAddress,
    false
  );
  if (!groupedRewards) {
    return tx;
  }
  // Object to store aggregated rewards by coin type
  const rewardMap = new Map<
    string,
    { assetIds: string[]; ruleIds: string[] }
  >();

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
  Array.from(rewardMap).map(async ([coinType, { assetIds, ruleIds }]) => {
    const claimInput: V3Type.ClaimRewardInput = {
      reward_coin_type: coinType,
      asset_vector: assetIds,
      rules_vector: ruleIds,
    };
    await claimRewardResupplyFunction(tx, claimInput, userAddress);
  });

  return tx;
}

export async function getBorrowFee(client: SuiClient): Promise<number> {
  const protocolConfig = await getConfig();
  const rawData: any = await client.getObject({
    id: protocolConfig.IncentiveV3,
    options: { showType: true, showOwner: true, showContent: true },
  });
  const borrowFee = rawData.data.content.fields.borrow_fee_rate;
  return Number(borrowFee) / 100;
}

/**
 * Calculate the sum of reward rates and collect reward coin types.
 *
 * @param rules - Array of enabled rules.
 * @param coinPriceMap - Mapping from coin types to their prices.
 * @returns An object containing the total rate sum and a list of reward coin types.
 */
function calculateRateSumAndCoins(
  rules: V3Type.ComputedRule[],
  coinPriceMap: Record<string, { value: number; decimals: string }>
): { rateSum: number; rewardCoins: string[] } {
  return rules.reduce(
    (acc, rule) => {
      const ruleRate = Number(rule.rate) / 1e27; // Convert from large integer representation
      const formattedRewardCoinType = formatCoinType(rule.reward_coin_type);
      const rewardPrice = coinPriceMap[formattedRewardCoinType]?.value || 0;
      const rewardDecimal =
        Number(coinPriceMap[formattedRewardCoinType]?.decimals) || 9;
      if (rewardPrice === 0) {
        console.log(
          `No price data found for reward coin type: ${rule.reward_coin_type} (${formattedRewardCoinType})`
        );
      }
      if (!coinPriceMap[formattedRewardCoinType]?.decimals) {
        console.log(`No decimal data found for reward coin type: ${rule.reward_coin_type} (${formattedRewardCoinType})`);
      }
      acc.rateSum += (ruleRate * rewardPrice) / Math.pow(10, rewardDecimal);
      acc.rewardCoins.push(rule.reward_coin_type);
      return acc;
    },
    { rateSum: 0, rewardCoins: [] as string[] }
  );
}

/**
 * Compute the final APY based on the aggregated rate and the pool's asset value.
 *
 * Formula: (rateSum * RATE_MULTIPLIER * SECONDS_PER_DAY * 365 * 100) / totalValue
 *
 * @param rateSum - Aggregated rate sum after conversion.
 * @param totalValue - Typically totalSupplyAmount * assetPrice.
 * @returns The APY value, or 0 if totalValue <= 0.
 */
function apyFormula(rateSum: number, totalValue: number): number {
  if (totalValue <= 0) return 0;
  return (rateSum * RATE_MULTIPLIER * SECONDS_PER_DAY * 365 * 100) / totalValue;
}

/**
 * Calculate APY information (supply and borrow) for a list of grouped asset pools.
 *
 * @param groupedPools - Grouped pool data after calling `groupByAssetCoinType`.
 * @param poolsInfo - Full pool information (usually fetched from backend or a mock).
 * @returns An array of APY result objects for each pool.
 */
export async function calculateApy(
  groupedPools: V3Type.GroupedAssetPool[],
  reserves: V3Type.ReserveData[],
  coinPriceMap: Record<string, { value: number; decimals: string }>
): Promise<V3Type.ApyResult[]> {
  return groupedPools.map((group) => {
    // Find the matching reserve data based on formatted coin type
    const matchingReserve = reserves.find(
      (r) =>
        formatCoinType(r.coin_type) === formatCoinType(group.asset_coin_type)
    );

    // Return default result if no matching reserve data or rules exist
    if (!matchingReserve || !group.rules?.length) {
      return {
        asset: group.asset,
        asset_coin_type: group.asset_coin_type,
        supplyIncentiveApyInfo: { rewardCoin: [], apy: 0 },
        borrowIncentiveApyInfo: { rewardCoin: [], apy: 0 },
      };
    }

    // Get asset price from the price map
    const assetPrice = coinPriceMap[group.asset_coin_type] || 0;
    const totalSupplyAmount = Number(matchingReserve.total_supply || 0);
    const borrowedAmount = Number(matchingReserve.total_borrow || 0);

    // Filter enabled rules (enabled and non-zero rate)
    const enabledRules = group.rules.filter(
      (rule) => rule.enable && rule.rate !== "0"
    );

    // Calculate Supply APY (option === 1)
    const supplyRules = enabledRules.filter((r) => r.option === 1);
    const { rateSum: supplyRateSum, rewardCoins: supplyRewardCoins } =
      calculateRateSumAndCoins(supplyRules, coinPriceMap);
    const supplyApy = apyFormula(
      supplyRateSum,
      (totalSupplyAmount * assetPrice.value) /
        Math.pow(10, Number(assetPrice.decimals))
    );

    // Calculate Borrow APY (option === 3)
    const borrowRules = enabledRules.filter((r) => r.option === 3);
    const { rateSum: borrowRateSum, rewardCoins: borrowRewardCoins } =
      calculateRateSumAndCoins(borrowRules, coinPriceMap);
    const borrowApy = apyFormula(
      borrowRateSum,
      (borrowedAmount * assetPrice.value) /
        Math.pow(10, Number(assetPrice.decimals))
    );

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
 * @param incentiveData - Data structure returned by the Sui client.
 * @returns A list of grouped asset pools, each containing an array of rules.
 */
export function groupByAssetCoinType(
  incentiveData: V3Type.IncentiveData
): V3Type.GroupedAssetPool[] {
  const groupedMap = new Map<string, V3Type.GroupedAssetPool>();
  const rawPools = incentiveData.data.content.fields.pools.fields.contents;

  rawPools.forEach((poolEntry) => {
    const assetPool = poolEntry.fields.value.fields;
    const formattedCoinType = formatCoinType(assetPool.asset_coin_type);
    const { asset } = assetPool;
    const rulesList = assetPool.rules.fields.contents;

    if (!groupedMap.has(formattedCoinType)) {
      groupedMap.set(formattedCoinType, {
        asset,
        asset_coin_type: formattedCoinType,
        rules: [],
      });
    }

    const groupedPool = groupedMap.get(formattedCoinType)!;
    rulesList.forEach((ruleEntry) => {
      const rule = ruleEntry.fields.value.fields;
      groupedPool.rules.push({
        option: rule.option,
        reward_coin_type: rule.reward_coin_type,
        rate: rule.rate,
        enable: rule.enable,
      });
    });
  });

  return Array.from(groupedMap.values());
}

/**
 * Main function to fetch on-chain data and compute APY information.
 *
 * @param client - SuiClient instance used to fetch the raw data.
 * @returns An array of final APY results for each pool.
 */
export async function getPoolApy(
  client: SuiClient
): Promise<V3Type.ApyResult[]> {
  // 1. Get configuration
  const config = await getConfig();
  const userAddress =
    "0xcda879cde94eeeae2dd6df58c9ededc60bcf2f7aedb79777e47d95b2cfb016c2";

  // 2. Fetch ReserveData, IncentiveV3 data, and APY calculations in parallel
  const [reserves, rawData, v2SupplyApy, v2BorrowApy] = await Promise.all([
    getReserveData(config.StorageId, client),
    client.getObject({
      id: config.IncentiveV3,
      options: { showType: true, showOwner: true, showContent: true },
    }),
    getIncentiveAPY(userAddress, client, 1),
    getIncentiveAPY(userAddress, client, 3),
  ]);

  // 3. Process incentive data
  const incentiveData = rawData as unknown as V3Type.IncentiveData;
  const groupedPools = groupByAssetCoinType(incentiveData);

  // 4. Build a set of all coin types needed for price lookup
  const coinTypeSet = new Set<string>();
  reserves.forEach((r: V3Type.ReserveData) => {
    coinTypeSet.add(formatCoinType(r.coin_type));
  });
  groupedPools.forEach((group) => {
    coinTypeSet.add(group.asset_coin_type);
    group.rules.forEach((rule) => {
      coinTypeSet.add(formatCoinType(rule.reward_coin_type));
    });
  });
  const coinTypes = Array.from(coinTypeSet);

  // 5. Fetch coin price data
  const coinPrices = await fetchCoinPrices(coinTypes);
  const coinPriceMap: Record<string, { value: number; decimals: string }> =
    coinPrices?.reduce((map, price) => {
      map[formatCoinType(price.coinType)] = {
        value: price.value,
        decimals: price.decimals,
      };
      return map;
    }, {} as Record<string, { value: number; decimals: string }>) || {};

  // 6. Calculate APY using grouped incentive data and reserve data with price info
  const v3Apy = await calculateApy(groupedPools, reserves, coinPriceMap);

  // 7. Merge the APY results
  return mergeApyResults(v3Apy, v2SupplyApy, v2BorrowApy);
}

// Merges two arrays of reward coins and ensures uniqueness
const mergeRewardCoins = (coins1: string[], coins2: string[]): string[] =>
  Array.from(new Set([...coins1, ...coins2]));

// Interface for V2 APY (Annual Percentage Yield) data structure
interface V2Apy {
  asset_id: number;
  apy: string;
  coin_types: string[];
}

// Function to merge APY results from V2 and V3
async function mergeApyResults(
  v3ApyResults: V3Type.ApyResult[], // V3 APY results
  v2SupplyApy: V2Apy[], // V2 supply APY data
  v2BorrowApy: V2Apy[] // V2 borrow APY data
): Promise<V3Type.ApyResult[]> {
  // Helper function to calculate APY as a percentage
  const calculateApyPercentage = (apyStr: string): number =>
    (Number(apyStr) / 1e27) * 100;

  // Helper function to get the asset's coin type, removing the "0x" prefix if present
  const getFormattedCoinType = (assetId: number): string => {
    const poolValues = Object.values(pool);
    const poolEntry = poolValues.find((entry) => entry.assetId === assetId);
    if (!poolEntry) return "";
    const normalizedType = normalizeStructTag(poolEntry.type);
    return normalizedType.startsWith("0x") ? normalizedType.slice(2) : normalizedType;
  };

  // Map to store merged V2 supply and borrow data by asset ID
  const v2DataMap = new Map<
    number,
    { supply: V3Type.IncentiveApyInfo; borrow: V3Type.IncentiveApyInfo }
  >();

  // Merge V2 supply data into v2DataMap
  v2SupplyApy.forEach((supplyData) => {
    const computedApy = calculateApyPercentage(supplyData.apy);
    const existingData = v2DataMap.get(supplyData.asset_id) || {
      supply: { apy: 0, rewardCoin: [] },
      borrow: { apy: 0, rewardCoin: [] },
    };
    existingData.supply.apy += computedApy;
    existingData.supply.rewardCoin = mergeRewardCoins(
      existingData.supply.rewardCoin,
      supplyData.coin_types
    );
    v2DataMap.set(supplyData.asset_id, existingData);
  });

  // Merge V2 borrow data into v2DataMap
  v2BorrowApy.forEach((borrowData) => {
    const computedApy = calculateApyPercentage(borrowData.apy);
    const existingData = v2DataMap.get(borrowData.asset_id) || {
      supply: { apy: 0, rewardCoin: [] },
      borrow: { apy: 0, rewardCoin: [] },
    };
    existingData.borrow.apy += computedApy;
    existingData.borrow.rewardCoin = mergeRewardCoins(
      existingData.borrow.rewardCoin,
      borrowData.coin_types
    );
    v2DataMap.set(borrowData.asset_id, existingData);
  });

  // Map to store the final merged APY results by asset ID
  const finalApyResultsMap = new Map<number, V3Type.ApyResult>();

  // First, add V3 data to the final map (by asset ID)
  v3ApyResults.forEach((v3Data) => {
    finalApyResultsMap.set(v3Data.asset, {
      ...v3Data,
      asset_coin_type: getFormattedCoinType(v3Data.asset),
    });
  });

  // Then, merge the V2 data into the final map
  v2DataMap.forEach((v2Data, assetId) => {
    if (finalApyResultsMap.has(assetId)) {
      const existingApyData = finalApyResultsMap.get(assetId)!;
      existingApyData.supplyIncentiveApyInfo.apy += v2Data.supply.apy;
      existingApyData.supplyIncentiveApyInfo.rewardCoin = mergeRewardCoins(
        existingApyData.supplyIncentiveApyInfo.rewardCoin,
        v2Data.supply.rewardCoin
      );
      existingApyData.borrowIncentiveApyInfo.apy += v2Data.borrow.apy;
      existingApyData.borrowIncentiveApyInfo.rewardCoin = mergeRewardCoins(
        existingApyData.borrowIncentiveApyInfo.rewardCoin,
        v2Data.borrow.rewardCoin
      );
    } else {
      finalApyResultsMap.set(assetId, {
        asset: assetId,
        // Ensure coin type is formatted correctly, regardless of whether it's a new asset or not
        asset_coin_type: getFormattedCoinType(assetId),
        supplyIncentiveApyInfo: { ...v2Data.supply },
        borrowIncentiveApyInfo: { ...v2Data.borrow },
      });
    }
  });

  // Return the final merged list of APY results
  return Array.from(finalApyResultsMap.values());
}
