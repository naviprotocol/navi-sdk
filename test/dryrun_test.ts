import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, SuiEvent } from '@mysten/sui/client';
import {
  buildSwapPTBFromQuote,
  Dex,
  NAVISDKClient,
  Quote,
  SwapOptions,
} from '../src';
import { createTransaction, handleTransactionResult } from './helper';
import { account } from './client';

const client = new NAVISDKClient({
  mnemonic: process.env.MNEMONIC,
  networkType: 'mainnet',
  numberOfAccounts: 5,
});
const accountManager = client.accounts[0];

const provider = new SuiClient({
  url: 'https://fullnode.mainnet.sui.io',
});

function returnMergedCoins(txb: Transaction, coins: any[], amount: number) {
  if (coins.length < 2) {
    return txb.object(coins[0].coinObjectId);
  }

  let mergedBalance = 0;
  const mergeList: string[] = [];
  coins
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(1)
    .forEach((coin) => {
      if (mergedBalance >= amount) {
        return;
      }
      mergedBalance += Number(coin.balance);
      mergeList.push(coin.coinObjectId);
    });
  const baseObj = coins[0].coinObjectId;
  txb.mergeCoins(baseObj, mergeList);

  return txb.object(baseObj);
}

const getCoinBalance = (coins: any[]) => {
  const totalBalance = coins.reduce(
    (sum, coin) => sum + BigInt(coin.balance),
    BigInt(0)
  );
  return totalBalance;
};

const test = async (
  coinFromAddress: string,
  coinToAddress: string,
  amountIn: number,
  address: string,
  swapOptions: SwapOptions
) => {
  const coins = await accountManager.fetchCoins(address, coinFromAddress);
  const balance = getCoinBalance(coins as unknown as any[]);
  if (balance === BigInt(0)) {
    console.error(
      'No token balance',
      address,
      coins.length,
      coinFromAddress
    );
    return `No token balance: ${address}, ${coins.length}, ${coinFromAddress}`;
  }
  const txb = createTransaction(account);

  txb.setGasBudget(1 * 10 ** 9);

  let coinIn;
  if (
    coinFromAddress === '0x2::sui::SUI' ||
    coinFromAddress ===
    '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
  ) {
    coinIn = txb.splitCoins(txb.gas, [txb.pure.u64(amountIn)]);
  } else {
    const mergedCoins = returnMergedCoins(
      txb,
      coins as unknown as any[],
      amountIn
    );
    coinIn = txb.splitCoins(mergedCoins, [txb.pure.u64(amountIn)]);
  }

  const router = await client.getQuote(
    coinFromAddress,
    coinToAddress,
    amountIn,
    undefined,
    swapOptions
  );
  const coinOut = await buildSwapPTBFromQuote(
    address,
    txb,
    0,
    coinIn,
    router,
        /*referral=*/ undefined,
        /*ifPrint=*/ false,
    undefined,
    swapOptions
  );
  txb.transferObjects([coinOut], address);

  if (address) {
    txb.setSender(address);
  }

  const dryRunTxBytes: Uint8Array = await txb.build({
    client: provider,
  });

  const tsRes = await handleTransactionResult(txb, accountManager, "test", false);
  console.log(tsRes);
  // const txEffects = await provider?.dryRunTransactionBlock({
  //   transactionBlock: dryRunTxBytes,
  // });

  // const slippageEvent = txEffects?.events?.find((event: SuiEvent) => {
  //   return event.type.includes('::slippage::SwapEvent');
  // });

  // if (slippageEvent) {
  //   const newRouter = { ...router } as Quote;
  //   newRouter.amount_out = (
  //     slippageEvent.parsedJson as { amount_out: string }
  //   ).amount_out;
  //   console.log(newRouter);
  // }
};

test(
  '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  1e6 * 0.1,
  'some address',
  {
    baseUrl: 'http://localhost:5000/find_routes',
    dexList: [Dex.MOMENTUM],
    byAmountIn: true,
    depth: 3,
  }
);
