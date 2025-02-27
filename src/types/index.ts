export type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export type initializeParams = {
  mnemonic?: string;
  networkType?: string;
  wordLength?: 12 | 24;
  accountIndex?: number;
  numberOfAccounts?: number;
  privateKeyList?: string[];
};

export interface Pool {
  Sui: PoolConfig;
  // AFSUI: PoolConfig;
  // USDYS: PoolConfig;
  // TDAI: PoolConfig;
  // AUSDs: PoolConfig;
  USDT: PoolConfig;
  WETH: PoolConfig;
  CETUS: PoolConfig;
  vSui: PoolConfig;
  haSui: PoolConfig;
  NAVX: PoolConfig;
  WBTC: PoolConfig;
  AUSD: PoolConfig;
  wUSDC: PoolConfig;
  nUSDC: PoolConfig;
  ETH: PoolConfig;
  USDY: PoolConfig;
  NS: PoolConfig;
  LorenzoBTC: PoolConfig;
  DEEP: PoolConfig;
  FDUSD: PoolConfig;
  BLUE: PoolConfig;
  BUCK: PoolConfig;
  suiUSDT: PoolConfig;
  stSUI: PoolConfig;
  suiBTC: PoolConfig;
}

export interface PoolConfig {
  name: string; // Customized Names
  assetId: number;
  poolId: string; // Type must be ${PriceOraclePackage}::pool::Pool<${CoinType}>
  type: string; // CoinType
  reserveObjectId: string; // Get it from dynamic object, type must be ${ProtocolPackage}::storage::ReserveData
  borrowBalanceParentId: string; // Get it from dynamic object, type must be ${ProtocolPackage}::storage::TokenBalance
  supplyBalanceParentId: string; // Get it from dynamic object, type must be ${ProtocolPackage}::storage::TokenBalance
  rewardFundId: string; // Get it from dynamic object, type must be ${ProtocolPackage}::storage::TokenBalance
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

export enum Dex {
  CETUS = "cetus",
  TURBOS = "turbos",
  KRIYA_V2 = "kriyaV2",
  KRIYA_V3 = "kriyaV3",
  AFTERMATH = "aftermath",
  DEEPBOOK = "deepbook",
  BLUEFIN = "bluefin",
  VSUI = "vSui",
  HASUI = "haSui",
}

export type Quote = {
  routes: any[];
  amount_in: string;
  amount_out: string;
  from: string;
  target: string;
  dexList: Dex[];
}

export type FeeOption = {
  fee: number;
  receiverAddress: string;
}

export type SwapOptions = {
  baseUrl?: string;
  dexList?: Dex[];
  byAmountIn?: boolean;
  depth?: number;
  feeOption?: FeeOption;
  ifPrint?: boolean;
};

export type MigrateOptions = {
  apiKey?: string;
  baseUrl?: string;
  slippage?: number;
}

// TypeScript Interface Definitions
interface OracleInfo {
  decimal: number;
  value: string;
  price: string;
  oracleId: number;
  valid: boolean;
}

interface IncentiveApyInfo {
  vaultApr: string;
  boostedApr: string;
  stakingYieldApy: string;
  rewardCoin: string[];
  apy: string;
}

export interface PoolData {
  borrowCapCeiling: string;
  coinType: string;
  currentBorrowIndex: string;
  currentBorrowRate: string;
  currentSupplyIndex: string;
  currentSupplyRate: string;
  id: number;
  isIsolated: boolean;
  lastUpdateTimestamp: string;
  ltv: string;
  oracleId: number;
  reserveFieldA: string;
  reserveFieldB: string;
  reserveFieldC: string;
  supplyCapCeiling: string;
  treasuryBalance: string;
  treasuryFactor: string;
  totalSupplyAmount: string;
  minimumAmount: string;
  leftSupply: string;
  validBorrowAmount: string;
  borrowedAmount: string;
  leftBorrowAmount: string;
  availableBorrow: string;
  oracle: OracleInfo;
  supplyIncentiveApyInfo: IncentiveApyInfo;
  borrowIncentiveApyInfo: IncentiveApyInfo;
}

export interface PoolsResponse {
  data: PoolData[];
  code: number;
}


export * as V3Type from './V3'