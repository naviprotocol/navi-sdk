import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";
import { SUI_CLOCK_OBJECT_ID, normalizeSuiAddress } from "@mysten/sui/utils";
import { CoinStruct, getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import BigNumber from "bignumber.js";

type TransactionObjcet = {
    $kind: "Input";
    Input: number;
    type?: "object";
} | TransactionResult

export async function makeBluefinPTB(txb: Transaction, poolId: string, byAmountIn: boolean, coinAAddress: string, coinBAddress: string, amount: any, a2b: boolean, userAddress: string, amountLimit: any) {
    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
    const [splitCoinA, mergeCoinA] = a2b
        ? await createCoinWithBalance(suiClient, txb, amount, coinAAddress, userAddress)
        : [zeroCoin(txb, coinAAddress), undefined];
    // if swap input is coinB then create required coinB or else make coinB as zero
    const [splitCoinB, mergeCoinB] = !a2b
        ? await createCoinWithBalance(suiClient, txb, amount, coinBAddress, userAddress)
        : [zeroCoin(txb, coinBAddress), undefined];
    const sqrtPriceLimit = BigInt(a2b ? '4295048016' : '79226673515401279992447579055')

  const args = 
    [
        txb.object(SUI_CLOCK_OBJECT_ID),
        txb.object(AggregatorConfig.bluefinGlobalConfig),
        txb.object(poolId),
        txb.object(splitCoinA),
        txb.object(splitCoinB),
        txb.pure.bool(a2b),
        txb.pure.bool(byAmountIn),
        txb.pure.u64(new BigNumber(amount).toFixed(0)),
        txb.pure.u64(new BigNumber(amountLimit).toFixed(0)),
        txb.pure.u128(sqrtPriceLimit.toString())
    ]
  const res = txb.moveCall({
    target: `${AggregatorConfig.bluefinPackageId}::gateway::swap_assets,`,
    typeArguments: [coinAAddress, coinBAddress],
    arguments: args,
  });

  return res;
}

async function createCoinWithBalance(suiClient: SuiClient, txb: Transaction, amount: any, coinType: string, owner: string): Promise<[TransactionObjcet, TransactionObjcet | undefined]> {
    let mergeCoin;
    let hasExactBalance = false;
    const amountBN = new BigNumber(amount);
    // if amount is zero, return zero coin
    if (amountBN.isEqualTo(new BigNumber(0))) {
        return [zeroCoin(txb, coinType), undefined];
    }
    // get all available coins the user has of provided type
    const availableCoins = sortAscending(await getCoins(suiClient, owner, coinType));
    // sum up the balance of all coins
    const availableCoinsBalanceBN = new BigNumber(sumCoins(availableCoins));
    // if the total balance is < asked amount, throw
    if (amountBN.isGreaterThan(availableCoinsBalanceBN)) {
        throw `User: ${owner} does not have enough coins: ${coinType}`;
    }
    // if sui coin use the gas coin object
    if (isSUI(coinType)) {
        return [txb.splitCoins(txb.gas, [txb.pure.u64(amountBN.toFixed())]), undefined];
    }
    else {
        // find a coin with balance >= amount
        [mergeCoin, hasExactBalance] = findCoinWithBalance(availableCoins, amount);
        // if there is no one coin with balance >= amount
        // merge coins
        if (mergeCoin == undefined) {
            // set first coin as base/target
            mergeCoin = txb.object(availableCoins[0].coinObjectId);
            // merge all other coins in the first coin
            txb.mergeCoins(mergeCoin, availableCoins.slice(1).map(coin => txb.object(coin.coinObjectId)));
        }
        else {
            mergeCoin = txb.object(mergeCoin.coinObjectId);
        }
    }
    /// If the coin has exact the balance needed, return it as the `splitCoin` and
    /// send the merge coin as undefined as there is none
    /// If the coin has more balance than required, split it and send the splitCoin
    /// and whatever is remaining in merge coin
    return hasExactBalance
        ? [mergeCoin, undefined]
        : [txb.splitCoins(mergeCoin, [txb.pure.u64(amountBN.toFixed())]), mergeCoin];
}

const zeroCoin = (txb: Transaction, coinType: string) => {
    return txb.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [coinType]
    });
}

const isSUI = (coinType: string) => {
    const normalizedAddress = normalizeSuiAddress(coinType);
    return (normalizedAddress ===
        "0x0000000000000000000000000000000000000000000000000000000000000002::sui::sui" ||
        normalizedAddress ===
            "0x000000000000000000000000000000000000000000000000000002::sui::sui");
}

const getCoins = async (suiClient: SuiClient, owner: string, coinType: string) => {
    const coins = [];
    let result;
    do {
        result = await suiClient.getCoins({
            owner,
            coinType,
            cursor: result === null || result === void 0 ? void 0 : result.nextCursor
        });
        coins.push(...result.data);
    } while (result.hasNextPage);
    return coins;
}

const sortAscending = (coins: CoinStruct[]) => {
    return coins.sort((a, b) => new BigNumber(a.balance).lt(new BigNumber(b.balance))
        ? -1
        : new BigNumber(a.balance).gt(new BigNumber(b.balance))
            ? 1
            : 0);
}

const sumCoins = (coins: CoinStruct[]) => {
    return coins.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (total, coin) => total + +coin.balance, 0);
}

const findCoinWithBalance = (coins: CoinStruct[], amount: any): [CoinStruct | undefined, boolean] => {
    for (const coin of coins) {
        const a = new BigNumber(coin.balance);
        const b = new BigNumber(amount);
        if (a.gte(b)) {
            return [coin, a.eq(b)];
        }
    }
    return [undefined, false];
}

const getEstimatedAmountIncludingSlippage = (amount: BigNumber, slippage: BigNumber, byAmountIn: boolean) => {
    return byAmountIn
        ? amount.minus(amount.multipliedBy(slippage.dividedBy(100)))
        : amount.plus(amount.multipliedBy(slippage.dividedBy(100)));
}