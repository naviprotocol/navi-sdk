import {
  createSwapFromSuiMoveCalls,
  Quote as MayanQuote,
  swapFromSolana,
  swapFromEvm,
  SolanaTransactionSigner,
  JitoBundleOptions,
  Erc20Permit,
  addresses,
} from "@dontuseit/swap-sdk";
import { BridgeSwapQuote } from "../../../types";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Connection, SendOptions } from "@solana/web3.js";
import { Signer, Overrides, Contract, parseUnits } from "ethers";
import { waitForSolanaTransaction } from "../utils";

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];

type SuiWalletConnection = {
  provider: SuiClient;
  signTransaction: (data: { transaction: Transaction }) => Promise<{
    bytes: string;
    signature: string;
  }>;
};

type SolanaWalletConnection = {
  signTransaction: SolanaTransactionSigner;
  connection: Connection;
  extraRpcs?: string[];
  sendOptions?: SendOptions;
  jitoOptions?: JitoBundleOptions;
};

type EVMWalletConnection = {
  overrides: Overrides | null | undefined;
  signer: Signer;
  permit: Erc20Permit | null | undefined;
  waitForTransaction: (data: {
    hash: string;
    confirmations: number;
  }) => Promise<void>;
};

export type WalletConnection = {
  sui?: SuiWalletConnection;
  solana?: SolanaWalletConnection;
  evm?: EVMWalletConnection;
};

export async function swap(
  route: BridgeSwapQuote,
  fromAddress: string,
  toAddress: string,
  walletConnection: WalletConnection,
  referrerAddresses?: {
    sui?: string;
    evm?: string;
    solana?: string;
  }
): Promise<string> {
  if (!route) {
    throw new Error("No route found");
  }
  const mayanQuote = route.info_for_bridge as MayanQuote;
  let hash: string;
  if (route.from_token.chainId === 1999) {
    if (!walletConnection.sui) {
      throw new Error("Sui wallet connection not found");
    }
    const client = walletConnection.sui.provider;
    const swapTrx = await createSwapFromSuiMoveCalls(
      mayanQuote,
      fromAddress,
      toAddress,
      referrerAddresses,
      null,
      client
    );
    const connection = walletConnection.sui;
    const signed: {
      bytes: string;
      signature: string;
    } = await connection.signTransaction({ transaction: swapTrx });
    const resp = await client.executeTransactionBlock({
      transactionBlock: signed.bytes,
      signature: [signed.signature],
      options: {
        showEffects: true,
        showEvents: true,
        showBalanceChanges: true,
      },
    });
    hash = resp.digest;
    await client.waitForTransaction({
      digest: hash,
    });
  } else if (route.from_token.chainId === 0) {
    if (!walletConnection.solana) {
      throw new Error("Solana wallet connection not found");
    }
    const connection = walletConnection.solana;
    const swapTrx = await swapFromSolana(
      mayanQuote,
      fromAddress,
      toAddress,
      referrerAddresses,
      connection.signTransaction,
      connection.connection,
      connection.extraRpcs,
      connection.sendOptions,
      connection.jitoOptions
    );
    hash = swapTrx.signature;
  } else {
    if (!walletConnection.evm) {
      throw new Error("EVM wallet connection not found");
    }
    const connection = walletConnection.evm;
    const fromToken = mayanQuote.fromToken;
    if (fromToken.standard === "erc20") {
      const erc20Contract = new Contract(
        fromToken.realOriginContractAddress || fromToken.contract,
        ERC20_ABI,
        connection.signer
      );
      const currentAllowance = await erc20Contract.allowance(
        fromAddress,
        addresses.MAYAN_FORWARDER_CONTRACT
      );
      const REQUIRED_ALLOWANCE = parseUnits(
        String(mayanQuote.effectiveAmountIn),
        fromToken.decimals
      );
      if (currentAllowance.lt(REQUIRED_ALLOWANCE)) {
        const approveTrx = await erc20Contract.approve(
          addresses.MAYAN_FORWARDER_CONTRACT,
          REQUIRED_ALLOWANCE
        );
        const receiptApprove = await approveTrx.wait();
        if (!receiptApprove) {
          throw new Error("Failed to approve allowance");
        }
      }
    }
    const swapTrx = await swapFromEvm(
      mayanQuote,
      fromAddress,
      toAddress,
      referrerAddresses,
      connection.signer,
      connection.permit,
      connection.overrides,
      null
    );
    hash = typeof swapTrx === "string" ? swapTrx : swapTrx.hash;
    await connection.waitForTransaction({
      hash,
      confirmations: 3,
    });
  }

  return hash;
}
