// src/tests/client.ts
import dotenv from "dotenv";
import { NAVISDKClient } from '../src/index';

dotenv.config();

const rpcUrl = "";
const mnemonic = process.env.MNEMONIC || "";

const client = new NAVISDKClient({ networkType: rpcUrl, mnemonic });
const account = client.accounts[0];

export { client, account };
