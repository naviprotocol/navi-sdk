import { AccountManager } from "./libs/AccountManager";
import { initializeParas, CoinInfo, Pool, PoolConfig, OptionType } from "./types";
import { getPoolInfo } from './libs/PoolInfo'
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { pool } from "./address";

export class NAVISDKClient {

    public account!: AccountManager;
    public accounts: AccountManager[] = [];
    public mnemonic: string = "";
    public networkType: string = "";


    /**
     * Generates a new NAVISDKClient instance.
     * @param mnemonic - The mnemonic phrase to use for account generation. If not provided, a new mnemonic will be generated.
     * @param networkType - The network type to use. Defaults to "mainnet".
     * @param wordLength - The length of the mnemonic phrase. Defaults to 12.
     * @param numberOfAccounts - The number of accounts to generate. Defaults to 10.
     */

    constructor({ mnemonic, networkType, wordLength = 12, numberOfAccounts = 10 }: initializeParas = {}) {
        if (mnemonic === undefined) {
            this.mnemonic = bip39.generateMnemonic(
                wordlist,
                wordLength === 12 ? 128 : 256
            );
        }
        else {
            this.mnemonic = mnemonic;
        }
        this.networkType = networkType || "mainnet";
        for (let i = 0; i < numberOfAccounts; i++) {
            this.account = new AccountManager({ mnemonic: this.mnemonic || "", networkType: this.networkType || "mainnet", wordLength: wordLength || 12, accountIndex: i });
            this.accounts.push(this.account);
        }

        console.log("Network Type: ", networkType || "mainnet");
    }

    /**
     * Retrieves all accounts stored in the Navi SDK.
     * 
     * @returns An array of all accounts.
     */
    getAllAccounts() {
        this.accounts.forEach((account, index) => {
            console.log(`index:${index}, address: ${account.getPublicKey()}`);
        });
        return this.accounts;
    }

    /**
     * Retrieves the mnemonic associated with the Navi SDK instance.
     * 
     * @returns The mnemonic string.
     */
    getMnemonic() {
        console.log(`mnemonic: ${this.mnemonic}`);
        return this.mnemonic;
    }

    /**
     * Retrieves the pool information for a specific coin symbol.
     * If no coin symbol is provided, it retrieves the pool information for all coins.
     * @param coinType The dataType of the coin for which to retrieve the pool information.
     * @returns A Promise that resolves to the pool information.
     */
    async getPoolInfo(coinType: CoinInfo) {
        return await getPoolInfo(coinType.symbol);
    }

    /**
     * Retrieves the reserves for the first account.
     * @returns {Promise<void>} A promise that resolves when the reserves are retrieved.
     */
    async getReserves() {
        return await this.accounts[0].getReserves();
    }
    /**
     * Retrieves the reserve detail for a given asset ID.
     * @param conType - The CoinInfo data type for which to retrieve the reserve detail
     * @returns A Promise that resolves when the reserve detail is retrieved.
     */
    async getReserveDetail(conType: CoinInfo) {
        const reserve: PoolConfig = pool[conType.symbol as keyof Pool];
        return await this.accounts[0].getReservesDetail(reserve.assetId);
    }

    /**
     * Retrieves the health factor for a given address.
     * 
     * @param address - The address for which to retrieve the health factor.
     * @returns A promise that resolves to the health factor value.
     */
    async getHealthFactor(address: string) {

        if (this.accounts.length === 0) {
            this.account = new AccountManager();
            this.accounts.push(this.account);
            await this.accounts[0].getHealthFactor(address);
            this.accounts.splice(0, 1);
        }
        return await this.accounts[0].getHealthFactor(address);
    }

    /**
     * Retrieves the dynamic health factor for a given address and pool.
     * 
     * @param address - The address to retrieve the dynamic health factor for.
     * @param coinType - The Type of the pool.
     * @param estimateSupply - The estimated supply value.
     * @param estimateBorrow - The estimated borrow value.
     * @param is_increase - A boolean indicating whether to increase the dynamic health factor.
     * @returns A Promise that resolves to the dynamic health factor.
     */
    async getDynamicHealthFactor(address: string, coinType: CoinInfo, estimateSupply: number, estimateBorrow: number, is_increase: boolean = true) {

        if (this.accounts.length === 0) {
            this.account = new AccountManager();
            this.accounts.push(this.account);
            await this.accounts[0].getDynamicHealthFactorAll(address, coinType.symbol, estimateSupply, estimateBorrow, is_increase);
            this.accounts.splice(0, 1);
        }
        await this.accounts[0].getDynamicHealthFactorAll(address, coinType.symbol, estimateSupply, estimateBorrow, is_increase);

    }

    /**
     * Retrieves all NAVI portfolios for the accounts.
     * @returns A promise that resolves to an array of results for each account.
     */
    async getAllNaviPortfolios() {

        const results = await Promise.all(this.accounts.map(account => account.getNAVIPortfolio(account.address, false)));

        const balanceMap = new Map<string, { borrowBalance: number, supplyBalance: number }>();
        results.forEach((result) => {
            result.forEach((value, key) => {
                if (balanceMap.has(key)) {
                    const balance = balanceMap.get(key);
                    balance!.borrowBalance += value.borrowBalance;
                    balance!.supplyBalance += value.supplyBalance;
                    balanceMap.set(key, balance!);
                } else {
                    balanceMap.set(key, value);
                }
            });
        });

        return balanceMap;
    }

    /**
     * Retrieves the balances of all accounts.
     * @returns A record containing the balances of each coin.
     */
    async getAllBalances() {
        const balancePromises = this.accounts.map(account => account.getWalletBalance(false));
        const balancesAll = await Promise.all(balancePromises);
        const coinBalances: Record<string, number> = {};
        balancesAll.forEach(balance => {
            Object.entries(balance).forEach(([coin, amount]) => {
                if (coinBalances[coin]) {
                    coinBalances[coin] += amount;
                } else {
                    coinBalances[coin] = amount;
                }
            });
        });
        return coinBalances;
    }

    /**
     * Checks the available rewards for a given address.
     * @param address - The address to check rewards for.
     * @param option - The option type for rewards.
     * @returns A promise that resolves with the available rewards.
     */
    async getAvailableRewards(address: string = this.accounts[0].address, option: OptionType = 1) {
        await this.accounts[0].getAvailableRewards(address, option, true);
    }
}
