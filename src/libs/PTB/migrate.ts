import { Transaction } from "@mysten/sui/transactions";
import { CoinInfo, MigrateOptions, Pool } from "../../types";
import { getPoolInfo } from "../PoolInfo";
import { nUSDC, haSui, pool, vSui, wUSDC, USDT, Sui } from "../../address";
import { 
    borrowCoin, 
    buildSwapPTBFromQuote, 
    depositCoin, 
    flashloan, 
    getQuote, 
    repayDebt, 
    repayFlashLoan, 
    withdrawCoin 
} from "../../libs/PTB";

/**
 * Retrieves the flashloan fee for a specified coin.
 * 
 * @param coin - The target coin information.
 * @returns The flashloan fee rate (e.g., 0.003 represents 0.3%).
 */
async function getFlashloanFee(coin: CoinInfo): Promise<number> {
    const flashloanFeeUrl = "https://open-api.naviprotocol.io/api/navi/flashloan";

    try {
        const response = await fetch(flashloanFeeUrl);
        const feeData = await response.json();

        // Define the key for SUI based on its address format
        const suiKey = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";

        if (coin.address === Sui.address) {
            if (!feeData.data[suiKey]) {
                throw new TypeError("Unable to retrieve flashloan fee for SUI.");
            }
            return Number(feeData.data[suiKey].flashloanFee);
        } else {
            if (!feeData.data[coin.address]) {
                throw new TypeError(`Unsupported coin: ${coin.symbol}`);
            }
            return feeData.data[coin.address].flashloanFee || 0;
        }
    } catch (error) {
        console.error(`Error fetching flashloan fee: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Converts an amount from display units to its smallest unit based on decimals.
 * 
 * @param amount - The amount in display units.
 * @param decimal - The number of decimal places for the coin.
 * @returns The amount in the smallest unit.
 */
function toMinUnit(amount: number, decimal: number): number {
    return Math.floor(amount * Math.pow(10, decimal));
}

/**
 * Converts an amount from the smallest unit to display units based on decimals.
 * 
 * @param amount - The amount in the smallest unit.
 * @param decimal - The number of decimal places for the coin.
 * @returns The amount in display units.
 */
function fromMinUnit(amount: number, decimal: number): number {
    return amount / Math.pow(10, decimal);
}

/**
 * Calculates an appropriate borrow amount for a flash loan.
 * 
 * Formula:
 * R = (formCoinPrice * 10^toDecimal) / (toCoinPrice * 10^formDecimal)
 * Borrow_amount = (formCoinAmountInMin * R * (1 - slippage)) / (1 + feeRate)
 * 
 * @param formCoinAmountInMin - The user's input amount in the smallest unit.
 * @param formCoinPrice - The price of the formCoin (in USD or any base currency).
 * @param toCoinPrice - The price of the toCoin (in USD or any base currency).
 * @param feeRate - The flash loan fee rate (e.g., 0.003 for 0.3%).
 * @param slippage - The slippage during the swap process (e.g., 0.01 for 1%).
 * @param formDecimal - The number of decimals of formCoin.
 * @param toDecimal - The number of decimals of toCoin.
 * @returns The calculated borrow amount in the smallest unit of toCoin.
 * @throws Will throw an error if input validations fail or if the calculated borrow amount is non-positive.
 */
function calculateBorrowAmount(
    formCoinAmountInMin: number,
    formCoinPrice: number,
    toCoinPrice: number,
    feeRate: number,
    slippage: number,
    formDecimal: number,  // Number of decimals for formCoin
    toDecimal: number     // Number of decimals for toCoin
): [number, number, number] {
    // Input validation
    if (
        [formCoinAmountInMin, formCoinPrice, toCoinPrice, feeRate, slippage, formDecimal, toDecimal].some(
            (param) => typeof param !== 'number' || isNaN(param)
        )
    ) {
        throw new Error("All input parameters must be valid numbers.");
    }
    if (formCoinAmountInMin <= 0) {
        throw new Error("The amount of formCoin must be greater than 0.");
    }
    if (formCoinPrice <= 0 || toCoinPrice <= 0) {
        throw new Error("Coin prices must be greater than 0.");
    }
    if (feeRate < 0 || slippage < 0) {
        throw new Error("Fee rate and slippage cannot be negative.");
    }
    if (!Number.isInteger(formDecimal) || !Number.isInteger(toDecimal) || formDecimal < 0 || toDecimal < 0) {
        throw new Error("Decimals must be non-negative integers.");
    }

    // Calculate the exchange rate R, considering decimal differences
    const R = (formCoinPrice * Math.pow(10, toDecimal)) / (toCoinPrice * Math.pow(10, formDecimal));

    // Calculate the borrow amount
    const borrowAmount = (formCoinAmountInMin * R * (1 - slippage)) / (1 + feeRate);

    // Ensure the borrow amount is positive
    if (borrowAmount <= 0) {
        throw new Error("The calculated borrow amount must be positive.");
    }

    // Floor the borrow amount to the nearest smallest unit
    const finalBorrowAmount = Math.floor(borrowAmount);
    const shouldSwapAmount = Math.floor(formCoinAmountInMin * R)
    const expectAmount = Math.floor(shouldSwapAmount * (1 + feeRate))

    return [finalBorrowAmount,shouldSwapAmount, expectAmount];
}

async function calcRealPriceFromSui(originalPrice: number, targetCoin: CoinInfo, migrateOptions?:MigrateOptions) {

    let quoteResult;
    try {
        quoteResult = await getQuote(
            Sui.address, 
            targetCoin.address, 
            1e9,
            migrateOptions?.apiKey,
            { baseUrl: migrateOptions?.baseUrl });
        console.log("Quote obtained:", quoteResult);
    } catch (error) {
        console.error(`Failed to get quote: ${(error as Error).message}`);
        throw error;
    }


    const amountOutNum = Number(quoteResult?.amount_out );
  
    return (1e9 / amountOutNum) * originalPrice;
  }

/**
 * Migrates supply from one coin to another using a flashloan.
 * 
 * @param txb - The transaction builder.
 * @param fromCoin - The supply coin to migrate from.
 * @param toCoin - The supply coin to migrate to.
 * @param amount - The from coin amount min unit to migrate.
 * @param address - The user's address.
 * @param migrateOptions - Optional migration parameters.
 * @returns The updated transaction builder.
 */
export async function migrateSupplyPTB(
    txb: Transaction,
    fromCoin: CoinInfo,
    toCoin: CoinInfo,
    amount: number,
    address: string,
    migrateOptions?: MigrateOptions
) {
    if (fromCoin.address === toCoin.address) {
        throw new Error("fromCoin and toCoin cannot be the same.");
    }
    if (amount <= 0) {
        throw new Error("Amount must be greater than 0.");
    }

    const allPools = await getPoolInfo();
    const fromPoolConfig = pool[fromCoin.symbol as keyof Pool];
    const toPoolConfig = pool[toCoin.symbol as keyof Pool];

    const fromPoolInfo = (allPools as { [key: string]: any })[String(fromPoolConfig.assetId)];
    const toPoolInfo = (allPools as { [key: string]: any })[String(toPoolConfig.assetId)];

    let fromCoinPrice = fromPoolInfo.tokenPrice;
    let toCoinPrice = toPoolInfo.tokenPrice;

    if (fromCoin.symbol === 'vSui' || fromCoin.symbol === 'haSui') {
        fromCoinPrice = await calcRealPriceFromSui(fromCoinPrice, fromCoin, migrateOptions);
    }
    if (toCoin.symbol === 'vSui' || toCoin.symbol === 'haSui') {
        toCoinPrice = await calcRealPriceFromSui(toCoinPrice, toCoin, migrateOptions);
    }

    const toCoinFlashloanFee = await getFlashloanFee(toCoin);
    const formCoinAmountInMin = amount;
    // const formCoinAmountInMin = toMinUnit(amount, fromCoin.decimal);
    const slippage = migrateOptions?.slippage ?? 0.005;

    const [borrowAmountInMin, shouldSwapAmount, _noUse] = calculateBorrowAmount(
        formCoinAmountInMin,
        Number(fromCoinPrice),
        Number(toCoinPrice),
        toCoinFlashloanFee,
        slippage,
        fromCoin.decimal,
        toCoin.decimal
    );
    console.log(`Borrow Amount Calculation:
        User Input Amount: ${amount} ${fromCoin.symbol}
        From Coin: ${fromCoin.symbol} (Price: ${fromCoinPrice})
        To Coin: ${toCoin.symbol} (Price: ${toCoinPrice})
        Fee Rate: ${toCoinFlashloanFee * 100}%
        Slippage: ${slippage * 100}%
        Borrow Amount in Min Units: ${borrowAmountInMin}
        should Amount in Min Units: ${shouldSwapAmount}
        Borrow Amount in normal: ${fromMinUnit(borrowAmountInMin, toCoin.decimal)}
        should Amount in normal: ${fromMinUnit(shouldSwapAmount, toCoin.decimal)}
        `);

    const [flashloanBalance, receipt] = await flashloan(txb, toPoolConfig, borrowAmountInMin);

    const [flashCoin]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [flashloanBalance],
        typeArguments: [toCoin.address],
    });

    await depositCoin(txb, toPoolConfig, flashCoin, borrowAmountInMin);

    const [withdrawnFromCoin] = await withdrawCoin(txb, fromPoolConfig, formCoinAmountInMin);

    let quote;
    try {
        quote = await getQuote(
            fromCoin.address,
            toCoin.address,
            formCoinAmountInMin,
            migrateOptions?.apiKey,
            { baseUrl: migrateOptions?.baseUrl }
        );
        console.log("Quote obtained:", quote);
    } catch (error) {
        console.error(`Error in getQuote: ${(error as Error).message}`);
        throw error;
    }

    const minAmountOut = Math.floor(shouldSwapAmount * (1 - slippage));
    const swappedToCoin = await buildSwapPTBFromQuote(address, txb, minAmountOut, withdrawnFromCoin as any, quote);

    const repayBalance = txb.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [swappedToCoin],
        typeArguments: [toCoin.address],
    });

    const [leftBalance] = await repayFlashLoan(txb, toPoolConfig, receipt, repayBalance);

    const [extraCoin] = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [leftBalance],
        typeArguments: [toCoin.address],
    });
    txb.transferObjects([extraCoin], address);

    return txb;
}

/**
 * Migrates borrowing from one coin to another using a flashloan.
 * 
 * @param txb - The transaction builder.
 * @param fromCoin - The borrow coin to migrate from.
 * @param toCoin - The borrow coin to migrate to.
 * @param amount - The from coin amount in min unit to migrate.
 * @param address - The user's address.
 * @param migrateOptions - Optional migration parameters.
 * @returns The updated transaction builder.
 */
export async function migrateBorrowPTB(
    txb: Transaction,
    fromCoin: CoinInfo,
    toCoin: CoinInfo,
    amount: number,
    address: string,
    migrateOptions?: MigrateOptions
) {
    if (fromCoin.address === toCoin.address) {
        throw new Error("fromCoin and toCoin cannot be the same.");
    }
    if (amount <= 0) {
        throw new Error("Amount must be greater than 0.");
    }

    const allPools = await getPoolInfo();
    const fromPoolConfig = pool[fromCoin.symbol as keyof Pool];
    const toPoolConfig = pool[toCoin.symbol as keyof Pool];

    const fromPoolInfo = (allPools as { [key: string]: any })[String(fromPoolConfig.assetId)];
    const toPoolInfo = (allPools as { [key: string]: any })[String(toPoolConfig.assetId)];

    let fromCoinPrice = fromPoolInfo.tokenPrice;
    let toCoinPrice = toPoolInfo.tokenPrice;

    if (fromCoin.symbol === 'vSui' || fromCoin.symbol === 'haSui') {
        fromCoinPrice = await calcRealPriceFromSui(fromCoinPrice, fromCoin, migrateOptions);
    }
    if (toCoin.symbol === 'vSui' || toCoin.symbol === 'haSui') {
        toCoinPrice = await calcRealPriceFromSui(toCoinPrice, toCoin, migrateOptions);
    }

    const toCoinFlashloanFee = await getFlashloanFee(toCoin);
    const fromCoinAmountInMin = amount;
    // const formCoinAmountInMin = toMinUnit(amount, fromCoin.decimal);
    const slippage = migrateOptions?.slippage ?? 0.005;

    const [borrowAmountInMin, shouldSwapAmount, loanAmount] = calculateBorrowAmount(
        fromCoinAmountInMin,
        Number(fromCoinPrice),
        Number(toCoinPrice),
        toCoinFlashloanFee,
        slippage,
        fromCoin.decimal,
        toCoin.decimal
    );

    console.log(`Borrow Amount Calculation:
        User Input Amount: ${amount} ${fromCoin.symbol}
        From Coin: ${fromCoin.symbol} (Price: ${fromCoinPrice})
        To Coin: ${toCoin.symbol} (Price: ${toCoinPrice})
        Fee Rate: ${toCoinFlashloanFee * 100}%
        Slippage: ${slippage * 100}%
        Borrow Amount in Min Units: ${borrowAmountInMin}
        should Amount in Min Units: ${shouldSwapAmount}
        Borrow Amount in normal: ${fromMinUnit(borrowAmountInMin, toCoin.decimal)}
        should Amount in normal: ${fromMinUnit(shouldSwapAmount, toCoin.decimal)}
        loanAmount Amount in Units: ${loanAmount}
        loanAmount Amount in normal: ${fromMinUnit(loanAmount, toCoin.decimal)}
        `);

    const [flashloanBalance, receipt] = await flashloan(txb, toPoolConfig, shouldSwapAmount);

    const [flashCoin]: any = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [flashloanBalance],
        typeArguments: [toCoin.address],
    });

    let quote;
    try {
        quote = await getQuote(
            toCoin.address,
            fromCoin.address,
            shouldSwapAmount,
            migrateOptions?.apiKey,
            { baseUrl: migrateOptions?.baseUrl }
        );
        console.log("Quote obtained:", quote);
    } catch (error) {
        console.error(`Failed to get quote: ${(error as Error).message}`);
        throw error;
    }

    const minAmountOut = Math.floor(Number(quote.amount_out) * (1 - slippage));
    const swappedFromCoin = await buildSwapPTBFromQuote(address, txb, minAmountOut, flashCoin, quote);

    const swapCoinValue = txb.moveCall({
        target: '0x2::coin::value',
        arguments: [swappedFromCoin],
        typeArguments: [fromCoin.address],
    });

    await repayDebt(txb, fromPoolConfig, swappedFromCoin, swapCoinValue);

    const [borrowedToCoin] = await borrowCoin(txb, toPoolConfig, loanAmount);

    const repayBalance = txb.moveCall({
        target: '0x2::coin::into_balance',
        arguments: [borrowedToCoin],
        typeArguments: [toCoin.address],
    });

    const [leftBalance] = await repayFlashLoan(txb, toPoolConfig, receipt, repayBalance);

    const [extraCoin] = txb.moveCall({
        target: '0x2::coin::from_balance',
        arguments: [leftBalance],
        typeArguments: [toCoin.address],
    });
    txb.transferObjects([extraCoin], address);

    return txb;
}

/**
 * Migrates both supply and borrow positions using flashloans.
 * 
 * @param txb - The transaction builder.
 * @param supplyFromCoin - The coin to supply from.
 * @param supplyToCoin - The coin to supply to.
 * @param borrowFromCoin - The coin to borrow from.
 * @param borrowToCoin - The coin to borrow to.
 * @param supplyAmount - The amount to supply.
 * @param borrowAmount - The amount to borrow.
 * @param address - The user's address.
 * @param migrateOptions - Optional migration parameters.
 * @returns The updated transaction builder.
 */
export async function migratePTB(
    txb: Transaction,
    supplyFromCoin: CoinInfo,
    supplyToCoin: CoinInfo,
    borrowFromCoin: CoinInfo,
    borrowToCoin: CoinInfo,
    supplyAmount: number,
    borrowAmount: number,
    address: string,
    migrateOptions?: MigrateOptions
) {
    try {
        await migrateSupplyPTB(txb, supplyFromCoin, supplyToCoin, supplyAmount, address, migrateOptions);
        console.log("Supply migration completed successfully.");
    } catch (error) {
        console.error(`Error in migrateSupplyPTB: ${(error as Error).message}`);
    }

    try {
        await migrateBorrowPTB(txb, borrowFromCoin, borrowToCoin, borrowAmount, address, migrateOptions);
        console.log("Borrow migration completed successfully.");
    } catch (error) {
        console.error(`Error in migrateBorrowPTB: ${(error as Error).message}`);
    }

    return txb;
}

/**
 * Retrieves the list of coins that can be migrated.
 * 
 * @returns An array of migratable coins.
 */
export function getMigratableCoins(): CoinInfo[] {
    return [Sui, wUSDC, nUSDC, vSui, USDT];
}
