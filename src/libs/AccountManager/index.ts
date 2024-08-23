import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { initializeParams, NetworkType } from "../../types";
import { getCoinAmount, getCoinDecimal } from "../Coins";
import { Transaction } from "@mysten/sui/transactions";
import { getConfig, pool, AddressMap, vSui } from "../../address";
import { Pool, PoolConfig, CoinInfo, OptionType } from "../../types";
import {
  depositCoin,
  depositCoinWithAccountCap,
  returnMergedCoins,
  getHealthFactor,
  withdrawCoin,
  withdrawCoinWithAccountCap,
  borrowCoin,
  repayDebt,
  liquidateFunction,
  claimRewardFunction,
  SignAndSubmitTXB,
  stakeTovSuiPTB,
  unstakeTovSui,
  getIncentivePools,
  getAvailableRewards,
  claimAllRewardsPTB,
  updateOraclePTB
} from "../PTB";
import { moveInspect } from "../CallFunctions";
import assert from 'assert';
import { registerStructs } from '../PTB';


export class AccountManager {
  public keypair: Ed25519Keypair;
  public client: SuiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
  public address: string = "";

  /**
   * AccountManager class for managing user accounts.
   */
  constructor({ mnemonic = "", network = "mainnet", accountIndex = 0 } = {}) {

    this.keypair = Ed25519Keypair.deriveKeypair(mnemonic, this.getDerivationPath(accountIndex));

    const validNetworkTypes = ["mainnet", "testnet", "devnet", "localnet"];
    try {
      if (validNetworkTypes.includes(network)) {
        this.client = new SuiClient({
          url: getFullnodeUrl(network as NetworkType),
        });
      } else {
        this.client = new SuiClient({ url: network });
      }
    }
    catch (e) {
      console.log("Invalid network type or RPC", e);
    }

    this.address = this.keypair.getPublicKey().toSuiAddress();
    registerStructs();
  }



  /**
   * Returns the derivation path for a given address index.
   * 
   * @param addressIndex - The index of the address.
   * @returns The derivation path as a string.
   */
  getDerivationPath(addressIndex: number) {
    return `m/44'/784'/0'/0'/${addressIndex}'`;
  };

  /**
   * Retrieves the public key associated with the account.
   * @returns The public key as a Sui address string.
   */
  getPublicKey() {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  /**
   * getAllCoins is an asynchronous function that retrieves all the coins owned by the account.
   * 
   * @param prettyPrint - A boolean indicating whether to print the data in a pretty format. Default is true.
   * @returns A Promise that resolves to the data containing all the coins owned by the account.
   */
  async getAllCoins(prettyPrint: boolean = true): Promise<any> {
    const allData = await this.client.getAllCoins({
      owner: this.address,
    });

    if (prettyPrint) {
      allData.data.forEach((element: any) => {
        console.log("Coin Type: ", element.coinType, "| Obj id: ", element.coinObjectId, " | Balance: ", element.balance);
      });
    }

    return allData;
  }

  /**
   * getWalletBalance is an asynchronous function that retrieves the balance of all coins in the wallet.
   * 
   * @param prettyPrint - A boolean indicating whether to print the data in a pretty format. Default is false.
   * @returns A Promise that resolves to an object containing the balance of each coin in the wallet. Record<string, number>
   */
  async getWalletBalance(prettyPrint: boolean = true): Promise<Record<string, number>> {
    const allData = await this.getAllCoins(false);
    const coinBalances: Record<string, number> = {};

    await Promise.all(allData.data.map(async (element: any) => {
      const coinType = element.coinType;
      const balance: any = element.balance;
      const decimal: any = await this.getCoinDecimal(coinType);

      if (coinBalances[coinType]) {
        coinBalances[coinType] += Number(balance) / Math.pow(10, decimal);
      } else {
        coinBalances[coinType] = Number(balance) / Math.pow(10, decimal);
      }
    }));

    if (prettyPrint) {
      for (const coinType in coinBalances) {
        if (AddressMap.hasOwnProperty(coinType)) {
          console.log("Coin Type: ", AddressMap[coinType], "| Balance: ", coinBalances[coinType]);
        } else {
          console.log("Unknown Coin Type: ", coinType, "| Balance: ", coinBalances[coinType]);
        }
      }
    }
    return coinBalances;
  }

  /**
   * Retrieves coin objects based on the specified coin type.
   * @param coinType - The coin type to retrieve coin objects for. Defaults to "0x2::sui::SUI".
   * @returns A Promise that resolves to the retrieved coin objects.
   */
  async getCoins(coinType: any = "0x2::sui::SUI") {
    const coinAddress = coinType.address ? coinType.address : coinType;

    const coinDetails = await this.client.getCoins({
      owner: this.address,
      coinType: coinAddress
    });
    return coinDetails;
  }

  /**
   * Creates an account capability.
   * @returns A Promise that resolves to the result of the account creation.
   */
  async createAccountCap() {
    let txb = new Transaction();
    let sender = this.getPublicKey();
    txb.setSender(sender);

    const config = await getConfig();

    const [ret] = txb.moveCall({
      target: `${config.ProtocolPackage}::lending::create_account`,
    });
    txb.transferObjects([ret], this.getPublicKey());
    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Sends coins to multiple recipients.
   * 
   * @param coinType - The type of coin to send.
   * @param recipients - An array of recipient addresses.
   * @param amounts - An array of amounts to send to each recipient.
   * @returns A promise that resolves to the result of the transaction.
   * @throws An error if the recipient list contains an empty address string, or if the length of the recipient array is not equal to the length of the amounts array, or if there is insufficient balance for the coin.
   */
  async sendCoinsToMany(
    coinType: any,
    recipients: string[],
    amounts: number[]
  ) {
    const coinAddress = coinType.address ? coinType.address : coinType;

    // Check if any recipient address is an empty string
    if (recipients.some(address => address.trim() === "")) {
      throw new Error("Recipient list contains an empty address string.");
    }

    if (recipients.length !== amounts.length) {
      throw new Error(
        "recipients.length !== amounts.length"
      );
    }
    let sender = this.getPublicKey();
    const coinBalance = await getCoinAmount(
      this.client,
      this.getPublicKey(),
      coinAddress
    );

    if (
      coinBalance > 0 &&
      coinBalance >= amounts.reduce((a, b) => a + b, 0)
    ) {
      const txb = new Transaction();
      txb.setSender(sender);
      let coinInfo = await this.getCoins(coinAddress);
      let coins: any;
      if (coinAddress == "0x2::sui::SUI") {
        coins = txb.splitCoins(txb.gas, amounts);
      } else {
        if (coinInfo.data.length >= 2) {
          let baseObj = coinInfo.data[0].coinObjectId;
          let allList = coinInfo.data.slice(1).map(coin => coin.coinObjectId);

          txb.mergeCoins(baseObj, allList);
        }
        let mergedCoin = txb.object(coinInfo.data[0].coinObjectId);
        coins = txb.splitCoins(mergedCoin, amounts);
      }
      recipients.forEach((address, index) => {
        txb.transferObjects([coins[index]], address);
      });

      const result = SignAndSubmitTXB(txb, this.client, this.keypair);
      return result;
    } else {
      throw new Error("Insufficient balance for this Coin");
    }
  }

  /**
   * Sends a specified amount of coins to a recipient.
   * 
   * @param coinType - The type of coin to send.
   * @param recipient - The address of the recipient.
   * @param amount - The amount of coins to send.
   * @returns A promise that resolves when the coins are sent.
   */
  async sendCoin(
    coinType: any,
    recipient: string,
    amount: number
  ) {
    const coinAddress = coinType.address ? coinType.address : coinType;
    return await this.sendCoinsToMany(
      coinAddress,
      [recipient],
      [amount]
    );
  }

  /**
   * Transfers multiple objects to multiple recipients.
   * @param objects - An array of objects to be transferred.
   * @param recipients - An array of recipients for the objects.
   * @returns A promise that resolves with the result of the transfer.
   * @throws An error if the length of objects and recipient arrays are not the same.
   */
  async transferObjectsToMany(
    objects: string[],
    recipients: string[]
  ) {
    if (objects.length !== recipients.length) {
      throw new Error("The length of objects and recipients should be the same");
    } else {
      let sender = this.getPublicKey();
      const txb = new Transaction();
      txb.setSender(sender);
      objects.forEach((object, index) => {
        txb.transferObjects([txb.object(object)], recipients[index]);
      });
      const result = SignAndSubmitTXB(txb, this.client, this.keypair);
      return result;
    }
  }

  /**
   * Transfers an object to a recipient.
   * @param object - The object to be transferred.
   * @param recipient - The recipient of the object.
   * @returns A promise that resolves when the transfer is complete.
   */
  async transferObject(object: string, recipient: string) {
    return await this.transferObjectsToMany([object], [recipient]);
  }

  /**
   * Deposits a specified amount of a given coin type to Navi.
   * @param coinType - The coin type to deposit.
   * @param amount - The amount to deposit.
   * @returns A promise that resolves to the result of the deposit transaction.
   * @throws An error if there is insufficient balance for the coin.
   */
  async depositToNavi(
    coinType: CoinInfo,
    amount: number
  ) {
    const coinSymbol = coinType.symbol;

    let txb = new Transaction();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const poolConfig: PoolConfig = pool[coinSymbol as keyof Pool];

    let coinInfo = await this.getCoins(coinType.address);
    if (!coinInfo.data[0]) {
      throw new Error("Insufficient balance for this Coin");
    }
    if (coinSymbol == "Sui") {
      const [toDeposit] = txb.splitCoins(txb.gas, [amount]);
      await depositCoin(txb, poolConfig, toDeposit, amount);
    } else {
      const mergedCoinObject = returnMergedCoins(txb, coinInfo);
      await depositCoin(txb, poolConfig, mergedCoinObject, amount);
    }
    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Deposits a specified amount of a given coin type to Navi with an account cap address.
   * @param coinType - The coin type to deposit.
   * @param amount - The amount to deposit.
   * @param accountCapAddress - The account cap address.
   * @returns A promise that resolves to the result of the deposit transaction.
   * @throws An error if there is insufficient balance for the coin.
   */
  async depositToNaviWithAccountCap(
    coinType: CoinInfo,
    amount: number,
    accountCapAddress: string
  ) {
    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;

    let txb = new Transaction();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const poolConfig: PoolConfig = pool[coinSymbol as keyof Pool];

    let coinInfo = await this.getCoins(coinType.address);
    if (!coinInfo.data[0]) {
      throw new Error("Insufficient balance for this Coin");
    }
    if (coinSymbol == "Sui") {
      const [toDeposit] = txb.splitCoins(txb.gas, [amount]);
      await depositCoinWithAccountCap(txb, poolConfig, toDeposit, accountCapAddress);
    } else {
      const mergedCoinObject = returnMergedCoins(txb, coinInfo);
      await depositCoinWithAccountCap(
        txb,
        poolConfig,
        mergedCoinObject,
        accountCapAddress
      );
    }
    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Withdraws a specified amount of coins.
   * @param coinType - The type of coin to withdraw.
   * @param amount - The amount of coins to withdraw.
   * @param updateOracle - A boolean indicating whether to update the oracle. Default is true. Set to false to save gas.
   * @returns A promise that resolves to the result of the withdrawal.
   */
  async withdraw(coinType: CoinInfo, amount: number, updateOracle: boolean = true) {

    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;
    let txb = new Transaction();
    if (updateOracle) {
      await updateOraclePTB(this.client, this.address, txb);
    }
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const poolConfig: PoolConfig = pool[coinSymbol as keyof Pool];

    const [returnCoin] = await withdrawCoin(txb, poolConfig, amount);
    txb.transferObjects([returnCoin], sender);

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Withdraws a specified amount of coins with an account cap.
   * 
   * @param coinType - The type of coin to withdraw.
   * @param withdrawAmount - The amount of coins to withdraw.
   * @param accountCapAddress - The address of the account cap.
   * @param updateOracle - A boolean indicating whether to update the oracle. Default is true. Set to false to save gas.
   * @returns A promise that resolves to the result of the withdrawal.
   */
  async withdrawWithAccountCap(
    coinType: CoinInfo,
    withdrawAmount: number,
    accountCapAddress: string,
    updateOracle: boolean = true
  ) {
    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;

    let txb = new Transaction();
    if (updateOracle) {
      await updateOraclePTB(this.client, this.address, txb);
    }
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const poolConfig: PoolConfig = pool[coinSymbol as keyof Pool];
    const [returnCoin] = await withdrawCoinWithAccountCap(
      txb,
      poolConfig,
      accountCapAddress,
      withdrawAmount,
      sender
    );

    txb.transferObjects([returnCoin], sender);

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Borrows a specified amount of a given coin.
   * 
   * @param coinType - The type of coin to borrow.
   * @param borrowAmount - The amount of the coin to borrow.
   * @returns A promise that resolves to the result of the borrowing operation.
   */
  async borrow(
    coinType: CoinInfo,
    borrowAmount: number,
    updateOracle: boolean = true
  ) {
    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;

    let txb = new Transaction();
    if (updateOracle) {
      await updateOraclePTB(this.client, this.address, txb);
    }
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const poolConfig: PoolConfig = pool[coinSymbol as keyof Pool];
    const [returnCoin] = await borrowCoin(txb, poolConfig, borrowAmount);
    txb.transferObjects([returnCoin], sender);

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Repays a specified amount of a given coin type.
   * 
   * @param coinType - The coin type or coin symbol to repay.
   * @param repayAmount - The amount to repay.
   * @returns A promise that resolves to the result of the repayment transaction.
   * @throws An error if there is insufficient balance for the specified coin.
   */
  async repay(coinType: CoinInfo, repayAmount: number) {
    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;

    let txb = new Transaction();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const poolConfig: PoolConfig = pool[coinSymbol as keyof Pool];

    let coinInfo = await this.getCoins(coinType.address);
    if (!coinInfo.data[0]) {
      throw new Error("Insufficient balance for this Coin");
    }
    if (coinSymbol == "Sui") {
      const [toDeposit] = txb.splitCoins(txb.gas, [repayAmount]);

      await repayDebt(txb, poolConfig, toDeposit, repayAmount);
    } else {
      const mergedCoinObject = returnMergedCoins(txb, coinInfo);
      await repayDebt(txb, poolConfig, mergedCoinObject, repayAmount);
    }

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Liquidates a specified amount of coins.
   * 
   * @param payCoinType - The coin type to be paid for liquidation.
   * @param liquidationAddress - The address to which the liquidated coins will be transferred.
   * @param collateralCoinType - The coin type to be used as collateral for liquidation.
   * @param liquidationAmount - The amount of coins to be liquidated (optional, default is 0).
   * @param updateOracle - A boolean indicating whether to update the oracle. Default is true. Set to false to save gas.
   * @returns PtbResult - The result of the liquidation transaction.
   */
  async liquidate(payCoinType: CoinInfo, liquidationAddress: string, collateralCoinType: CoinInfo, liquidationAmount: number = 0, updateOracle: boolean = true) {

    let txb = new Transaction();
    if (updateOracle) {
      await updateOraclePTB(this.client, this.address, txb);
    }
    txb.setSender(this.address);

    let coinInfo = await this.getCoins(payCoinType.address);
    let allBalance = await this.client.getBalance({ owner: this.address, coinType: payCoinType.address });
    let { totalBalance } = allBalance;
    if (liquidationAmount != 0) {
      assert(liquidationAmount * Math.pow(10, payCoinType.decimal) <= Number(totalBalance), "Insufficient balance for this Coin, please don't apply decimals to liquidationAmount");
      totalBalance = (liquidationAmount * Math.pow(10, payCoinType.decimal)).toString();
    }

    if (payCoinType.symbol == "Sui") {

      totalBalance = (Number(totalBalance) - 1 * 1e9).toString(); //You need to keep some Sui for gas

      let [mergedCoin] = txb.splitCoins(txb.gas, [txb.pure.u64(Number(totalBalance))]);

      const [mergedCoinBalance] = txb.moveCall({
        target: `0x2::coin::into_balance`,
        arguments: [mergedCoin],
        typeArguments: [payCoinType.address],
      });

      const [collateralBalance, remainingDebtBalance] = await liquidateFunction(txb, payCoinType, mergedCoinBalance, collateralCoinType, liquidationAddress, totalBalance);

      const [collateralCoin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [collateralBalance],
        typeArguments: [collateralCoinType.address],
      });

      const [leftDebtCoin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [remainingDebtBalance],
        typeArguments: [payCoinType.address],
      });

      txb.transferObjects([collateralCoin, leftDebtCoin], this.address);
    }
    else {
      if (coinInfo.data.length >= 2) {
        const txbMerge = new Transaction();
        txbMerge.setSender(this.address);
        let baseObj = coinInfo.data[0].coinObjectId;
        let allList = coinInfo.data.slice(1).map(coin => coin.coinObjectId);

        txb.mergeCoins(baseObj, allList);

        SignAndSubmitTXB(txbMerge, this.client, this.keypair);
      }

      let mergedCoin = txb.object(coinInfo.data[0].coinObjectId);
      const [collateralCoinBalance] = txb.moveCall({
        target: `0x2::coin::into_balance`,
        arguments: [mergedCoin],
        typeArguments: [payCoinType.address],
      });
      const [collateralBalance, remainingDebtBalance] = await liquidateFunction(txb, payCoinType, collateralCoinBalance, collateralCoinType, liquidationAddress, totalBalance);

      const [collateralCoin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [collateralBalance],
        typeArguments: [collateralCoinType.address],
      });

      const [leftDebtCoin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [remainingDebtBalance],
        typeArguments: [payCoinType.address],
      });

      txb.transferObjects([collateralCoin, leftDebtCoin], this.address);
    }

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Retrieves the health factor for a given address.
   * @param address - The address for which to retrieve the health factor. Defaults to the instance's address.
   * @returns The health factor as a number.
   */
  async getHealthFactor(address: string = this.address) {
    const config = await getConfig();
    const tx = new Transaction();
    const result: any = await moveInspect(tx, this.client, this.getPublicKey(), `${config.ProtocolPackage}::logic::user_health_factor`, [
      tx.object('0x06'), // clock object id
      tx.object(config.StorageId), // object id of storage
      tx.object(config.PriceOracle), // object id of price oracle
      tx.pure.address(address), // user address
    ]);
    const healthFactor = Number(result[0]) / Math.pow(10, 27);

    return healthFactor;
  }

  /**
   * Retrieves the dynamic health factor for a given user in a specific pool.
   * @param userAddress - The address of the user.
   * @param poolName - The name of the pool.
   * @param estimatedSupply - The estimated supply value (default: 0).
   * @param estimatedBorrow - The estimated borrow value (default: 0).
   * @param isIncrease - A boolean indicating whether the health factor is increasing (default: true).
   * @returns The health factor for the user in the pool.
   * @throws Error if the pool does not exist.
   */
  async getDynamicHealthFactor(userAddress: string, coinType: CoinInfo, estimatedSupply: number = 0, estimatedBorrow: number = 0, isIncrease: boolean = true) {
    const poolConfig: PoolConfig = pool[coinType.symbol as keyof Pool];
    if (!poolConfig) {
      throw new Error("Pool does not exist");
    }
    const config = await getConfig();
    const tx = new Transaction();
    const result: any = await moveInspect(tx, this.client, this.getPublicKey(), `${config.ProtocolPackage}::dynamic_calculator::dynamic_health_factor`, [
      tx.object('0x06'), // clock object id
      tx.object(config.StorageId), // object id of storage
      tx.object(config.PriceOracle), // object id of price oracle
      tx.object(poolConfig.poolId),
      tx.pure.address(userAddress), // user address,
      tx.pure.u8(poolConfig.assetId),
      tx.pure.u64(estimatedSupply),
      tx.pure.u64(estimatedBorrow),
      tx.pure.bool(isIncrease)
    ], [poolConfig.type]);

    const healthFactor = Number(result[0]) / Math.pow(10, 27);

    if (estimatedSupply > 0) {
      console.log('With EstimateSupply Change: ', `${estimatedSupply}`, ' address: ', `${userAddress}`, ' health factor is: ', healthFactor.toString());
    }
    else if (estimatedBorrow > 0) {
      console.log('With EstimateBorrow Change: ', `${estimatedBorrow}`, ' address: ', `${userAddress}`, ' health factor is: ', healthFactor.toString());
    }
    else {
      console.log('address: ', `${userAddress}`, ' health factor is: ', healthFactor.toString());
    }
    return healthFactor.toString();
  }

  /**
   * Retrieves the decimal value for a given coin type.
   * If the coin type has an address property, it uses that address. Otherwise, it uses the coin type itself.
   * 
   * @param coinType - The coin type or coin object.
   * @returns The decimal value of the coin.
   */
  async getCoinDecimal(coinType: any) {
    const coinAddress = coinType.address ? coinType.address : coinType;
    const decimal = await getCoinDecimal(this.client, coinAddress);
    return decimal;
  }

  parseResult(msg: any) {
    console.log(JSON.stringify(msg, null, 2));
  }

  /**
   * Retrieves the detailed information of a reserve based on the provided asset ID.
   * @param assetId - The ID of the asset for which to retrieve the reserve details.
   * @returns A Promise that resolves to the parsed result of the reserve details.
   */
  async getReservesDetail(assetId: number) {
    const config = await getConfig();
    const result = await this.client.getDynamicFieldObject({ parentId: config.ReserveParentId, name: { type: 'u8', value: assetId } });
    return result;
  }

  /**
   * Retrieves the NAVI portfolio for the current account.
   * @param prettyPrint - A boolean indicating whether to print the portfolio in a pretty format. Default is true.
   * @returns A Promise that resolves to a Map containing the borrow and supply balances for each reserve.
   */
  async getNAVIPortfolio(address: string = this.address, prettyPrint: boolean = true): Promise<Map<string, { borrowBalance: number, supplyBalance: number }>> {
    const balanceMap = new Map<string, { borrowBalance: number, supplyBalance: number }>();

    await Promise.all(Object.keys(pool).map(async (poolKey) => {
      const reserve: PoolConfig = pool[poolKey as keyof Pool];
      const borrowBalance: any = await this.client.getDynamicFieldObject({ parentId: reserve.borrowBalanceParentId, name: { type: 'address', value: address } });
      const supplyBalance: any = await this.client.getDynamicFieldObject({ parentId: reserve.supplyBalanceParentId, name: { type: 'address', value: address } });

      const borrowIndexData: any = await this.getReservesDetail(reserve.assetId);
      const borrowIndex = borrowIndexData.data?.content?.fields?.value?.fields?.current_borrow_index / Math.pow(10, 27);
      const supplyIndex = borrowIndexData.data?.content?.fields?.value?.fields?.current_supply_index / Math.pow(10, 27);

      let borrowValue = borrowBalance && borrowBalance.data?.content?.fields.value !== undefined ? borrowBalance.data?.content?.fields.value / Math.pow(10, 9) : 0;
      let supplyValue = supplyBalance && supplyBalance.data?.content?.fields.value !== undefined ? supplyBalance.data?.content?.fields.value / Math.pow(10, 9) : 0;
      borrowValue *= borrowIndex;
      supplyValue *= supplyIndex;

      if (prettyPrint) {
        console.log(`| ${reserve.name} | ${borrowValue} | ${supplyValue} |`);
      }
      balanceMap.set(reserve.name, { borrowBalance: borrowValue, supplyBalance: supplyValue });
    }));

    return balanceMap;
  }


  /**
   * Claims all available rewards for the specified account.
   * @param updateOracle - A boolean indicating whether to update the oracle. Default is true. Set to false to save gas.
   * @returns PTB result
   */
  async claimAllRewards(updateOracle: boolean = true) {

    let txb = await claimAllRewardsPTB(this.client, this.address);
    txb.setSender(this.address);

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Stakes a specified amount of SuitoVoloSui.
   * @param stakeAmount The amount of SuitoVoloSui to stake. Must be greater than 1Sui.
   * @returns PTB result
   */
  async stakeSuitoVoloSui(stakeAmount: number) {
    let txb = new Transaction();
    txb.setSender(this.address);

    assert(stakeAmount >= 1e9, "Stake amount should be greater than 1Sui");
    const [toSwapSui] = txb.splitCoins(txb.gas, [stakeAmount]);

    const vSuiCoin = await stakeTovSuiPTB(txb, toSwapSui);
    txb.transferObjects([vSuiCoin], this.address);

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Unstakes a specified amount of SUI from VOLO SUI.
   * If no amount is provided, unstakes all available vSUI. Must be greater than 1vSui.
   * 
   * @param unstakeAmount - The amount of SUI to unstake. If not provided, all available vSUI will be unstaked.
   * @returns PTB result
   */
  async unstakeSuiFromVoloSui(unstakeAmount: number = -1) {
    let txb = new Transaction();
    txb.setSender(this.address);

    let coinInfo = await this.getCoins(vSui.address);

    if (coinInfo.data.length >= 2) {
      const txbMerge = new Transaction();
      txbMerge.setSender(this.address);
      let baseObj = coinInfo.data[0].coinObjectId;
      let allList = coinInfo.data.slice(1).map(coin => coin.coinObjectId);

      txbMerge.mergeCoins(baseObj, allList);
      await SignAndSubmitTXB(txbMerge, this.client, this.keypair);
    }

    coinInfo = await this.getCoins(vSui.address);
    if (unstakeAmount == -1) {
      unstakeAmount = Number(coinInfo.data[0].balance);
    }
    assert(unstakeAmount >= 1e9, "Unstake amount should >= 1vSui");

    let mergedCoin = txb.object(coinInfo.data[0].coinObjectId);
    const [splittedCoin] = txb.splitCoins(mergedCoin, [unstakeAmount]);
    await unstakeTovSui(txb, splittedCoin);

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Updates the Oracle.
   * 
   * @returns The result of the transaction submission.
   */
  async updateOracle() {
    let txb = new Transaction();
    txb.setSender(this.address);
    await updateOraclePTB(this.client, this.address, txb);

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }
}
