import {
  Chain,
  Token,
  BridgeSwapOptions,
  BridgeSwapQuote,
  BridgeSwapTransaction,
} from "../../types";
import * as mayan from "./providers/mayan";
import axios from "axios";
import { WalletConnection } from "./providers/mayan";

const instance = axios.create({
  baseURL: `https://aggregator-api-stage-d5a229fbd33c.naviprotocol.io`,
  timeout: 30000,
});

export async function getSupportChains(): Promise<Chain[]> {
  const res = await instance.get<{
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
  const res = await instance.get<{
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
  const res = await instance.get<{
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
  const res = await instance.get<{
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
    },
  });
  return res.data.data;
}

export async function getTransaction(hash: string) {
  const res = await instance.get<{
    data: {
      transaction: BridgeSwapTransaction;
    };
  }>(`/bridge-swap/transaction/${hash}`);
  return res.data.data.transaction;
}

export async function getWalletTransactions(address: string) {
  const res = await instance.get<{
    data: {
      transactions: BridgeSwapTransaction[];
    };
  }>(`/bridge-swap/transactions/list`, {
    params: {
      address,
    },
  });
  return res.data.data;
}

export async function swap(
  quote: BridgeSwapQuote,
  fromAddress: string,
  toAddress: string,
  walletConnection: WalletConnection
): Promise<BridgeSwapTransaction> {
  const hash = await mayan.swap(
    quote,
    fromAddress,
    toAddress,
    walletConnection
  );
  return await getTransaction(hash);
}
