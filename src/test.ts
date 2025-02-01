import {
  buildSwapPTBFromQuote,
  getQuote,
  NAVISDKClient,
  SignAndSubmitTXB,
  Sui,
  swapPTB,
  wUSDC,
  getHealthFactorPTB,
  updateOraclePTB,
} from "./index";
import dotenv, { config } from "dotenv";
import { Transaction } from "@mysten/sui/transactions";
import { fetchFlashloanData } from "./libs/PoolInfo";
import {
  depositCoin,
  getConfig,
  getPoolInfo,
  haSui,
  moveInspect,
  NAVX,
  nUSDC,
  pool,
  USDT,
  vSui,
  withdrawCoin,
} from "./index";
import {
  migrateBorrowPTB,
  migratePTB,
  migrateSupplyPTB,
} from "./libs/PTB/migrate";
import { migrateModule } from "./libs/PTB";
import { Dex, Pool } from "./types";
import { sign } from "crypto";
dotenv.config();

const mn = process.env.PRIVATE_KEY;
const rpcUrl = process.env.RPC;
const apiKey = process.env.API_KEY || "";
const client = new NAVISDKClient({
  networkType: rpcUrl,
  privateKeyList: [mn as any],
});
const account = client.accounts[0];
console.log(`account: ${JSON.stringify(account.address)}`);

const txb = new Transaction();
txb.setSender(account.address);
const amount = 10e9;

// //deposit deep
// const deepCoin = txb.splitCoins(
//   txb.object(
//     "0x5a21aef5904b62340730674379049c455ce14d4ecc9b198d96d6fe2acb85da3b"
//   ),
//   [txb.pure.u64(10e6)]
// );
// txb.moveCall({
//   target:
//     "0x5871cfe2f6a5e432caea0a894aa51fc423fba798dfed540859abdf17ecc61219::sponsored_deep::deposit_deep",
//   arguments: [
//     txb.object(
//       "0x0b5e88bb54746b94bc5c7912f279cba30e0c4bd0241b935ba1d0d0c032218b6f"
//     ),
//     deepCoin,
//   ],
// });

const coinIn = txb.splitCoins(
  txb.object(
    "0x0af0262b738c99ae7e6ef1628257cf6ef8dc80b35afaaa442d60ae232b003b5f"
  ),
  [txb.pure.u64(2e6)]
);

const fromCoin =
  "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS";
const toCoin =
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
const [baseOut, coinOut] = txb.moveCall({
  target:
    "0x5871cfe2f6a5e432caea0a894aa51fc423fba798dfed540859abdf17ecc61219::sponsored_deep::swap_exact_quote_for_base_sponsored",
  arguments: [
    txb.object(
      "0x0b5e88bb54746b94bc5c7912f279cba30e0c4bd0241b935ba1d0d0c032218b6f"
    ),
    txb.object(
      "0x0c0fdd4008740d81a8a7d4281322aee71a1b62c449eb5b142656753d89ebc060"
    ),
    coinIn,
    txb.pure.u64(0),
    txb.object("0x6"),
  ],
  typeArguments: [fromCoin, toCoin],
});

txb.transferObjects([baseOut, coinOut], account.address);

SignAndSubmitTXB(txb, account.client, account.keypair).then((res) => {
  console.log(res);
});
