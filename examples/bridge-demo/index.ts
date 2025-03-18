import "dotenv/config";
import { Bridge } from "navi-sdk";
import { WalletConnection } from "navi-sdk/dist/libs/Bridge/providers/mayan";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as ethers from "ethers";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
const suiWallet = Ed25519Keypair.fromSecretKey(
  process.env.SUI_PRIVATE_KEY as string
);

const ethereumProvider = new ethers.JsonRpcProvider(
  "https://eth.blockrazor.xyz"
);
const ethereumWallet = new ethers.Wallet(
  process.env.EVM_PRIVATE_KEY as string,
  ethereumProvider
);

const solanaConnection = new Connection("https://api.mainnet-beta.solana.com");
const solanaWallet = Keypair.fromSecretKey(
  Buffer.from(process.env.SOLANA_PRIVATE_KEY as string, "hex")
);


Bridge.config({
  apiKey: process.env.ASTROS_API_KEY,
});

const walletConnection: WalletConnection = {
  sui: {
    provider: suiClient,
    signTransaction: async (data) => {
      console.log('signTransaction', data)
      data.transaction.setSender(suiWallet.toSuiAddress());
      const bytes = await data.transaction.build({
        client: suiClient,
      });
      const signature = await suiWallet.signTransaction(bytes);
      console.log(signature)
      return signature;
    },
  },
  solana: {
    signTransaction: async (tx: Transaction | VersionedTransaction) => {
      if (tx instanceof VersionedTransaction) {
        tx.sign([solanaWallet]);
      } else {
        tx.partialSign(solanaWallet);
      }
      return tx;
    },
    connection: solanaConnection,
  } as any,
  evm: {
    signer: ethereumWallet,
    overrides: null,
    permit: null,
    waitForTransaction: async (data) => {
      await ethereumProvider.waitForTransaction(data.hash, 3);
    },
  },
};

async function main() {
  try {
    const supportChains = await Bridge.getSupportChains();
    const SuiChain = supportChains[6];
    const SolanaChain = supportChains[0];

    const navxSearchResult = await Bridge.searchSupportTokens(
      SuiChain.id,
      "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX"
    );
    const SUI_NAVX = navxSearchResult[0];

    const usdcSearchResult = await Bridge.searchSupportTokens(
      SolanaChain.id,
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
    const SolanaUSDC = usdcSearchResult[0];

    const quote = await Bridge.getQuote(SUI_NAVX, SolanaUSDC, 100, {
      slippageBps: 50,
    });

    let transaction = await Bridge.swap(quote.routes[0], suiWallet.toSuiAddress(), solanaWallet.publicKey.toString(), walletConnection )

    transaction = await Bridge.getTransaction(transaction.id);

    console.log(transaction);
  } catch (e) {
    console.error(e)
  }
}

main();
