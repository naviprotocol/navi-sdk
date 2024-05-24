# NaviSDK Client Documentation

For the latest updates and detailed information on how to interact with the NaviSDK contract, please refer to the [Navi Protocol Developer Docs](https://naviprotocol.gitbook.io/navi-protocol-developer-docs/how-to-interact-with-the-contract/navi-sdk).
## Introduction

The NaviSDK Client provides a set of tools for interacting with ***Sui*** blockchain networks, specifically designed for handling transactions, accounts, and smart contracts in a streamlined and efficient manner. This documentation covers the setup, account management, and transaction handling within the NaviSDK ecosystem.

## SDK sample & tools
### [flash-loan demo](https://github.com/naviprotocol/navi-sdk/samples/flashloan-demo)


### [Liquidation demo](https://github.com/naviprotocol/navi-sdk/samples/liquidation-bot)


### [Send Batch Coins Demo](https://github.com/naviprotocol/navi-sdk/samples/batchSendCoin-demo)

## Getting Started

### Installation
Before you can use the NaviSDK Client, you need to set up your project environment.

`npm i navi-sdk`

*We Highly Suggestes you use env to import mnemonic all the time *

`npm i dotenv` 

[Check how to use dotenv](https://github.com/motdotla/dotenv)

## Creating and Managing Accounts
### Creating a Default Account
When you initialize client, you will need a mnemonic phrase or we will generate a new one for you. 

1 mnemonic for 1 client

**We will never save user's mnemonic phrase.
Again, we advise you to use Dotenv package to import mnemonic**

```javascript
const mnemonic = process.env.mnemonic; // Use an existing mnemonic or leave empty to generate a new one
const client = new NAVISDKClient({mnemonic, networkType: "mainnet" || "your_rpc", numberOfAccounts: 5}); 
//networkType: supports mainnet|testnet|devnet|customizedRPC
//wordLength: if you want generate a new mnemonic, you may specify the words length
//numberOfAccounts - How many accounts you want to derive from the mnemonic
```
### Get the specific account
All generated accounts are stored in a `list` and you can retrive any account by input the account index from the list.
```javascript
const account = client.accounts[0];
const account1 = client.accounts[1];
```
### Check mnemonic for this client
You may print out your private mnemonic at any time
```javascript
console.log(client.getMnemonic());
client.mnemonic;
```
### Return All Accounts under the Client
Print out all the accounts from NAVI SDK Client
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
Please keep in mind that PTB has 1024 operation limit, we suggest that recipients list not exceed 500
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
Sample output:
```json
{
  '0x2::sui::SUI': 0.795350528,
  '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': 1.3
}
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
This function returns a overall balance map from all accounts 
```javascript
const allPortfolio = client.getAllNaviPortfolios();
allPortfolio.then((res) => {
    console.log(res);
})
```
Sample output:
```
Map(8) {
  'SUI' => { borrowBalance: 11100, supplyBalance: 0 },
  'CETUS' => { borrowBalance: 0, supplyBalance: 0 },
  'WETH' => { borrowBalance: 0, supplyBalance: 1 },
  'USDT' => { borrowBalance: 0, supplyBalance: 0 },
  'NAVX' => { borrowBalance: 5600.65, supplyBalance: 0 },
  'USDC' => { borrowBalance: 0, supplyBalance: 0 },
  'HaedalSui' => { borrowBalance: 0, supplyBalance: 0 },
  'VoloSui' => { borrowBalance: 0, supplyBalance: 0 }
}
```

### Get Reserve
This is will return specific Reserve pool info
```javascript
client.getReserves() //Get All reserve info
```
Sample output:
```
data: {
    objectId: '0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf',
    version: '160270114',
    digest: 'AqrCj2mh3xPggoS3jFoveLpF7oJodbzm1uYuPB7jxus6',
    type: '0x2::dynamic_field::Field<u8, 0xd899cf7d2b5db716bd2cf55599fb0d5ee38a3061e7b6bb6eebf73fa5bc4c81ca::storage::ReserveData>',
    owner: {
      ObjectOwner: '0xe6d4c6610b86ce7735ea754596d71d72d10c7980b5052fc3c8cdf8d09fea9b4b'
    },
    previousTransaction: 'AN5Een128HSW2uFb9KAgTgoXMEieXJXDZDwUPww8R9Vb',
    storageRebate: '8367600',
    content: {
      dataType: 'moveObject',
      type: '0x2::dynamic_field::Field<u8, 0xd899cf7d2b5db716bd2cf55599fb0d5ee38a3061e7b6bb6eebf73fa5bc4c81ca::storage::ReserveData>',
      hasPublicTransfer: false,
      fields: [Object]
    }
  }
```
### Get PoolInfo - Supply/Borrow APR, total Supply/Borrow
```javascript
client.getPoolInfo(Sui)
//Leave it empty to get all poolinfo
```
This will return a json-like map like the following:
``` json
{
  coin_type: '0x2::sui::SUI',
  total_supply: '76518112.90791546', //Supplied Sui Amount
  total_borrow: '28588286.47388038', //Borrowed Sui Amount
  price: '1.08203381', //Pool Coin Price
  supply_rate: '3.81169716', //This indicate the Vault APR or Basic APR
  borrow_rate: '12.13370524', //This indicate the Vault APR or Basic APR for borrow
  boosted: '15.60003632', //This indicate the Boosted APR or incentive APR
  pool: 'SUI-Sui',
  symbol: 'SUI',
  rewardTokens: [
    '549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT' //Reward token will be released in vSui
  ],
  borrow_reward_apy: '0.00000000' //This indicate the Boosted APR or incentive APR for borrow
}
```

### Get Address Available Rewards to Claim
This will print out all available rewards that the account has from NAVI protocol
```javascript
account.getAvailableRewards() //Return this account's available rewards
client.getAvailableRewards(address); //You may check any address
```

### Get Current Health Factor
This will return the account of any address's health factor from NAVI protocol
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

