"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const navi_sdk_1 = require("navi-sdk");
const address_1 = require("navi-sdk/dist/address");
const sync_1 = require("csv-parse/sync");
const fs_1 = require("fs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const key = process.env.mnemonic;
const client = new navi_sdk_1.NAVISDKClient({ mnemonic: key });
const account = client.accounts[0];
console.log(account.address);
// Set UP Zone
const toSendToken = address_1.NAVX;
const csvFilePath = 'sample.csv'; // Specify the path to your CSV file
// End of Set UP Zone
// Define a function that extracts addresses and rewards from a CSV file
function extractAddressesAndRewards(csvFilePath) {
    // Read the CSV file
    const csvData = (0, fs_1.readFileSync)(csvFilePath, { encoding: 'utf8' });
    // Parse the CSV data
    const records = (0, sync_1.parse)(csvData, {
        columns: true, // Use the first line as column names
        skip_empty_lines: true,
    });
    // Initialize empty lists for addresses and rewards
    const addresses = [];
    const rewards = [];
    // Extract addresses and rewards from the parsed records
    records.forEach((record) => {
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
account.sendCoinToMany(toSendToken, result.addresses, result.rewards);
