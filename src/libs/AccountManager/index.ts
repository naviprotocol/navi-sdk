import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { initializeParas, NetworkType } from "../../types";
import { getCoinAmount, getCoinDecimal } from "../Coins";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { getConfig, pool, AddressMap } from "../../address";
import { Pool, PoolConfig, CoinInfo, OptionType } from "../../types";
import {
  depositCoin,
  depositCoinWithAccountCap,
  mergeCoins,
  getHealthFactor,
  withdrawCoin,
  withdrawCoinWithAccountCap,
  borrowCoin,
  repayDebt,
  liquidateFunction,
  claimRewardFunction,
  SignAndSubmitTXB,
} from "../PTB";
import { moveInspect } from "../CallFunctions";
import { bcs } from '@mysten/sui.js/bcs';
import assert from 'assert';



export class AccountManager {
  public keypair: Ed25519Keypair;
  public client: SuiClient;
  public address: string = "";

  /**
   * AccountManager class for managing user accounts.
   */
  constructor({ mnemonic = "", networkType, accountIndex = 0 }: initializeParas = {}) {

    this.keypair = Ed25519Keypair.deriveKeypair(mnemonic, this.getDerivePath(accountIndex));
    this.client = new SuiClient({
      url: getFullnodeUrl(networkType as NetworkType),
    });
    this.address = this.keypair.getPublicKey().toSuiAddress();
    this.structRegistry();
  }

  structRegistry() {
    bcs.registerStructType('IncentiveAPYInfo', {
      asset_id: 'u8',
      apy: 'u256',
      coin_types: 'vector<string>',
    });

    bcs.registerStructType('IncentivePoolInfo', {
      pool_id: 'address',
      funds: 'address',
      phase: 'u64',
      start_at: 'u64',
      end_at: 'u64',
      closed_at: 'u64',
      total_supply: 'u64',
      asset_id: 'u8',
      option: 'u8',
      factor: 'u256',
      distributed: 'u64',
      available: 'u256',
      total: 'u256',
    });

    bcs.registerStructType('IncentivePoolInfoByPhase', {
      phase: 'u64',
      pools: 'vector<IncentivePoolInfo>',
    });

    bcs.registerStructType('UserStateInfo', {
      asset_id: 'u8',
      borrow_balance: 'u256',
      supply_balance: 'u256',
    });

    bcs.registerStructType('ReserveDataInfo', {
      id: 'u8',
      oracle_id: 'u8',
      coin_type: 'string',
      supply_cap: 'u256',
      borrow_cap: 'u256',
      supply_rate: 'u256',
      borrow_rate: 'u256',
      supply_index: 'u256',
      borrow_index: 'u256',
      total_supply: 'u256',
      total_borrow: 'u256',
      last_update_at: 'u64',
      ltv: 'u256',
      treasury_factor: 'u256',
      treasury_balance: 'u256',
      base_rate: 'u256',
      multiplier: 'u256',
      jump_rate_multiplier: 'u256',
      reserve_factor: 'u256',
      optimal_utilization: 'u256',
      liquidation_ratio: 'u256',
      liquidation_bonus: 'u256',
      liquidation_threshold: 'u256',
    });
  }

  /**
   * Returns the derivation path for a given address index.
   * @param addressIndex - The index of the address.
   * @returns The derivation path.
   */
  getDerivePath(addressIndex: number) {

    return `m/44'/784'/0'/0'/${addressIndex}'`;
  };

  /**
   * Retrieves the public key associated with the account.
   * @returns The public key as a SuiAddress.
   */
  getPublicKey() {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  /**
   * getAllCoins is an asynchronous function that retrieves all the coins owned by the account.
   * 
   * @param ifPrettyPrint - A boolean indicating whether to print the data in a pretty format. Default is true.
   * @returns A Promise that resolves to the data containing all the coins owned by the account.
   */
  async getAllCoins(ifPrettyPrint: boolean = true): Promise<any> {
    const allData = await this.client.getAllCoins({
      owner: this.address,
    });

    if (ifPrettyPrint) {
      allData.data.forEach((element: any) => {
        console.log("Coin Type: ", element.coinType, "| Obj id: ", element.coinObjectId, " | Balance: ", element.balance);
      });
    }

    return allData;
  }

  /**
   * getWalletBalance is an asynchronous function that retrieves the balance of all coins in the wallet.
   * 
   * @param ifPrettyPrint - A boolean indicating whether to print the data in a pretty format. Default is false.
   * @returns A Promise that resolves to an object containing the balance of each coin in the wallet.
   */
  async getWalletBalance(ifPrettyPrint: boolean = true): Promise<Record<string, number>> {
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

    if (ifPrettyPrint) {
      for (const coinType in coinBalances) {
        if (AddressMap.hasOwnProperty(coinType)) {
          console.log("Coin Type: ", AddressMap[coinType], "| Balance: ", coinBalances[coinType]);
        }
        else {
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

    const coininfo = await this.client.getCoins({
      owner: this.address,
      coinType: coinAddress
    })
    return coininfo;
  }


  /**
   * Creates an account capability.
   * @returns A Promise that resolves to the result of the account creation.
   */
  async createAccountCap() {
    let txb = new TransactionBlock();
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
   * @param recipient - An array of recipient addresses.
   * @param amounts - An array of amounts to send to each recipient.
   * @returns A promise that resolves to the result of the transaction.
   * @throws An error if the number of recipients does not match the number of amounts, or if the sender has insufficient balance.
   */
  async sendCoinToMany(
    coinType: any,
    recipient: string[],
    amounts: number[]
  ) {
    const coinAddress = coinType.address ? coinType.address : coinType;

    if (recipient.length !== amounts.length) {
      throw new Error(
        "transferSuiToMany: recipients.length !== amounts.length"
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
      const txb = new TransactionBlock();
      txb.setSender(sender);
      let getCoinInfo = await this.getCoins(
        coinAddress
      );
      let coins: any;
      if (coinAddress == "0x2::sui::SUI") {
        coins = txb.splitCoins(txb.gas, amounts);
      } else {
        //Merge other coins to one obj if there are multiple
        if (getCoinInfo.data.length >= 2) {
          let baseObj = getCoinInfo.data[0].coinObjectId;
          let i = 1;
          while (i < getCoinInfo.data.length) {
            txb.mergeCoins(baseObj, [getCoinInfo.data[i].coinObjectId]);
            i++;
          }
        }
        let mergedCoin = txb.object(getCoinInfo.data[0].coinObjectId);

        coins = txb.splitCoins(mergedCoin, amounts);
      }
      recipient.forEach((address, index) => {
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

    return await this.sendCoinToMany(
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
  async transferObjsToMany(
    objects: string[],
    recipients: string[]
  ) {
    if (objects.length !== recipients.length) {
      throw new Error("The length of objects and recipient should be the same");
    } else {
      let sender = this.getPublicKey();
      const txb = new TransactionBlock();
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
  async transferObj(object: string, recipient: string) {
    return await this.transferObjsToMany([object], [recipient]);
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

    let txb = new TransactionBlock();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const pool_real: PoolConfig = pool[coinSymbol as keyof Pool];

    let getCoinInfo = await this.getCoins(coinType.address);
    if (!getCoinInfo.data[0]) {
      throw new Error("Insufficient balance for this Coin");
    }
    if (coinSymbol == "Sui") {
      const [to_deposit] = txb.splitCoins(txb.gas, [amount]);
      await depositCoin(txb, pool_real, to_deposit, amount);
    } else {
      //Try to merge all the tokens to one object
      const mergedCoinObject = mergeCoins(txb, getCoinInfo);
      await depositCoin(txb, pool_real, mergedCoinObject, amount);
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

    let txb = new TransactionBlock();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const pool_real: PoolConfig = pool[coinSymbol as keyof Pool];

    let getCoinInfo = await this.getCoins(coinType.address);
    if (!getCoinInfo.data[0]) {
      throw new Error("Insufficient balance for this Coin");
    }
    if (coinSymbol == "Sui") {
      const [to_deposit] = txb.splitCoins(txb.gas, [amount]);
      await depositCoinWithAccountCap(txb, pool_real, to_deposit, accountCapAddress);
    } else {
      //Try to merge all the tokens to one object
      const mergedCoinObject = mergeCoins(txb, getCoinInfo);
      await depositCoinWithAccountCap(
        txb,
        pool_real,
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
   * @returns A promise that resolves to the result of the withdrawal.
   */
  async withdraw(coinType: CoinInfo, amount: number) {

    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;
    let txb = new TransactionBlock();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const pool_real: PoolConfig = pool[coinSymbol as keyof Pool];

    await withdrawCoin(txb, pool_real, amount);
    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  /**
   * Withdraws a specified amount of coins with an account cap.
   * 
   * @param coinType - The type of coin to withdraw.
   * @param withdrawAmount - The amount of coins to withdraw.
   * @param accountCapAddress - The address of the account cap.
   * @returns A promise that resolves to the result of the withdrawal.
   */
  async withdrawWithAccountCap(
    coinType: CoinInfo,
    withdrawAmount: number,
    accountCapAddress: string
  ) {
    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;

    let txb = new TransactionBlock();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const pool_real: PoolConfig = pool[coinSymbol as keyof Pool];
    await withdrawCoinWithAccountCap(
      txb,
      pool_real,
      accountCapAddress,
      withdrawAmount,
      sender
    );

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
    borrowAmount: number
  ) {
    const coinSymbol = coinType.symbol ? coinType.symbol : coinType;

    let txb = new TransactionBlock();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const pool_real: PoolConfig = pool[coinSymbol as keyof Pool];
    await borrowCoin(txb, pool_real, borrowAmount);
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

    let txb = new TransactionBlock();
    let sender = this.getPublicKey();
    txb.setSender(sender);
    const pool_real: PoolConfig = pool[coinSymbol as keyof Pool];

    let getCoinInfo = await this.getCoins(coinType.address);
    if (!getCoinInfo.data[0]) {
      throw new Error("Insufficient balance for this Coin");
    }
    if (coinSymbol == "Sui") {
      const [to_deposit] = txb.splitCoins(txb.gas, [repayAmount]);

      await repayDebt(txb, pool_real, to_deposit, repayAmount);
    } else {
      //Try to merge all the tokens to one object
      const mergedCoinObject = mergeCoins(txb, getCoinInfo);
      await repayDebt(txb, pool_real, mergedCoinObject, repayAmount);
    }

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

  async liquidate(payCoinType: CoinInfo, to_liquidate_address: string, collateralCoinType: CoinInfo, to_liquidate_amount: number = 0) {

    let txb = new TransactionBlock();
    txb.setSender(this.address);

    let getCoinInfo = await this.getCoins(
      payCoinType.address
    );
    let allBalance = await this.client.getBalance({ owner: this.address, coinType: payCoinType.address });
    let { totalBalance } = allBalance;
    if (to_liquidate_amount != 0) {
      assert(to_liquidate_amount * Math.pow(10, payCoinType.decimal) <= Number(totalBalance), "Insufficient balance for this Coin, please don't apply decimals to to_liquidate_amount");
      totalBalance = (to_liquidate_amount * Math.pow(10, payCoinType.decimal)).toString();
    }

    if (payCoinType.symbol == "Sui") {
      totalBalance = (Number(totalBalance) - 0.5 * 1e9).toString(); //You need to keep some Sui for gas

      let [mergedCoin] = txb.splitCoins(txb.gas, [totalBalance]);
      await liquidateFunction(txb, payCoinType, mergedCoin, collateralCoinType, to_liquidate_address, totalBalance);

    }
    else {

      if (getCoinInfo.data.length >= 2) {
        const txbMerge = new TransactionBlock();
        txbMerge.setSender(this.address);
        let baseObj = getCoinInfo.data[0].coinObjectId;
        let i = 1;
        while (i < getCoinInfo.data.length) {
          txbMerge.mergeCoins(baseObj, [getCoinInfo.data[i].coinObjectId]);
          i++;
        }
        SignAndSubmitTXB(txbMerge, this.client, this.keypair);
      }

      let mergedCoin = txb.object(getCoinInfo.data[0].coinObjectId);
      await liquidateFunction(txb, payCoinType, mergedCoin, collateralCoinType, to_liquidate_address, totalBalance);
    }

    if (payCoinType.symbol == "Sui") {
      totalBalance = (Number(totalBalance) - 0.5 * 1e9).toString(); //You need to keep some Sui for gas

      let [mergedCoin] = txb.splitCoins(txb.gas, [totalBalance]);
      await liquidateFunction(txb, payCoinType, mergedCoin, collateralCoinType, to_liquidate_address, totalBalance);

    }
    else {

      if (getCoinInfo.data.length >= 2) {
        const txbMerge = new TransactionBlock();
        txbMerge.setSender(this.address);
        let baseObj = getCoinInfo.data[0].coinObjectId;
        let i = 1;
        while (i < getCoinInfo.data.length) {
          txbMerge.mergeCoins(baseObj, [getCoinInfo.data[i].coinObjectId]);
          i++;
        }
        SignAndSubmitTXB(txbMerge, this.client, this.keypair);
      }

      let mergedCoin = txb.object(getCoinInfo.data[0].coinObjectId);
      await liquidateFunction(txb, payCoinType, mergedCoin, collateralCoinType, to_liquidate_address, totalBalance);
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
    const result: any = await moveInspect(this.client, this.getPublicKey(), `${config.ProtocolPackage}::logic::user_health_factor`, [
      '0x06', // clock object id
      config.StorageId, // object id of storage
      config.PriceOracle, // object id of price oracle
      address, // user address
    ]);
    const healthFactor = Number(result[0]) / Math.pow(10, 27);

    return healthFactor;
  }

  /**
   * Retrieves the dynamic health factor for a given user in a specific pool.
   * @param sender - The address of the user.
   * @param poolName - The name of the pool.
   * @param estimateSupply - The estimated supply value (default: 0).
   * @param estimateBorrow - The estimated borrow value (default: 0).
   * @param is_increase - A boolean indicating whether the health factor is increasing (default: true).
   * @returns The health factor for the user in the pool.
   * @throws Error if the pool does not exist.
   */
  async getDynamicHealthFactorAll(sender: string, poolName: string, estimateSupply: number = 0, estimateBorrow: number = 0, is_increase: boolean = true) {
    const _pool: PoolConfig = pool[poolName as keyof Pool];
    if (!_pool) {
      throw new Error("Pool does not exist");
    }
    const config = await getConfig();

    const result: any = await moveInspect(this.client, this.getPublicKey(), `${config.ProtocolPackage}::dynamic_calculator::dynamic_health_factor`, [
      '0x06', // clock object id
      config.StorageId, // object id of storage
      config.PriceOracle, // object id of price oracle
      _pool.poolId,
      sender, // user address,
      _pool.assetId,
      estimateSupply,
      estimateBorrow,
      is_increase
    ], [_pool.type]);

    const healthFactor = Number(result[0]) / Math.pow(10, 27);


    if (estimateSupply > 0) {
      console.log('With EstimateSupply Change: ', `${estimateSupply}`, ' address: ', `${sender}`, ' health factor is: ', healthFactor.toString());
    }
    else if (estimateBorrow > 0) {
      console.log('With EstimateBorrow Change: ', `${estimateBorrow}`, ' address: ', `${sender}`, ' health factor is: ', healthFactor.toString());
    }
    else {
      console.log('address: ', `${sender}`, ' health factor is: ', healthFactor.toString());
    }
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
   * Retrieves the reserves using the client's `getDynamicFields` method.
   * Parses the result using the `parseResult` method.
   */
  async getReserves() {
    const config = await getConfig();

    const result = await this.client.getDynamicFields({ parentId: config.ReserveParentId });
    return result;
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
   * @param ifPrettyPrint - A boolean indicating whether to print the portfolio in a pretty format. Default is true.
   * @returns A Promise that resolves to a Map containing the borrow and supply balances for each reserve.
   */
  async getNAVIPortfolio(address: string = this.address, ifPrettyPrint: boolean = true): Promise<Map<string, { borrowBalance: number, supplyBalance: number }>> {
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

      if (ifPrettyPrint) {
        console.log(`| ${reserve.name} | ${borrowValue} | ${supplyValue} |`);
      }
      balanceMap.set(reserve.name, { borrowBalance: borrowValue, supplyBalance: supplyValue });
    }));

    return balanceMap;
  }

  /**
   * Retrieves the incentive pools for a given asset and option.
   * @param asset_id - The ID of the asset.
   * @param option - The option type.
   * @param user - (Optional) The user's address. If provided, the rewards claimed by the user and the total rewards will be returned.
   * @returns The incentive pools information.
   */
  async getIncentivePools(asset_id: number, option: OptionType, user?: string) {
    const config = await getConfig();

    const result: any = await moveInspect(
      this.client,
      this.address,
      `${config.uiGetter}::incentive_getter::get_incentive_pools`,
      [
        '0x06', // clock object id
        config.IncentiveV2, // the incentive object v2
        config.StorageId, // object id of storage
        asset_id,
        option,
        user ? user : '0x0000000000000000000000000000000000000000000000000000000000000000', // If you provide your address, the rewards that have been claimed by your address and the total rewards will be returned.
      ],
      [], // type arguments is null
      'vector<IncentivePoolInfo>' // parse type
    );
    return result[0];
  }

  /**
   * Retrieves the available rewards for a given address.
   * 
   * @param toCheckAddress - The address to check for rewards. Defaults to the current address.
   * @param option - The option type. Defaults to 1.
   * @param ifPrettyPrint - Whether to print the rewards in a pretty format. Defaults to true.
   * @returns An object containing the summed rewards for each asset.
   * @throws If there is an error retrieving the available rewards.
   */
  async getAvailableRewards(toCheckAddress: string = this.address, option: OptionType = 1, ifPrettyPrint = true) {
    const assetIds = Array.from({ length: 8 }, (_, i) => i); // Generates an array [0, 1, 2, ..., 7]
    try {
      const allResults = await Promise.all(
        assetIds.map(assetId => this.getIncentivePools(assetId, option, toCheckAddress))
      );

      const allPools = allResults.flat();

      const activePools = allPools.filter(pool => pool.available.trim() != '0');

      const summedRewards = activePools.reduce((acc, pool) => {
        const assetId = pool.asset_id.toString();

        // Convert 'available' to a decimal number with 5 decimal places
        const availableDecimal = (BigInt(pool.available) / BigInt(10 ** 27)).toString();
        const availableFixed = (Number(availableDecimal) / 10 ** 9).toFixed(5); // Adjust for 5 decimal places

        if (!acc[assetId]) {
          acc[assetId] = { asset_id: assetId, funds: pool.funds, available: availableFixed };
        } else {
          // Sum available while preserving 5 decimal places
          acc[assetId].available = (parseFloat(acc[assetId].available) + parseFloat(availableFixed)).toFixed(5);
        }

        return acc;
      }, {} as { [key: string]: { asset_id: string, funds: string, available: string } });

      if (ifPrettyPrint) {
        const coinDictionary: { [key: string]: string } = {
          '0': 'Sui',
          '1': 'USDC',
          '2': 'USDT',
          '3': 'WETH',
          '4': 'CETUS',
          '5': 'vSui',
          '6': 'haSui',
          '7': 'NAVX',
        };
        console.log(toCheckAddress, ' available rewards:');
        Object.keys(summedRewards).forEach(key => {
          if (key == '5' || key == '7') {
            console.log(`${coinDictionary[key]}: ${summedRewards[key].available} NAVX`);

          }
          else {
            console.log(`${coinDictionary[key]}: ${summedRewards[key].available} vSui`);
          }
        });
      }

      return summedRewards;
    } catch (error) {
      console.error('Failed to get available rewards:', error);
      throw error;
    }
  }


  /**
   * Claims all available rewards for the specified account.
   * @returns A promise that resolves to the result of the reward claim operation.
   */
  async claimAllRewards() {
    let txb = new TransactionBlock();
    txb.setSender(this.address);

    const rewardsSupply = await this.getAvailableRewards(this.address, 1, false);
    
    for (const reward of rewardsSupply) {
      await claimRewardFunction(txb, reward.funds, reward.asset_id, 1);
    }

    const rewardsBorrow = await this.getAvailableRewards(this.address, 3, false);
    for (const reward of rewardsBorrow) {
      await claimRewardFunction(txb, reward.funds, reward.asset_id, 3);
    }

    const result = SignAndSubmitTXB(txb, this.client, this.keypair);
    return result;
  }

}


