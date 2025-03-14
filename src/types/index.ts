export type NetworkType = "testnet" | "mainnet" | "devnet" | "localnet";

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
  WSOL: PoolConfig;
  LBTC: PoolConfig;
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
  from_token?: {
    address: string;
    decimals: number;
    price: number;
  };
  to_token?: {
    address: string;
    decimals: number;
    price: number;
  };
};

/** @deprecated */
export type FeeOption = {
  fee: number;
  receiverAddress: string;
};

export type SwapOptions = {
  baseUrl?: string;
  dexList?: Dex[];
  byAmountIn?: boolean;
  depth?: number;
  feeOption?: FeeOption;
  ifPrint?: boolean;
};

export type Chain = {
  id: number;
  name: string;
  iconUrl: string;
  nativeCurrency: Token;
  rpcUrl: {
    default: string;
  };
  blockExplorers: {
    default: {
      url: string;
      name: string;
    };
  };
};

export type Token = {
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  name: string;
  chainName: string;
  symbol: string;
  isSuggest: boolean;
  isVerify: boolean;
  category: string[];
};

export type BridgeSwapOptions = {
  slippageBps?: number;
  referrerBps?: number;
};

export type BridgeSwapQuote = {
  provider: string;
  amount_in: string;
  amount_out: string;
  slippage_bps: number;
  min_amount_out: string;
  from_token: Token;
  to_token: Token;
  total_fee: string;
  spend_duration: number;
  info_for_bridge: any;
  path: {
    token: Token;
    amount?: string;
  }[];
};

export type BridgeRoutes = {
  routes: BridgeSwapQuote[];
};

export type BridgeSwapStatus = "processing" | "completed" | "fail";

export type BridgeSwapTransaction = {
  id: string;
  status: BridgeSwapStatus;
  lastUpdateAt: string;
  sourceChainId: number;
  destChainId: number;
  walletSourceAddress: string;
  walletDestAddress: string;
  totalFeeAmount: string;
  sourceToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  destToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  hasSwap: boolean;
  bridgeProvider: string;
  bridgeStatus: BridgeSwapStatus;
  bridgeFromToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  bridgeToToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  bridgeFromAmount: string;
  bridgeToAmount: string;
  bridgeStartAt: string;
  bridgeEndAt?: string;
  bridgeFeeAmount: string;
  bridgeSourceTxHash: string;
  bridgeDestTxHash?: string;
  bridgeRefundTxHash?: string;
  explorerLink?: string;
  mayan?: any;
};
export type MigrateOptions = {
  apiKey?: string;
  baseUrl?: string;
  slippage?: number;
};

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

export type PoolRewards = {
  assetId: number;
  rewardType: number;
  rewards: { coinType: string; available: string }[];
};

export * as V3Type from './V3'
