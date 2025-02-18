// 1) This part is to enable reuse for Reward and ClaimRewardInput interfaces.
interface BaseRewardFields {
  asset_coin_type: string; // The coin type of the asset being rewarded.
  reward_coin_type: string; // The coin type used for the reward.
  rule_ids: string[]; // An array of rule IDs associated with the reward.
}

// 2) This part is to enable reuse for GroupedAssetPool, ComputedDataItem, and ComputedRule interfaces.
interface BaseRule {
  ruleId: string;
  option: number; // supply：1， borrow: 3
  optionType?: string; // supply：1， borrow: 3
  rewardCoinType: string; 
  rewardSymbol?: string; 
  rate: string;
  enable: boolean; // Indicates if the rule is enabled or active.
}

/** ========== Interfaces ========== */

// Original Reward interface
export interface Reward extends BaseRewardFields {
  user_claimable_reward: string | number; 
  user_claimed_reward?: string; 
  option?: number;
}

// Original ClaimRewardInput interface
export interface ClaimRewardInput {
  reward_coin_type: string;
  asset_vector: string[];
  rules_vector: string[];
}

// Original ProcessedReward interface
// This interface differs significantly from BaseRewardFields (lacks asset_coin_type, uses numeric types).
export interface ProcessedReward {
  asset_id: string;
  reward_id: string;
  reward_coin_type: string; // The coin type used for the reward.
  option?: number;
  rule_ids: string[]; // An array of rule IDs associated with the reward.
  user_claimable_reward: number; 
  user_claimed_reward?: number; 
}

// Original GroupedRewards interface
export interface GroupedRewards {
  [asset_coin_type: string]: ProcessedRewardsList; // A map where the key is the asset coin type, and the value is a list of processed rewards.
}

// Original RewardsList and ProcessedRewardsList interfaces
export interface RewardsList extends Array<Reward> {} // A list of Reward objects.
export interface ProcessedRewardsList extends Array<ProcessedReward> {} // A list of ProcessedReward objects.

// Original GroupedAssetPool interface
export interface GroupedAssetPool {
  asset: number; // The asset amount or value.
  assetSymbol: string; // The coin type of the asset.
  assetCoinType: string; // The coin type of the asset.
  rules: BaseRule[]; // An array of rules .
}

// Original ComputedRule interface
export interface ComputedRule extends BaseRule {
  // Additional fields can be added here if necessary.
}

// Original ComputedDataItem interface
interface ComputedDataItem {
  asset: number; 
  asset_coin_type: string; 
  rules?: ComputedRule[]; // An optional array of computed rules.
}

// Original IncentiveApyInfo interface
export interface IncentiveApyInfo {
  rewardCoin: string[]; // An array of coin types used for rewards.
  apy: number; // Annual percentage yield (APY) for the incentive.
}

// Original ApyResult interface
export interface ApyResult {
  asset: number; 
  assetCoinType: string; 
  supplyIncentiveApyInfo: IncentiveApyInfo; 
  borrowIncentiveApyInfo: IncentiveApyInfo; 
}

// Original Rule, AssetPool, Pools, and IncentiveData interfaces

interface Rule {
  enable: boolean; 
  global_index: string; 
  id: { id: string }; 
  last_update_at: string; 
  max_rate: string; 
  option: number; 
  rate: string; 
  reward_coin_type: string; 
}

interface AssetPool {
  asset: number; 
  asset_coin_type: string; 
  id: { id: string }; 
  rules: {
    fields: {
      contents: Array<{
        fields: {
          key: string; 
          value: { fields: Rule }; 
        };
      }>;
    };
  };
}

interface Pools {
  fields: {
    contents: Array<{
      fields: {
        key: string; // The asset coin type key.
        value: {
          fields: AssetPool; // The associated asset pool details.
        };
      };
    }>;
  };
}

export interface IncentiveData {
  data: {
    content: {
      fields: {
        pools: Pools; // The pools containing asset and incentive details.
      };
    };
  };
}
export interface ReserveData {
  id: number;
  oracle_id: number;
  coin_type: string;
  supply_cap: string;
  borrow_cap: string;
  supply_rate: string;
  borrow_rate: string;
  supply_index: string;
  borrow_index: string;
  total_supply: string;
  total_borrow: string;
  last_update_at: string;
  ltv: string;
  treasury_factor: string;
  treasury_balance: string;
  base_rate: string;
  multiplier: string;
  jump_rate_multiplier: string;
  reserve_factor: string;
  optimal_utilization: string;
  liquidation_ratio: string;
  liquidation_bonus: string;
  liquidation_threshold: string;
}