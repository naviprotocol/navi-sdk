import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getAddressPortfolio } from "../CallFunctions";
import { CoinInfo, Pool } from "../../types";
import { getPoolInfo } from "../PoolInfo";
import { pool } from "../../address";
import { PoolConfig } from "../../types";
import { getHealthFactorCall } from "../../libs/CallFunctions";
import { borrowCoin, flashloan, repayDebt, repayFlashLoan, swapPTB } from "../../libs/PTB";

async function getHealthFactorByNewAmount(fromCoin: CoinInfo, toCoin: CoinInfo, newSuppliedAmount: number, newBorrowedAmount: number, client: SuiClient, userAddress?: string) {

    const allPools = await getPoolInfo();
    const fromPoolConfig = pool[fromCoin.symbol as keyof Pool];
    const fromPoolInfo = (allPools as { [key: string]: any })[String(fromPoolConfig.assetId)];
    const toPoolConfig: PoolConfig = pool[toCoin.symbol as keyof Pool];
    const toPoolInfo = (allPools as { [key: string]: any })[String(toPoolConfig.assetId)];

    let supplyAmount = newSuppliedAmount * fromPoolInfo.tokenPrice * Number(fromPoolInfo.liquidation_threshold) / Math.pow(10, fromCoin.decimal);
    let borrowAmount = newBorrowedAmount * toPoolInfo.tokenPrice / Math.pow(10, toCoin.decimal);
    if (userAddress) {
        console.log(`current hf: `, await getHealthFactorCall(userAddress, client))
        let supplyAmountWithUserSupply = 0;
        let borrowAmountWithUserSupply = 0;
        const portfolio = await getAddressPortfolio(userAddress, false, client);
        const suiPool = (allPools as { [key: string]: any })[0];
        const usdcPool = (allPools as { [key: string]: any })[1]
        const usdtPool = (allPools as { [key: string]: any })[2]
        const wethPool = (allPools as { [key: string]: any })[3]
        const cetusPool = (allPools as { [key: string]: any })[4]
        const haSuiPool = (allPools as { [key: string]: any })[5]
        const vSuiPool = (allPools as { [key: string]: any })[6]
        const navxPool = (allPools as { [key: string]: any })[7];
        const poolInfoMap: { [symbol: string]: any } = {
            'SUI': suiPool,
            'USDC': usdcPool,
            'USDT': usdtPool,
            'WETH': wethPool,
            'CETUS': cetusPool,
            'HaedalSui': haSuiPool,
            'VoloSui': vSuiPool,
            'NAVX': navxPool
        };

        const nonZeroBalances = new Map(
            [...portfolio.entries()]
                .filter(([key, value]) => value.borrowBalance !== 0 || value.supplyBalance !== 0)
                .map(([key, value]) => {
                    const poolInfo = poolInfoMap[key];
                    return [key, { ...value, price: poolInfo ? poolInfo.tokenPrice : null, liquidationThreshold: poolInfo ? poolInfo.liquidation_threshold : null }];
                })
        );

        nonZeroBalances.forEach((value) => {
            borrowAmountWithUserSupply += value.borrowBalance * value.price;
            supplyAmountWithUserSupply += value.supplyBalance * value.price * value.liquidationThreshold;
        });
        if (borrowAmountWithUserSupply != 0) {
            supplyAmountWithUserSupply = await getHealthFactorCall(userAddress, client) * borrowAmountWithUserSupply;
        }
        console.log(supplyAmountWithUserSupply)
        supplyAmount += supplyAmountWithUserSupply;
        borrowAmount += borrowAmountWithUserSupply;


        return supplyAmount / borrowAmount;
    }

    return supplyAmount / borrowAmount;
}

export async function migratePTB(txb: Transaction, fromCoin: CoinInfo, toCoin: CoinInfo, amount: number, borrow: boolean, address: string, apiKey: string, client: SuiClient) {
    const defaultSlippage = 0.01; //default pool fee

    //This part can be optimized in frontend
    // const portfolio = await getAddressPortfolio(address, false, client, false);
    // let fromCoinBalance;

    // fromCoinBalance = Math.floor(portfolio.get(fromCoin.symbol)?.borrowBalance || 0);

    // if (fromCoinBalance < amount) {
    //     throw new Error(`Insufficient borrow balance for migration ${fromCoin.symbol}`);
    // }

    const allPools = await getPoolInfo();
    const fromPoolConfig = pool[fromCoin.symbol as keyof Pool];
    const fromPoolInfo = (allPools as { [key: string]: any })[String(fromPoolConfig.assetId)];
    const toPoolConfig = pool[toCoin.symbol as keyof Pool];
    const toPoolInfo = (allPools as { [key: string]: any })[String(toPoolConfig.assetId)];

    const fromPoolPrice = fromPoolInfo.tokenPrice;
    const toPoolPrice = toPoolInfo.tokenPrice;
    console.log(`fromPoolPrice: ${fromPoolPrice}, toPoolPrice: ${toPoolPrice}`)

    console.log(`amount: ${amount}, fromPoolPrice: ${fromPoolPrice}, fromCoin.decimal: ${fromCoin.decimal}`)
    const fromValue = amount * fromPoolPrice / Math.pow(10, fromCoin.decimal);
    console.log(`fromValue: ${fromValue}`)

    const toLoanToCoinValue = fromValue * (1 + defaultSlippage);
    console.log(`toLoanToCoinValue: ${toLoanToCoinValue}`)

    const toLoanCoinAmount = Math.floor(toLoanToCoinValue / toPoolPrice * Math.pow(10, toCoin.decimal));

    const flashloanFee = await fetch("https://open-api.naviprotocol.io/api/navi/stats");
    const fee = await flashloanFee.json();
    let toCoinFlashloanFee = fee.data.flashLoanFee[toCoin.symbol] || 0;
    console.log(`toCoinFlashloanFee: ${toCoinFlashloanFee}`)
    const flashloantoRepayAmount = Math.floor(toLoanCoinAmount * (1 + toCoinFlashloanFee));

    console.log(`toLoanCoinAmount: ${toLoanCoinAmount}`)
    const [toBalance, receipt] = await flashloan(txb, toPoolConfig, Number(toLoanCoinAmount));

    const [toCoinFlashloaned]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [toBalance],
        typeArguments: [toCoin.address],
    });
    console.log(`fromCoin: ${fromCoin.address}`, `toCoin: ${toCoin.address}`)
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