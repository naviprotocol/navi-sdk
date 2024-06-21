import { AccountManager } from "./libs/AccountManager";
import { initializeParams, CoinInfo, Pool, PoolConfig, OptionType } from "./types";
import { getPoolInfo } from './libs/PoolInfo';
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { pool } from "./address";
import {getAvailableRewards} from './libs/PTB';

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
    constructor({ mnemonic, networkType, wordLength = 12, numberOfAccounts = 10 }: initializeParams = {}) {
        this.mnemonic = mnemonic ?? bip39.generateMnemonic(wordlist, wordLength === 12 ? 128 : 256);
        this.networkType = networkType || "mainnet";
        for (let i = 0; i < numberOfAccounts; i++) {
            this.account = new AccountManager({ mnemonic: this.mnemonic, network: this.networkType, accountIndex: i });
            this.accounts.push(this.account);
        }
        console.log("Network Type:", this.networkType);
    }

    /**
     * Retrieves all accounts stored in the Navi SDK.
     * @returns An array of all accounts.
     */
    getAllAccounts() {
        this.accounts.forEach((account, index) => {
            console.log(`index: ${index}, address: ${account.getPublicKey()}`);
        });
        return this.accounts;
    }

    /**
     * Retrieves the mnemonic associated with the Navi SDK instance.
     * @returns The mnemonic string.
     */
    getMnemonic() {
        console.log(`mnemonic: ${this.mnemonic}`);
        return this.mnemonic;
    }

    /**
     * Retrieves the pool information for a specific coin symbol.
     * If no coin symbol is provided, it retrieves the pool information for all coins.
     * @param coinType - The data type of the coin for which to retrieve the pool information.
     * @returns A Promise that resolves to the pool information.
     */
    async getPoolInfo(coinType: CoinInfo) {
        return getPoolInfo(coinType);
    }

    /**
     * Retrieves the reserve detail for a given asset ID.
     * @param coinType - The CoinInfo data type for which to retrieve the reserve detail.
     * @returns A Promise that resolves when the reserve detail is retrieved.
     */
    async getReserveDetail(coinType: CoinInfo) {
        const reserve: PoolConfig = pool[coinType.symbol as keyof Pool];
        return this.accounts[0].getReservesDetail(reserve.assetId);
    }

    /**
     * Retrieves the health factor for a given address.
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
        return this.accounts[0].getHealthFactor(address);
    }

    /**
     * Retrieves the dynamic health factor for a given address and pool.
     * @param address - The address to retrieve the dynamic health factor for.
     * @param coinType - The type of the pool.
     * @param estimateSupply - The estimated supply value.
     * @param estimateBorrow - The estimated borrow value.
     * @param isIncrease - A boolean indicating whether to increase the dynamic health factor.
     * @returns A Promise that resolves to the dynamic health factor.
     */
    async getDynamicHealthFactor(address: string, coinType: CoinInfo, estimateSupply: number, estimateBorrow: number, isIncrease: boolean = true) {
        if (this.accounts.length === 0) {
            this.account = new AccountManager();
            this.accounts.push(this.account);
            await this.accounts[0].getDynamicHealthFactor(address, coinType, estimateSupply, estimateBorrow, isIncrease);
            this.accounts.splice(0, 1);
        }
        return this.accounts[0].getDynamicHealthFactor(address, coinType, estimateSupply, estimateBorrow, isIncrease);
    }

    /**
     * Retrieves all NAVI portfolios for the accounts.
     * @returns A promise that resolves to an array of results for each account.
     */
    async getAllNaviPortfolios() {
        const results = await Promise.all(this.accounts.map(account => account.getNAVIPortfolio(account.address, false)));
        const balanceMap = new Map<string, { borrowBalance: number, supplyBalance: number }>();

        results.forEach(result => {
            result.forEach((value, key) => {
                const balance = balanceMap.get(key) || { borrowBalance: 0, supplyBalance: 0 };
                balance.borrowBalance += value.borrowBalance;
                balance.supplyBalance += value.supplyBalance;
                balanceMap.set(key, balance);
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
                coinBalances[coin] = (coinBalances[coin] || 0) + amount;
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
    async getAddressAvailableRewards(address: string = this.accounts[0].address, option: OptionType = 1) {
        const client = this.accounts[0].client;
        return getAvailableRewards(client, address, option, true);
    }
}
