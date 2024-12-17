import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { CoinInfo, MigrateOptions, Pool } from "../../types";
import { getPoolInfo } from "../PoolInfo";
import { nUSDC, haSui, pool, vSui, wUSDC, USDT } from "../../address";
import { borrowCoin, buildSwapPTBFromQuote, depositCoin, flashloan, getQuote, repayDebt, repayFlashLoan, withdrawCoin } from "../../libs/PTB";
import { Sui } from "../../address";


export async function migrateBorrowPTB(txb: Transaction, fromCoin: CoinInfo, toCoin: CoinInfo, amount: number, address: string, migrateOptions?: MigrateOptions) {
    const defaultSlippage = 0.01; //default pool fee

    if (fromCoin == toCoin) {
        throw new Error("fromCoin and toCoin cannot be the same");
    }
    if (amount <= 0) {
        throw new Error("amount must be greater than 0");
    }
    const allPools = await getPoolInfo();
    const fromPoolConfig = pool[fromCoin.symbol as keyof Pool];
    const fromPoolInfo = (allPools as { [key: string]: any })[String(fromPoolConfig.assetId)];
    const toPoolConfig = pool[toCoin.symbol as keyof Pool];
    const toPoolInfo = (allPools as { [key: string]: any })[String(toPoolConfig.assetId)];

    const fromPoolPrice = fromPoolInfo.tokenPrice;
    const toPoolPrice = toPoolInfo.tokenPrice;

    const fromValue = amount * fromPoolPrice / Math.pow(10, fromCoin.decimal);

    const toLoanToCoinValue = fromValue * (1 + defaultSlippage);

    const toLoanCoinAmount = Math.floor(toLoanToCoinValue / toPoolPrice * Math.pow(10, toCoin.decimal));

    const flashloanFee = await fetch("https://open-api.naviprotocol.io/api/navi/flashloan");
    const fee = await flashloanFee.json();
    let toCoinFlashloanFee;
    if (toCoin == Sui) {
        if (!fee.data["0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"]) {
            throw new TypeError("Cannot read properties of undefined (reading 'flashloanFee')");
        }
        toCoinFlashloanFee = Number(fee.data["0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"].flashloanFee);
    } else {
        if (!fee.data[toCoin.address]) {
            throw new TypeError("Unsupported coin");
        }
        toCoinFlashloanFee = fee.data[toCoin.address].flashloanFee || 0;
    }

    const flashloantoRepayAmount = Math.floor(toLoanCoinAmount * (1 + toCoinFlashloanFee));

    const [toBalance, receipt] = await flashloan(txb, toPoolConfig, Number(toLoanCoinAmount));

    const [toCoinFlashloaned]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [toBalance],
        typeArguments: [toCoin.address],
    });

    let quote;
    try {
        quote = await getQuote(toCoin.address, fromCoin.address, toLoanCoinAmount, migrateOptions?.apiKey, { baseUrl: migrateOptions?.baseUrl });
    } catch (error) {
        throw new Error(`Failed to get quote: ${(error as Error).message}`);
    }
    const swappedFromCoin = await buildSwapPTBFromQuote(address, txb, 0, toCoinFlashloaned, quote)

    const [repayCoin] = txb.splitCoins(swappedFromCoin, [amount])

    txb.transferObjects([swappedFromCoin], address)
    await repayDebt(txb, fromPoolConfig, repayCoin, amount)
    const [borrowedToCoin] = await borrowCoin(txb, toPoolConfig, flashloantoRepayAmount)

    const repayBalance = txb.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [borrowedToCoin],
        typeArguments: [toCoin.address],
    })

    const [leftBalance] = await repayFlashLoan(txb, toPoolConfig, receipt, repayBalance)

    const [extraCoin] = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [leftBalance],
        typeArguments: [toCoin.address],
    })
    txb.transferObjects([extraCoin], address)

    return txb;
}

export async function migrateSupplyPTB(txb: Transaction, fromCoin: CoinInfo, toCoin: CoinInfo, amount: number, address: string, migrateOptions?: MigrateOptions) {
    if (fromCoin == toCoin) {
        throw new Error("fromCoin and toCoin cannot be the same");
    }
    if (amount <= 0) {
        throw new Error("amount must be greater than 0");
    }
    const allPools = await getPoolInfo();
    const fromPoolConfig = pool[fromCoin.symbol as keyof Pool];
    const fromPoolInfo = (allPools as { [key: string]: any })[String(fromPoolConfig.assetId)];
    const toPoolConfig = pool[toCoin.symbol as keyof Pool];
    const toPoolInfo = (allPools as { [key: string]: any })[String(toPoolConfig.assetId)];

    const flashloanFee = await fetch("https://open-api.naviprotocol.io/api/navi/flashloan");
    const fee = await flashloanFee.json();
    let fromCoinFlashloanFee;
    if (fromCoin == Sui) {
        fromCoinFlashloanFee = Number(fee.data["0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"].flashloanFee);
    } else {
        if (!fee.data[fromCoin.address]) {
            throw new TypeError("Unsupported coin");
        }
        fromCoinFlashloanFee = fee.data[fromCoin.address].flashloanFee || 0;
    }

    const fromRepayCoinAmount = Math.ceil(amount / (1 + fromCoinFlashloanFee));
    console.log("fromRepayCoinAmount", fromRepayCoinAmount)
    const [fromBalance, receipt] = await flashloan(txb, fromPoolConfig, Number(fromRepayCoinAmount));

    const [fromCoinFlashloaned]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [fromBalance],
        typeArguments: [fromCoin.address],
    });

    let quote;
    try {
        quote = await getQuote(fromCoin.address, toCoin.address, fromRepayCoinAmount, migrateOptions?.apiKey, { baseUrl: migrateOptions?.baseUrl });
    } catch (error) {
        console.error(`Error in getQuote: ${(error as Error).message}`);
        throw error;
    }
    console.log("quote", quote)
    const swappedToCoin = await buildSwapPTBFromQuote(address, txb, 0, fromCoinFlashloaned, quote)
    const swappedValue = txb.moveCall({
        target: '0x2::coin::value',
        arguments: [swappedToCoin],
        typeArguments: [toCoin.address],
    })
    await depositCoin(txb, toPoolConfig, swappedToCoin, swappedValue);

    const [withdrawnFromCoin] = await withdrawCoin(txb, fromPoolConfig, amount)

    const repayBalance = txb.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [withdrawnFromCoin],
        typeArguments: [fromCoin.address],
    })

    const [leftBalance] = await repayFlashLoan(txb, fromPoolConfig, receipt, repayBalance)

    const [extraCoin] = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [leftBalance],
        typeArguments: [fromCoin.address],
    })
    txb.transferObjects([extraCoin], address)

    return txb;
}

export async function migratePTB(txb: Transaction, supplyFromCoin: CoinInfo, supplyToCoin: CoinInfo, borrowFromCoin: CoinInfo, borrowToCoin: CoinInfo, supplyAmount: number, borrowAmount: number, address: string, migrateOptions?: MigrateOptions) {
    try {
        await migrateSupplyPTB(txb, supplyFromCoin, supplyToCoin, supplyAmount, address, migrateOptions)
    } catch (error) {
        console.error(`Error in migrateSupplyPTB: ${(error as Error).message}`);
    }
    try {
        await migrateBorrowPTB(txb, borrowFromCoin, borrowToCoin, borrowAmount, address, migrateOptions)
    } catch (error) {
        console.error(`Error in migrateBorrowPTB: ${(error as Error).message}`);
    }
    return txb;
}

export function getMigratableCoins() {
    return [Sui, wUSDC, nUSDC, vSui, USDT]
}