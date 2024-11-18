import { NAVISDKClient } from "navi-sdk";
import {NAVX, Sui, wUSDC, USDT, vSui, haSui, WETH, CETUS} from 'navi-sdk/dist/address';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.mnemonic;
const client = new NAVISDKClient({mnemonic: key});
const account = client.accounts[0];

console.log(account.address);

// Set UP Zone
const toSendToken = NAVX;
const csvFilePath = 'sample.csv'; // Specify the path to your CSV file
// End of Set UP Zone





// Define a function that extracts addresses and rewards from a CSV file
function extractAddressesAndRewards(csvFilePath: string): { addresses: string[], rewards: number[] } {
    // Read the CSV file
    const csvData = readFileSync(csvFilePath, { encoding: 'utf8' });
  
    // Parse the CSV data
    const records = parse(csvData, {
        columns: true, // Use the first line as column names
        skip_empty_lines: true,
    });

    // Initialize empty lists for addresses and rewards
    const addresses: string[] = [];
    const rewards: number[] = [];

    // Extract addresses and rewards from the parsed records
    records.forEach((record: { address: string; rewards: string; }) => {
        addresses.push(record.address);
        rewards.push((Number(record.rewards) * Math.pow(10, toSendToken.decimal)));
    });
  
    // Return the lists
    return { addresses, rewards };
  }

  // Usage example:
const result = extractAddressesAndRewards(csvFilePath);
console.log('Addresses:', result.addresses);
console.log('Rewards:', result.rewards);

account.sendCoinsToMany(toSendToken, result.addresses, result.rewards)