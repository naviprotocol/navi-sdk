## Client Functions
### Creating a Default Account
When you initialize client, you will need a mnemonic phrase or we will generate a new one for you. 


**We will never save user's mnemonic phrase.
Again, we advise you to use Dotenv package to import mnemonic**

```javascript
const mnemonic = process.env.mnemonic; // Use an existing mnemonic or leave it empty to generate a new one
const client = new NAVISDKClient({ mnemonic, networkType: "mainnet" || "your_rpc", numberOfAccounts: 5 }); 
// networkType: supports mainnet|testnet|devnet|customizedRPC
// wordLength: if you want to generate a new mnemonic, you may specify the word length
// numberOfAccounts: How many accounts you want to derive from the mnemonic

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
### Get All Wallet Balances
Get all accounts' balance, summed together

```javascript
const balances = client.getAllBalances();
balances.then((res) => {
    console.log(res);
})
```
Sample output:
```
{ '0x2::sui::SUI': 0.795350528, '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': 1.3 }
```

### Get PoolInfo - Supply/Borrow APR, total Supply/Borrow
```javascript
client.getPoolInfo(Sui) //Pass in specific Coin
```
This will return a json-like map like the following:
```
{
  coin_type: '0x2::sui::SUI',
  total_supply: 80009755.97601613,
  total_borrow: 31952651.818883114,
  tokenPrice: '1.03068912',
  base_supply_rate: '3.94254217',
  base_borrow_rate: '12.34020629',
  boosted_supply_rate: '15.32140343',
  boosted_borrow_rate: '0.00000000',
  supply_cap_ceiling: 100000000,
  borrow_cap_ceiling: 70020273.53655775,
  current_supply_utilization: 0.8000975597601614,
  current_borrow_utilization: 0.4563342901281378,
  optimal_borrow_utilization: '0.55',
  pool: 'SUI-Sui',
  max_ltv: '0.75',
  symbol: 'SUI',
  rewardTokenAddress: [
    '549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT'
  ]
}
```

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

### Get token swap quote from NAVI Aggregator
```javascript
const fromCoinAddress = Sui.address; //From coin address
const toCoinAddress = nUSDC.address; //To coin address
const amountIn = 1e9; //Amount in   
const apiKey = 'your_api_key'; //NAVI Aggregator API Key
const swapOptions = { dexList: [Dex.Cetus, Dex.Aftermath]}; //Swap options, leave the dexList empty to use all the DEXs

client.getQuote(fromCoinAddress, toCoinAddress, amountIn, apiKey, swapOptions)
```
