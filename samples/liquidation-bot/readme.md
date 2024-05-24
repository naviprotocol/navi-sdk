# README

## Overview

This script is designed to monitor the health factor of a specified account and execute a liquidation operation when certain conditions are met. It leverages the `navi-sdk` to interact with blockchain transactions and manage accounts.

## Prerequisites

Ensure you have the following installed and configured:

- Node.js
- npm or yarn
- `dotenv` package for environment variable management

## Installation

1. Clone the repository or download the script.

2. Install the required dependencies:

   ```bash
   npm install navi-sdk dotenv
   ```

3. Create a .env file in the root directory of your project and add your mnemonic:
    ```
    mnemonic=your_account_mnemonic
    ```
## Script Configuration
### Set Up Zone

to_pay_coin: The coin type used to pay for the liquidation. Example: USDC.
to_liquidate_address: The address to be liquidated.
collectral_coin: The collateral coin type. Example: Sui.

Example configuration:
```
const to_pay_coin: CoinInfo = USDC;
const to_liquidate_address = '0xcaa4af4b06b6eed841bbd254cb19a3fcd64e3e902fe2bcbd4e02f6f9711e0c43';
const collectral_coin: CoinInfo = Sui;
```

## Running the Script
Run the script using Node.js:

```bash
npm ts-node your_script_name.ts
```