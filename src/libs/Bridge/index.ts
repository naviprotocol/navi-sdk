import {
  Chain,
  Token,
  BridgeSwapOptions,
  BridgeSwapQuote,
  BridgeSwapTransaction,
} from "../../types";
import * as mayan from "./providers/mayan";
import { WalletConnection } from "./providers/mayan";
import { apiInstance, config } from "./config";

export { config };

export async function getSupportChains(): Promise<Chain[]> {
  const res = await apiInstance.get<{
    data: {
      chains: Chain[];
    };
  }>("/chains/list");
  return res.data.data.chains;
}

export async function getSupportTokens(
  chainId: number,
  page: number = 1,
  pageSize: number = 100
): Promise<Token[]> {
  const res = await apiInstance.get<{
    data: {
      list: Token[];
    };
  }>("/coins/support-token-list", {
    params: {
      chain: chainId,
      page,
      pageSize,
      scene: "bridge",
    },
  });
  return res.data.data.list;
}

export async function searchSupportTokens(
  chainId: number,
  keyword: string
): Promise<Token[]> {
  const res = await apiInstance.get<{
    data: {
      list: Token[];
    };
  }>("/coins/search", {
    params: {
      chain: chainId,
      keyword,
      page: 1,
      pageSize: 30,
      scene: "bridge",
    },
  });
  return res.data.data.list;
}

export async function getQuote(
  from: Token,
  to: Token,
  amount: string | number,
  options?: BridgeSwapOptions
) {
  const res = await apiInstance.get<{
    data: {
      routes: BridgeSwapQuote[];
    };
  }>("/bridge-swap/find_routes", {
    params: {
      from: from.address,
      to: to.address,
      fromChain: from.chainId,
      toChain: to.chainId,
      amount,
      slippageBps: options?.slippageBps,
      referrerBps: options?.referrerBps,
    },
  });
  // temporary fix 
  const rtn = res.data.data;
  rtn.routes.forEach((router: any) => {
    if (router.from_token.chain) {
      router.from_token.chainId = parseInt(router.from_token.chain);
    }
    if (router.to_token.chain) {
      router.to_token.chainId = parseInt(router.to_token.chain);
    }
  })
  return rtn
}

export async function getTransaction(hash: string) {
  const res = await apiInstance.get<{
    data: {
      transaction: BridgeSwapTransaction;
    };
  }>(`/bridge-swap/transaction/${hash}`);
  return res.data.data.transaction;
}

export async function getWalletTransactions(
  address: string,
  page: number = 1,
  limit: number = 10
) {
  const res = await apiInstance.get<{
    data: {
      transactions: BridgeSwapTransaction[];
    };
  }>(`/bridge-swap/transactions/list`, {
    params: {
      address,
      page,
      limit,
    },
  });
  return res.data.data;
}

export async function swap(
  quote: BridgeSwapQuote,
  fromAddress: string,
  toAddress: string,
  walletConnection: WalletConnection,
  referrerAddresses?: {
    sui?: string;
    evm?: string;
    solana?: string;
  }
): Promise<BridgeSwapTransaction> {
  const startAt = new Date().toISOString();
  const hash = await mayan.swap(
    quote,
    fromAddress,
    toAddress,
    walletConnection,
    referrerAddresses
  );
  const endAt = new Date().toISOString();
  const sourceToken = {
    address: quote.from_token.address,
    symbol: quote.from_token.symbol,
    decimals: quote.from_token.decimals,
  };
  const destToken = {
    address: quote.to_token.address,
    symbol: quote.to_token.symbol,
    decimals: quote.to_token.decimals,
  };
  return {
    id: hash,
    status: "processing",
    lastUpdateAt: endAt,
    sourceChainId: quote.from_token.chainId,
    destChainId: quote.to_token.chainId,
    walletSourceAddress: fromAddress,
    walletDestAddress: toAddress,
    totalFeeAmount: quote.total_fee,
    sourceToken: quote.from_token,
    destToken: quote.to_token,
    bridgeFromAmount: quote.amount_in,
    bridgeToAmount: quote.amount_out,
    bridgeStartAt: startAt,
    bridgeEndAt: endAt,
    bridgeFeeAmount: "0",
    bridgeSourceTxHash: hash,
    bridgeDestTxHash: "",
    bridgeRefundTxHash: "",
    bridgeStatus: "processing",
    bridgeProvider: "mayan",
    bridgeFromToken: sourceToken,
    bridgeToToken: destToken,
    hasSwap: false,
  };
}
