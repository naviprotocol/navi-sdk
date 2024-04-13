# NaviSDK Client Documentation

For the latest updates and detailed information on how to interact with the NaviSDK contract, please refer to the [Navi Protocol Developer Docs](https://naviprotocol.gitbook.io/navi-protocol-developer-docs/how-to-interact-with-the-contract/navi-sdk).
## Introduction

The NaviSDK Client provides a set of tools for interacting with ***Sui*** blockchain networks, specifically designed for handling transactions, accounts, and smart contracts in a streamlined and efficient manner. This documentation covers the setup, account management, and transaction handling within the NaviSDK ecosystem.

## Getting Started

### Installation
Before you can use the NaviSDK Client, you need to set up your project environment.

`npm i navi-sdk`

## Creating and Managing Accounts
### Creating a Default Account
When you initialize client, you will need a mnemonic phrase or we will generate a new one for you. 

1 mnemonic for 1 client

**We will never save user's mnemonic phrase**

```javascript
const mnemonic = ''; // Use an existing mnemonic or leave empty to generate a new one
const client = new NAVISDKClient({mnemonic, networkType: "mainnet", numberOfAccounts: 5}); 
//networkType: supports mainnet|testnet|devnet
//wordLength: if you want generate a new mnemonic, you may specify the words length
//numberOfAccounts - How many accounts you want to derive from the mnemonic
```
### Get the specific account
```javascript
const account = client.accounts[0];
const account1 = client.accounts[1];
```
### Check mnemonic for this client
```javascript
console.log(client.getMnemonic());
client.mnemonic;
```
### Return All Accounts under the Client
```javascript
client.getAllAccounts()
//Sample Return
index:0, address: 0xa814b8c01b111f5e440e5d4785925a033961915c2f44d22ca71619ac73534ee7
index:1, address: 0xd8be370139dd297924e31f6a507ba3a1d5f52f98f04f144bb75100d179698f84
index:2, address: 0xca29dbf32047fba966fa5aca7e378ba11171b3817f53ad324489a138288cc02d
```
### Create Account Cap for specific account
```javascript
account1.createAccountCap() //Account1 will create an Account Cap
```
### Get Specific Account Address
```javascript
account1.getPublicKey() //or
account1.address
```

## Get Objs and Coin Info
We have prepared a token type for Sui/NAVX/vSui/USDT/USDC/WETH/CETUS/haSui
```javascript
import {Sui, NAVX, vSui, USDT, USDC, WETH, CETUS, haSui} from 'navi-sdk/dist/address';
account.getAllCoins() //Return all Objects that account has

//Get all objs for this type of token
account.getCoins(coinType = "0x2::sui::SUI")
//Or you may import token address from address
account.getCoins(coinType = Sui)
```
### Send Coin or Objects
```javascript
account1.sendCoin(coinType = NAVX, your_recipient_address, amount)
account2.sendCoinToMany(coinType = NAVX, [addr1, addr2, .. addrN], [amount1, amount2, .. amountN])

account3.transferObj(obj = "0xobjId", your_recipient_address)
account4.transferObjToMany([obj1, obj2, ...], [addr1, addr2, ...])
```

### Get comprehensive Wallet Balance list
This will combine all the objects of the same token, and return a comprehensive balance table
```javascript
const balanceMap = account.getWalletBalance()
balanceMap.then((res) => {
    console.log(res);
})
```
Sample Output:
| Coin Type | Balance |
|--------------|----------------|
USDC | 2.4994
Sui | 3.63103582
NAVX | 0

### Get All Wallet Balances
Get all accounts' balance, summed together

```javascript
const balances = client.getAllBalances();
balances.then((res) => {
    console.log(res);
})
```
## Navi Interaction
### Get Current Supply/Borrow from Navi
```javascript
account.getNAVIPortfolio()
```
This will return a table like the following:

| Reserve Name | Borrow Balance | Supply Balance |
|--------------|----------------|----------------|
| USDT | 0 | 0 |
| CETUS | 0 | 0 |
| NAVX | 0 | 0 |
| USDC | 0 | 2.000057 |
| WETH | 0 | 0 |
| SUI | 5.009469205 | 100.097918005 |
| VoloSui | 0 | 0 |
| HaedalSui | 0 | 0 |
### Get All accounts portfolio info from Navi
```javascript
const allPortfolio = client.getAllNaviPortfolios();
allPortfolio.then((res) => {
    console.log(res);
})
```
### Get Reserve
```javascript
client.getReserves() //Get All reserve info
```

### Get PoolInfo
```javascript
import { USDC } from 'navi-sdk/dist/address'
client.getPoolInfo(USDC)
//Leave it empty to get all poolinfo
```
### Get Address Available Rewards to Claim
1. OptionSupply = 1
2. OptionWithdraw = 2
3. OptionBorrow = 3
4. OptionRepay = 4
* Option default is 1, you may leave it empty
```javascript
account.getAvailableRewards() //Return this account's available rewards
client.getAvailableRewards(address); //You may check any address
```

### Get Current Health Factor
```javascript
account.getHealthFactor() //Return this account's health factor
client.getHealthFactor(address); //You may check any address
```

### Predict new Health Factor by taking a supply/borrow action
```javascript
client.getDynamicHealthFactor(address, coinType = 'USDC', supplyBalanceChange:100000, borrowBalanceChange: 0, is_increase: true)
//supplyBalanceChange and borrowBalanceChange needs to be an integer with token decimals
//Change is_increase to false if it's decrease
```
### Supply/Withdraw/Borrow/Repay/Liquidate/ClaimRewards
You may Simply input 'NAVX' as a string or NAVX as a type imported from address.ts. 

Current These Pools are supported: **Sui | NAVX | vSui | USDC | USDT | WETH | CETUS | haSui**
```javascript
account.depositToNavi(Sui, amount)
account.depositToNaviWithAccountCap(NAVX, amount， accountCap_Address_that_you_own)


account.withdraw(coinType = NAVX, amount)
account.withdrawWithAccountCap(coinType = NAVX, amount, accountCap_Address_that_you_own)

account.borrow(coinType = NAVX, amount)
account.repay(coinType = NAVX, amount)

account.claimAllRewards(); //Claim both Supply and Borrow rewards

// Initialization Zone
const debt_coin: CoinInfo = USDC; // Assigns USDC as the payment coin. Ensure you maintain a minimum of 0.5 Sui for gas fees if Sui is used.
const to_liquidate_address = 'address_to_liquidate'; // Specifies the blockchain address of the account to be liquidated.
const collateral_coin: CoinInfo = Sui; // Designates Sui as the collateral coin. Note: 'collateral_coin' should not be the same as 'to_pay_coin'.
// End of Initialization Zone

//Option1 - Liquidate with all debt_coin, will return the rest
account.liquidate(debt_coin, to_liquidate_address, collateral_coin);

//Option2 - Liquidate with specific amount
let to_liquidate_amount = 10; //Number of coin that can be used for liquidation, no decimals required.
account.liquidate(debt_coin, to_liquidate_address, collateral_coin, to_liquidate_amount); //Liquidate with 10 USDC.
```

## Customized PTB
### Navi Flash Loan Sample
#### Sample TX: https://suiscan.xyz/mainnet/tx/fCFERvsTk7t6G4SJyuuwXU3HbVqYbQ1RKzTDaeRwM4A
```javascript

import { NAVISDKClient } from 'navi-sdk'
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {depositCoin,withdrawCoin, borrowCoin, flashloan,repayFlashLoan, SignAndSubmitTXB, mergeCoins} from 'navi-sdk/dist/libs/PTB'
import { Pool, PoolConfig } from "navi-sdk/dist/types";
import { pool, USDC } from 'navi-sdk/dist/address'

const mnemonic = "test mnemonic";
const client = new NAVISDKClient({mnemonic: mnemonic, networkType: "mainnet", numberOfAccounts: 1});

// Initialize the TransactionBlock
let txb = new TransactionBlock();
const account = client.accounts[0];
let sender = account.address;
console.log(sender)
txb.setSender(sender);

const amount_to_borrow = 1*1e6; //Borrow 1 USDC

// Supported: Sui/NAVX/vSui/USDC/USDT/WETH/CETUS/HAsui, import from address file
const USDC_Pool: PoolConfig = pool[USDC.symbol as keyof Pool];
const [balance, receipt] = await flashloan(txb, USDC_Pool, amount_to_borrow); // Flashloan 1 usdc

//Transfer the flashloan money to the account
const this_coin = txb.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [balance],
    typeArguments: [USDC_Pool.type],
});

//Merge Coin to the wallet balance
txb.mergeCoins(txb.object("{source_USDC_obj}"), [this_coin]);

const amount = 1*1e6; //Deposit 1 USDC
//Deposit 1USDC to NAVI Protocol
await depositCoin(txb, USDC_Pool, txb.object("{source_USDC_obj}"), amount);

//Withdraw 1 USDC from NAVI Protocol
await withdrawCoin(txb, USDC_Pool, amount);

//Get the repayment object
const repayBalance = txb.moveCall({
    target: '0x2::coin::into_balance',
    arguments: [txb.object('{your_repay_coin_object_id}')],
    typeArguments: [USDC_Pool.type],
});

const [e_balance] = await repayFlashLoan(txb, USDC_Pool, receipt, repayBalance); // Repay with USDC

//Extra token after repay
const e_coin = txb.moveCall({
    target: '0x2::coin::from_balance',
    arguments: [e_balance],
    typeArguments: [USDC_Pool.type],
});

//Transfer left_money after repay to the account
txb.transferObjects([e_coin], sender);
const result = SignAndSubmitTXB(txb, account.client, account.keypair);
console.log("result: ", result);

```