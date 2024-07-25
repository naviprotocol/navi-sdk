# NAVI SDK Client Documentation

For the latest updates and detailed information on interacting with the NAVI contract, please refer to the [NAVI Protocol Developer Docs](https://naviprotocol.gitbook.io/navi-protocol-developer-docs/how-to-interact-with-the-contract/navi-sdk).
## Introduction

The NAVI SDK Client provides tools for interacting with the Sui blockchain networks, designed for handling transactions, accounts, and smart contracts efficiently. This documentation covers the setup, account management, and transaction handling within the NAVI ecosystem.

## Getting Started

### Installation
Before you can use the NAVI SDK Client, you need to set up your project environment.

`npm i navi-sdk`

*We highly suggest you use env to import mnemonic all the time *

`npm i dotenv` 

[Check how to use dotenv](https://github.com/motdotla/dotenv)

## Quick Start
```javascript
const mnemonic = process.env.mnemonic; // Use an existing mnemonic or leave it empty to generate a new one
const client = new NAVISDKClient({ mnemonic, networkType: "mainnet" || "your_rpc", numberOfAccounts: 5 }); 

const account = client.accounts[0];
account.depositToNavi(Sui, 1e9);
```


## Detailed SDK Usage
- [NAVI-SDK Client](./document/client.md)
- [NAVI-SDK AccountManager](./document/accountManager.md)


## SDK Sample & Tools
### [Flashloan Demo](https://github.com/naviprotocol/navi-sdk/tree/main/examples/flashloan-demo)


### [Liquidation Demo](https://github.com/naviprotocol/navi-sdk/tree/main/examples/liquidation-bot)


### [Send Batch Coins Demo](https://github.com/naviprotocol/navi-sdk/tree/main/examples/batchSendCoin-demo)








