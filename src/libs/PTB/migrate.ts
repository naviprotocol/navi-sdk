import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { CoinInfo, Pool } from "../../types";
import { getPoolInfo } from "../PoolInfo";
import { pool } from "../../address";
import { borrowCoin, depositCoin, flashloan, repayDebt, repayFlashLoan, swapPTB, withdrawCoin } from "../../libs/PTB";
import { Sui } from "../../address";


export async function migrateBorrowPTB(txb: Transaction, fromCoin: CoinInfo, toCoin: CoinInfo, amount: number, address: string, apiKey: string, client: SuiClient) {
    const defaultSlippage = 0.01; //default pool fee

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
        toCoinFlashloanFee = Number(fee.data["0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"].flashloanFee);
    } else {
        toCoinFlashloanFee = fee.data[toCoin.address].flashloanFee || 0;
    }

    const flashloantoRepayAmount = Math.floor(toLoanCoinAmount * (1 + toCoinFlashloanFee));

    const [toBalance, receipt] = await flashloan(txb, toPoolConfig, Number(toLoanCoinAmount));

    const [toCoinFlashloaned]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [toBalance],
        typeArguments: [toCoin.address],
    });
    const [swappedFromCoin] = await swapPTB(address, txb, toCoin.address, fromCoin.address, toCoinFlashloaned, toLoanCoinAmount, 0, apiKey)
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

export async function migrateSupplyPTB(txb: Transaction, fromCoin: CoinInfo, toCoin: CoinInfo, amount: number, address: string, apiKey: string, client: SuiClient) {

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
        fromCoinFlashloanFee = fee.data[fromCoin.address].flashloanFee || 0;
    }

    const flashloantoRepayAmount = amount;
    const fromRepayCoinAmount = Math.ceil(amount / (1 + fromCoinFlashloanFee));
    // const toDepositCoinAmount = Math.ceil(toRepayCoinAmount / (1 + defaultSlippage));

    const [fromBalance, receipt] = await flashloan(txb, fromPoolConfig, Number(fromRepayCoinAmount));

    const [fromCoinFlashloaned]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [fromBalance],
        typeArguments: [fromCoin.address],
    });

    const [swappedToCoin] = await swapPTB(address, txb, fromCoin.address, toCoin.address, fromCoinFlashloaned, fromRepayCoinAmount, 0, apiKey)

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

