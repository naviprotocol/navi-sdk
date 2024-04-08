export type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export type initializeParas = {
  mnemonic?: string;
  networkType?: string;
  wordLength?: 12 | 24;
  accountIndex?: number;
  numberOfAccounts?: number;
};

export interface Pool {
  Sui: PoolConfig;
  USDC: PoolConfig;
  USDT: PoolConfig;
  WETH: PoolConfig;
  CETUS: PoolConfig;
  vSui: PoolConfig;
  haSui: PoolConfig;
  NAVX: PoolConfig;
}

export interface PoolConfig {
  name: string; // Customized Names
  assetId: number;
  poolId: string; // Type must be ${PriceOraclePackage}::pool::Pool<${CoinType}>
  type: string; // CoinType
  reserveObjectId: string; // Get it from dynamic object, type must be ${ProtocolPackage}::storage::ReserveData
  borrowBalanceParentId: string; // Get it from dynamic object, type must be ${ProtocolPackage}::storage::TokenBalance
  supplyBalanceParentId: string; // Get it from dynamic object, type must be ${ProtocolPackage}::storage::TokenBalance
}

export interface CoinInfo {
  symbol: string;
  address: string;
  decimal: number;
}

export interface DeriveParas {
  account?: number;
  change?: boolean;
  addressIndex?: number;
}

export enum OptionType {
  OptionSupply = 1,
  OptionWithdraw = 2,
  OptionBorrow = 3,
  OptionRepay = 4,
}