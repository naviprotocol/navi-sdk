## Account Functions

### Get Specific Account Address
```javascript
account.getPublicKey() //or
account.address
```
### Create Account Cap for specific account
```javascript
account.createAccountCap() //Account1 will create an Account Cap
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

### Supply/Withdraw/Borrow/Repay/Liquidate/ClaimRewards
You may Simply input 'NAVX' as a string or NAVX as a type imported from address.ts. 

Current These Pools are supported: **Sui | NAVX | vSui | USDC | wUSDC | USDT | WETH | CETUS | haSui | AUSD | WBTC**
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


### Update Decentralized Oracle
Two options to update NAVI's decentralized Oracle
```javascript
// For single transaction
await account.updateOracle();

// For Devevelopers who wants to integrate the Oracle in PTB
let txb = new Transaction();
await updateOraclePTB(account.client, txb); //add updateOracle code to PTB
```

### Swap Token using NAVI Aggregator
```Typescript
const fromCoinAddress = Sui.address; //From coin address
const toCoinAddress = nUSDC.address; //To coin address
const amountIn = 1e9; //Amount in   
const apiKey = 'your_api_key'; //NAVI Aggregator API Key
const swapOptions = { dexList: [Dex.Cetus, Dex.Aftermath]}; //Swap options, leave the dexList empty to use all the DEXs

//Execute the swap, this will return a transaction result
account.swap(fromCoinAddress, toCoinAddress, amountIn, apiKey, swapOptions)
//Dry run the swap, this will return a dryRun result
account.dryRunSwap(fromCoinAddress, toCoinAddress, amountIn, apiKey, swapOptions)
```