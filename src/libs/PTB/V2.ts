import { Transaction } from "@mysten/sui/transactions";
import {
  getConfig,
  pool,
  ProFundsPoolInfo,
  PriceFeedConfig,
} from "../../address";
import { OptionType } from "../../types";
import { SuiClient } from "@mysten/sui/client";
import { normalizeStructTag } from '@mysten/sui/utils'
import { moveInspect } from "../CallFunctions";
import { registerStructs, updateOraclePTB } from "./commonFunctions";

import { depositCoin } from "./commonFunctions";

interface Reward {
  asset_id: string;
  funds: string;
  available: string;
}

/**
 * Retrieves the incentive pools for a given asset and option.
 * @param assetId - The ID of the asset.
 * @param option - The option type.
 * @param user - (Optional) The user's address. If provided, the rewards claimed by the user and the total rewards will be returned.
 * @returns The incentive pools information.
 */
export async function getIncentivePools(
  client: SuiClient,
  assetId: number,
  option: OptionType,
  user: string
) {
  const config = await getConfig();
  const tx = new Transaction();
  // await updateOraclePTB(client, tx);
  const result: any = await moveInspect(
    tx,
    client,
    user,
    `${config.uiGetter}::incentive_getter::get_incentive_pools`,
    [
      tx.object("0x06"), // clock object id
      tx.object(config.IncentiveV2), // the incentive object v2
      tx.object(config.StorageId), // object id of storage
      tx.pure.u8(assetId),
      tx.pure.u8(option),
      tx.pure.address(user), // If you provide your address, the rewards that have been claimed by your address and the total rewards will be returned.
    ],
    [], // type arguments is null
    "vector<IncentivePoolInfo>" // parse type
  );
  return result[0];
}

// Attach asset symbols
interface FormattedData {
  [key: string]: {
    asset_id: string;
    funds: string;
    available: string;
    reward_id: string;
    reward_coin_type: string;
    asset_symbol?: string;
  };
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
export async function getAvailableRewards(
  client: SuiClient,
  checkAddress: string,
  option: OptionType = 1,
  prettyPrint = true
) {
  registerStructs();

  const assetIds = Array.from(
    { length: Number(Object.keys(pool).length) },
    (_, i) => i
  );

  try {
    // Fetch incentive pools for each asset ID
    const incentivePools = await Promise.all(
      assetIds.map((assetId) =>
        getIncentivePools(client, assetId, option, checkAddress)
      )
    );
    const allPools = incentivePools.flat();

    // Filter active pools with available rewards
    const activePools = allPools.filter(
      (pool) => pool.available.trim() !== "0"
    );
    const fundIds = [...new Set(activePools.map((item) => item.funds))];

    // Fetch fund details
    const funds = await client.multiGetObjects({
      ids: fundIds,
      options: { showContent: true },
    });

    // Extract relevant data
    const fundDetails = funds.map((item) => ({
      funds: item?.data?.objectId,
      reward_coin_type: (item.data?.content as any)?.fields?.coin_type?.fields?.name,
      reward_coin_oracle_id: (item.data?.content as any)?.fields?.oracle_id,
    }));

    // Merge extracted data with active pools
    const mergedPools = activePools.map((pool) => {
      const matchedFund = fundDetails.find(
        (fund) => fund.funds === `0x${pool.funds}`
      );
      return {
        ...pool,
        reward_coin_type: matchedFund?.reward_coin_type ?? null,
        reward_coin_oracle_id: matchedFund?.reward_coin_oracle_id ?? null,
      };
    });
  
    // Build price feed map
    const priceFeedMap: Record<string, number> = Object.values(
      PriceFeedConfig
    ).reduce((acc: Record<string, number>, feed) => {
      acc[feed.coinType] = feed.priceDecimal;
      return acc;
    }, {} as Record<string, number>);

    // Compute available rewards with decimal conversion
    interface ProcessedData {
      [key: string]: {
        asset_id: string;
        funds: string;
        available: string;
        reward_id: string;
        reward_coin_type: string;
      };
    }

    const processedData: ProcessedData = mergedPools.reduce((acc, pool) => {
      const priceDecimal = priceFeedMap[`0x${pool.reward_coin_type}`] ?? null;
      const availableDecimal =
        priceDecimal !== null
          ? Number(BigInt(pool.available) / BigInt(10 ** 27)) /
            10 ** priceDecimal
          : null;

      const assetId = parseInt(pool.asset_id, 10);
      const key = `${assetId}-${option}-${pool.reward_coin_type}`;
      if (acc[key]) {
        
        const existingAvailable = parseFloat(acc[key].available);
        const newAvailable = parseFloat(availableDecimal?.toFixed(6) ?? "0");
        acc[key].available = (existingAvailable + newAvailable).toFixed(6);
      } else {
        // if not existing
        acc[key] = {
          asset_id: assetId,
          funds: pool.funds,
          available: availableDecimal?.toFixed(6) ?? "0",
          reward_id: pool.reward_coin_oracle_id?.toString() ?? "",
          reward_coin_type: pool.reward_coin_type,
        };
      }

      return acc;
    }, {} as ProcessedData);

    // Map asset IDs to their symbols
    const assetSymbolMap: Record<string, string> = Object.values(pool).reduce(
      (acc: Record<string, string>, poolConfig) => {
        acc[poolConfig.assetId.toString()] = poolConfig.name;
        return acc;
      },
      {} as Record<string, string>
    );

    const formattedData: FormattedData = Object.keys(processedData).reduce(
      (acc, assetId) => {
        acc[assetId] = {
          ...processedData[assetId],
          asset_symbol: assetSymbolMap[assetId] ?? null,
        };
        return acc;
      },
      {} as FormattedData
    );

    // Pretty print the results if required
    if (prettyPrint) {
      console.log(`-- V2 available rewards --`);
      console.log(`address: ${checkAddress}`);
      Object.keys(formattedData).forEach((assetId) => {
        const assetData = formattedData[assetId];
        console.log(`Asset: ${assetData.asset_symbol}`);
        console.log(
          `  ${Object.keys(formattedData).indexOf(assetId) + 1}. Reward Coin: ${
            assetData.reward_coin_type
          }, Option: ${option}, Claimable: ${assetData.available}`
        );
      });
    }

    return formattedData;
  } catch (error) {
    console.error("Failed to get available rewards:", error);
    throw error;
  }
}

/**
 * Claims all available rewards for the specified account.
 * @returns PTB result
 */
export async function claimAllRewardsPTB(
  client: SuiClient,
  userToCheck: string,
  tx?: Transaction
) {
  let txb = tx || new Transaction();

  const rewardsSupply: { [key: string]: Reward } = await getAvailableRewards(
    client,
    userToCheck,
    1,
    false
  );
  // Convert the rewards object to an array of its values
  const rewardsArray: Reward[] = Object.values(rewardsSupply);
  for (const reward of rewardsArray) {
    await claimRewardFunction(txb, reward.funds, reward.asset_id, 1);
  }

  const rewardsBorrow: { [key: string]: Reward } = await getAvailableRewards(
    client,
    userToCheck,
    3,
    false
  );
  // Convert the rewards object to an array of its values
  const rewardsBorrowArray: Reward[] = Object.values(rewardsBorrow);
  for (const reward of rewardsBorrowArray) {
    await claimRewardFunction(txb, reward.funds, reward.asset_id, 3);
  }

  return txb;
}

/**
 * Claims the reward for a transaction block.
 * @param txb - The transaction block.
 * @param incentiveFundsPool - The incentive funds pool.
 * @param assetId - The asset ID.
 * @param option - The option type.
 */
export async function claimRewardFunction(
  txb: Transaction,
  incentiveFundsPool: string,
  assetId: string,
  option: OptionType
) {
  const config = await getConfig();

  txb.moveCall({
    target: `${config.ProtocolPackage}::incentive_v2::claim_reward`,
    arguments: [
      txb.object("0x06"),
      txb.object(config.IncentiveV2),
      txb.object(`0x${incentiveFundsPool}`),
      txb.object(config.StorageId),
      txb.pure.u8(Number(assetId)),
      txb.pure.u8(option),
    ],
    typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
  });
}

/**
 * Claims all available rewards for the specified account.
 * @returns PTB result
 */
export async function claimAllRewardsResupplyPTB(
  client: SuiClient,
  userToCheck: string,
  tx?: Transaction
) {
  let txb = tx || new Transaction();

  const rewardsSupply: { [key: string]: Reward } = await getAvailableRewards(
    client,
    userToCheck,
    1,
    false
  );
  // Convert the rewards object to an array of its values
  const rewardsArray: Reward[] = Object.values(rewardsSupply);
  for (const reward of rewardsArray) {
    await claimRewardResupplyFunction(txb, reward.funds, reward.asset_id, 1);
  }

  const rewardsBorrow: { [key: string]: Reward } = await getAvailableRewards(
    client,
    userToCheck,
    3,
    false
  );
  // Convert the rewards object to an array of its values
  const rewardsBorrowArray: Reward[] = Object.values(rewardsBorrow);
  for (const reward of rewardsBorrowArray) {
    await claimRewardResupplyFunction(txb, reward.funds, reward.asset_id, 3);
  }

  return txb;
}

/**
 * Claims the reward for a transaction block.
 * @param txb - The transaction block.
 * @param incentiveFundsPool - The incentive funds pool.
 * @param assetId - The asset ID.
 * @param option - The option type.
 */
export async function claimRewardResupplyFunction(
  txb: Transaction,
  incentiveFundsPool: string,
  assetId: string,
  option: OptionType
) {
  const config = await getConfig();

  const reward_balance = txb.moveCall({
    target: `${config.ProtocolPackage}::incentive_v2::claim_reward_non_entry`,
    arguments: [
      txb.object("0x06"),
      txb.object(config.IncentiveV2),
      txb.object(`0x${incentiveFundsPool}`),
      txb.object(config.StorageId),
      txb.pure.u8(Number(assetId)),
      txb.pure.u8(option),
    ],
    typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
  });
  const [reward_coin]: any = txb.moveCall({
    target: "0x2::coin::from_balance",
    arguments: [reward_balance],
    typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
  });
  const reward_coin_value = txb.moveCall({
    target: "0x2::coin::value",
    arguments: [reward_coin],
    typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
  });
  const foundPoolConfig = Object.values(pool).find(
    (poolConfig) =>
      normalizeStructTag(poolConfig.type) === normalizeStructTag(ProFundsPoolInfo[incentiveFundsPool].coinType)
  );
  if (!foundPoolConfig) {
    throw new Error(
      `Pool configuration not found. incentiveFundsPool: ${incentiveFundsPool}, ProFundsPoolInfo: ${JSON.stringify(
        ProFundsPoolInfo?.[incentiveFundsPool]
      )}`
    );
  }
  await depositCoin(txb, foundPoolConfig, reward_coin, reward_coin_value);
}
