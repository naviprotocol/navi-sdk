import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { bcs } from "@mysten/sui.js/bcs";

import { moveInspect } from "../CallFunctions";
import { getPoolsInfo } from "../PoolInfo";
// import { getConfig, PriceFeedConfig } from "../../address";
import { V3Type, PoolData } from "../../types";

///////////////////delete after launch/////////////////////////////////////////////
export interface IPriceFeed {
  oracleId: number;
  maxTimestampDiff: number;
  priceDiffThreshold1: number;
  priceDiffThreshold2: number;
  maxDurationWithinThresholds: number;
  maximumAllowedSpanPercentage: number;
  maximumEffectivePrice: number;
  minimumEffectivePrice: number;
  historicalPriceTTL: number;
  coinType: string;
  feedId: string;

  supraPairId: number;
  pythPriceFeedId: string;
  pythPriceInfoObject: string;

  priceDecimal: number;
  expiration: number;
}
export interface Pool {
    Sui: PoolConfig;
    USDC: PoolConfig;
  }
  
  export interface PoolConfig {
    name: string;
    assetId: number;
    poolId: string;
    type: string;
    rewardFund: string;
    reserveObjectId: string;
    borrowBalanceParentId: string; 
    supplyBalanceParentId: string; 
  }

export const PriceFeedConfig: { [key: string]: IPriceFeed } = {
  SUI: {
    oracleId: 0,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 3000000000, // 3 = 3 * 1e9 = 3000000000
    minimumEffectivePrice: 100000000, // 0.1 = 0.1 * 1e9 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "b954dfc209b5536828fdc82dd451029d13c7b591dcbba38a5079ca912becaa5f::SUI_TEST::SUI_TEST",
    feedId:
      "0x2cab9b151ca1721624b09b421cc57d0bb26a1feb5da1f821492204b098ec35c9",
    supraPairId: 90, 
    pythPriceFeedId:
      "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744", 
    pythPriceInfoObject:
      "0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37",
    priceDecimal: 9,
    expiration: 30,
  },
  USDC: {
    oracleId: 1,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 100000, // 0.1 = 0.1 * 1e6 = 100000
    historicalPriceTTL: 5 * 60 * 1000, 
    coinType:
      "a3c8f6988cf4694e5b032f82934a6ec5e848a6cb3af302a12b23521a49d27f95::USDC_TEST::USDC_TEST",
    feedId:
      "0x70a79226dda5c080378b639d1bb540ddea64761629aa4ad7355d79266d55af61",
    supraPairId: 47, 
    pythPriceFeedId:
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", 
    pythPriceInfoObject:
      "0x5dec622733a204ca27f5a90d8c2fad453cc6665186fd5dff13a83d0b6c9027ab",
    priceDecimal: 6,
    expiration: 30,
  },
};

export const pool: Pool = {
    Sui: {
        name: 'SUI',
        assetId: 0,
        poolId: '0x62abd45eac3826d1aa0d74aa1e91717051fd9fa5137ea301793e6e28f76dada6',
        type: '0xb954dfc209b5536828fdc82dd451029d13c7b591dcbba38a5079ca912becaa5f::SUI_TEST::SUI_TEST',
        rewardFund: '0x5c750b581486a9189b411d945b4c59ec0a3fa9f10d6137a3551272283a54a58e',
        reserveObjectId: '0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf',
        borrowBalanceParentId: '0xe7ff0daa9d090727210abe6a8b6c0c5cd483f3692a10610386e4dc9c57871ba7',
        supplyBalanceParentId: '0x589c83af4b035a3bc64c40d9011397b539b97ea47edf7be8f33d643606bf96f8',
    },
    USDC: {
        name: 'USDC',
        assetId: 1,
        poolId: '0x10531a877953ce83d0474b1c86c0a2970d57a61880fea378babdd73420b88fee',
        type: '0xa3c8f6988cf4694e5b032f82934a6ec5e848a6cb3af302a12b23521a49d27f95::USDC_TEST::USDC_TEST',
        rewardFund: '0x8a650f587923804b98572b63029d4a5d1b2a0d6761ac3e4f8a5fbd03cb164057',
        reserveObjectId: '0xb8c5eab02a0202f638958cc79a69a2d30055565caad1684b3c8bbca3bddcb322',
        borrowBalanceParentId: '0xc14d8292a7d69ae31164bafab7ca8a5bfda11f998540fe976a674ed0673e448f',
        supplyBalanceParentId: '0x7e2a49ff9d2edd875f82b76a9b21e2a5a098e7130abfd510a203b6ea08ab9257',
    },
}

export const getConfig = async () => {

    // await updateCacheIfNeeded();
    // const protocolPackage = getPackageCache();
    const protocolPackage = '0x51f6f3d36b0d044b4d88fe7aa581982fd18468776d81e22bc8a0edb26b409f45';
    return {
        ProtocolPackage: protocolPackage,
        // StorageId: '0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe',
        // Incentive: '0xaaf735bf83ff564e1b219a0d644de894ef5bdc4b2250b126b2a46dd002331821',
        // IncentiveV2: '0xf87a8acb8b81d14307894d12595541a73f19933f88e1326d5be349c7a6f7559c', // The new incentive version: V2
        
        StorageId: '0x24dc75392de4f9221aac6a5791b54b1d27254cfb0c6846a63118f1a31a00ecc9',
        Incentive: '0xaaf735bf83ff564e1b219a0d644de894ef5bdc4b2250b126b2a46dd002331821',
        IncentiveV2: '0x5a364ae4f021a482ce210dce2181cf8c7ad5ba51ba9f010f8734e21b4214bafb', 
        IncentiveV3: '0x7bed31bef57fa4553a83eaaec0b0fb778b9ce7e6ee0dbad502020a8c32b588af', 
        
        PriceOracle: '0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef',
        ReserveParentId: '0xe6d4c6610b86ce7735ea754596d71d72d10c7980b5052fc3c8cdf8d09fea9b4b', // get it from storage object id. storage.reserves
        uiGetter: '0x1ee4061d3c78d6244b5f32eb4011d081e52f5f4b484ca4a84de48b1146a779f7',
        flashloanConfig: '0x3672b2bf471a60c30a03325f104f92fb195c9d337ba58072dce764fe2aa5e2dc',
        flashloanSupportedAssets: '0x6c8fc404b4f22443302bbcc50ee593e5b898cc1e6755d72af0a6aab5a7a6f6d3',
    };
};
///////////////////delete after launch/////////////////////////////////////////////
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
  ): Promise<V3Type.GroupedRewards> {

    const protocolConfig = await getConfig();
  
    registerStructs();
  
    const tx = new Transaction();
    const claimableRewardsCall = tx.moveCall({
      // TODO: change get_user_claimable_rewards2 -> get_user_claimable_rewards
      target: `${protocolConfig.ProtocolPackage}::incentive_v3::get_user_claimable_rewards2`,
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
      // TODO: change parse_claimable_rewards2 -> parse_claimable_rewards2
      `${protocolConfig.ProtocolPackage}::incentive_v3::parse_claimable_rewards2`,
      [claimableRewardsCall],
      [],
      "vector<ClaimableReward>"
    );
  
    if (!rewardsData) {
      throw new Error(
        "Failed to fetch rewards data: moveInspect returned undefined."
      );
    }
  
    const rawRewards: V3Type.RewardsList = rewardsData[0];
  
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
  
        // Map reward coin types to their respective configuration for precision.
        const coinKey = Object.keys(PriceFeedConfig).find(
          (key) => PriceFeedConfig[key].coinType === reward_coin_type
        );
  
        // Determine decimal precision based on the coin configuration.
        const decimalPrecision = coinKey
          ? PriceFeedConfig[coinKey].priceDecimal
          : 0; // Default precision if the coin type is not found.
  
        // Convert raw reward amounts to human-readable values.
        const convertedClaimable =
          Number(user_claimable_reward) / Math.pow(10, decimalPrecision);
        const convertedClaimed =
          Number(user_claimed_reward) / Math.pow(10, decimalPrecision);
  
        // Append the reward details to the grouped rewards.
        acc[asset_coin_type].push({
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
          (key) => PriceFeedConfig[key].coinType === assetCoinType
        );
        console.log(`Asset: ${assetCoinKey}`);
  
        rewards.forEach((reward, idx) => {
          const rewardCoinKey = Object.keys(PriceFeedConfig).find(
            (key) => PriceFeedConfig[key].coinType === reward.reward_coin_type
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
 * @param tx The Transaction object to append commands to.
 * @param rewardInfo The minimal reward info, including asset_coin_type, reward_coin_type, rule_ids
 */
export async function claimRewardFunction(
    tx: Transaction,
    rewardInfo: V3Type.ClaimRewardInput
  ): Promise<void> {
    const config = await getConfig();
    console.log("Claiming reward:", rewardInfo);
  
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
        matchedRewardFund = pool[key].rewardFund;
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
        tx.pure.vector("address", rewardInfo.rule_ids)
      ],
      typeArguments: [rewardInfo.asset_coin_type, rewardInfo.reward_coin_type]
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
    const tx = existingTx || new Transaction();
  
    const groupedRewards = await getAvailableRewards(client, userAddress);
  
    // Iterate over each asset_coin_type
    for (const [assetCoinType, rewardList] of Object.entries(groupedRewards)) {
      for (const rewardItem of rewardList) {
        const claimInput: V3Type.ClaimRewardInput = {
          asset_coin_type: assetCoinType,
          reward_coin_type: rewardItem.reward_coin_type,
          rule_ids: rewardItem.rule_ids
        };
  
        await claimRewardFunction(tx, claimInput);
      }
    }

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
 * @returns An array of FinalResult objects containing APY info for each pool
 */
export async function calculateApy(
  groupedPools: V3Type.GroupedAssetPool[],
  poolsInfo: PoolData[]
): Promise<V3Type.FinalResult[]> {
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
 * @param poolsInfo - The pool data used for APY calculations (from backend or mock data)
 * @param objectId - The on-chain object ID to query
 * @returns An array of FinalResult items representing APY for each pool
 */
export async function getPoolApy(
  client: SuiClient,
  poolsInfo: PoolData[],
): Promise<V3Type.FinalResult[]> {
  // 1. Fetch raw incentive data from on-chain
  const protocolConfig = await getConfig();

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
