import { Transaction } from "@mysten/sui/transactions";
import { getConfig, pool, ProFundsPoolInfo } from '../../address'
import { OptionType } from '../../types';
import { SuiClient } from "@mysten/sui/client";
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
export async function getIncentivePools(client: SuiClient, assetId: number, option: OptionType, user: string) {
    const config = await getConfig();
    const tx = new Transaction();
    // await updateOraclePTB(client, tx);
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
            console.log(pool)
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
            if (assetId == '15' && pool.funds == '8e25210077ab957b1afec39cbe9165125c93d279daef89ee29b97856385a3f3e') {
                assetId = '15extra' //Means DEEP Rewards
            }

            const availableDecimal = (BigInt(pool.available) / BigInt(10 ** 27)).toString();
            
            let availableFixed = (Number(availableDecimal) / 10 ** 9).toFixed(5); // Adjust for 5 decimal places
            if (assetId == '13extra' || assetId == '15extra' || assetId == '16') {
                availableFixed = (Number(availableDecimal) / 10 ** 6).toFixed(5); // coin for Decimals 6
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
                if (assetId == '15extra') {
                    acc[assetId] = { asset_id: '15', funds: pool.funds, available: availableFixed };
                }
            } else {
                acc[assetId].available = (parseFloat(acc[assetId].available) + parseFloat(availableFixed)).toFixed(5);
            }

            return acc;
        }, {} as { [key: string]: { asset_id: string, funds: string, available: string } });

        if (prettyPrint) {
            const coinDictionary: { [key: string]: string } = {
              "0": "Sui",
              "0extra": "Sui",
              "1": "wUSDC",
              "2": "USDT",
              "3": "WETH",
              "4": "CETUS",
              "5": "vSui",
              "5extra": "vSui",
              "6": "haSui",
              "7": "NAVX",
              "8": "WBTC",
              "9": "AUSD",
              "10": "nUSDC",
              "10extra": "nUSDC",
              "11": "ETH",
              "12": "USDY",
              "13": "NS",
              "13extra": "NS",
              "14": "stBTC",
              "15": "DEEP",
              "15extra": "DEEP",
              "16": "FDUSD",
              "17": "BLUE",
              "18": "BUCK",
              "19": "suiUSDT",
              "20": "stSUI",
              "21": "suiBTC",
            };
            console.log(checkAddress, " available rewards:");
            Object.keys(summedRewards).forEach((key) => {
              if (
                key == "0extra" ||
                key == "5extra" ||
                key == "10extra" ||
                key == "13extra" ||
                key == "7"
              ) {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} NAVX`
                );
                summedRewards[key].reward_id = '7'
                summedRewards[key].reward_coin_type = 'a99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX'
              } else if (key == "13extra") {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} NS`
                );
                summedRewards[key].reward_id = '13'
                summedRewards[key].reward_coin_type = '5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS'
              } else if (key == "15extra") {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} DEEP`
                );
                summedRewards[key].reward_id = '15'
                summedRewards[key].reward_coin_type = 'deeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP'
              } else if (key == "16") {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} FDUSD`
                );
                summedRewards[key].reward_id = '16'
                summedRewards[key].reward_coin_type = 'f16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD'
              } else if (key == "17") {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} BLUE`
                );
                summedRewards[key].reward_id = '17'
                summedRewards[key].reward_coin_type = 'e1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE'
              } else if (key == "20") {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} stSUI`
                );
                summedRewards[key].reward_id = '20'
                summedRewards[key].reward_coin_type = 'd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI'
              } else if (key == "21") {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} Deep`
                );
                summedRewards[key].reward_id = '15'
                summedRewards[key].reward_coin_type = 'deeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP'
              } else {
                console.log(
                  `${coinDictionary[key]}: ${summedRewards[key].available} vSui`
                );
                summedRewards[key].reward_id = '5'
                summedRewards[key].reward_coin_type = '549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT'
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
 * Claims the reward for a transaction block.
 * @param txb - The transaction block.
 * @param incentiveFundsPool - The incentive funds pool.
 * @param assetId - The asset ID.
 * @param option - The option type.
 */
export async function claimRewardFunction(txb: Transaction, incentiveFundsPool: string, assetId: string, option: OptionType) {
    const config = await getConfig();

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
   * Claims all available rewards for the specified account.
   * @returns PTB result
   */
export async function claimAllRewardsResupplyPTB(client: SuiClient, userToCheck: string, tx?: Transaction) {
  let txb = tx || new Transaction();

  const rewardsSupply: { [key: string]: Reward } = await getAvailableRewards(client, userToCheck, 1, false);
  // Convert the rewards object to an array of its values
  const rewardsArray: Reward[] = Object.values(rewardsSupply);
  for (const reward of rewardsArray) {
      await claimRewardResupplyFunction(txb, reward.funds, reward.asset_id, 1);
  }

  const rewardsBorrow: { [key: string]: Reward } = await getAvailableRewards(client, userToCheck, 3, false);
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
export async function claimRewardResupplyFunction(txb: Transaction, incentiveFundsPool: string, assetId: string, option: OptionType) {
  const config = await getConfig();

  const reward_balance = txb.moveCall({
      target: `${config.ProtocolPackage}::incentive_v2::claim_reward_non_entry`,
      arguments: [
          txb.object('0x06'),
          txb.object(config.IncentiveV2),
          txb.object(`0x${incentiveFundsPool}`),
          txb.object(config.StorageId),
          txb.pure.u8(Number(assetId)),
          txb.pure.u8(option),
      ],
      typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType ],
  })
    const [reward_coin]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [reward_balance],
        typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
    });
    const reward_coin_value = txb.moveCall({
      target: '0x2::coin::value',
      arguments: [reward_coin],
      typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
  });
  const foundPoolConfig = Object.values(pool).find(poolConfig => poolConfig.type === ProFundsPoolInfo[incentiveFundsPool].coinType);
  if (!foundPoolConfig) {
    throw new Error(`Pool configuration not found. incentiveFundsPool: ${incentiveFundsPool}, ProFundsPoolInfo: ${JSON.stringify(ProFundsPoolInfo?.[incentiveFundsPool])}`);
  }
  await depositCoin(txb, foundPoolConfig, reward_coin, reward_coin_value);
}