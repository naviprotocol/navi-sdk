# NAVISDKClient Script Documentation

This script uses the `navi-sdk` to read a CSV file and send tokens to multiple addresses. The addresses and the amount of tokens to be sent are specified in the CSV file.

## Prerequisites

- Ensure you have Node.js installed.
- Install the required packages using npm:
  ```bash
  npm install navi-sdk csv-parse dotenv
  ```
- Create a .env file in the root directory and add your mnemonic
  mnemonic=your_mnemonic_here

## Configuration Zone
Define the token to be sent and the path to the CSV file:
```javascript
const toSendToken = NAVX;
const csvFilePath = 'sample.csv'; // Specify the path to your CSV file
```

## Running the Script
To run the code:
```script
npm ts-node your_script_file.ts
```