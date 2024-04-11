import axios from 'axios';
import { pool } from '../../address';
import { Pool, PoolConfig } from "../../types";
import { config } from '../../address';

/**
 * Retrieves pool information for a given coin symbol.
 * @param coinSymbol - The symbol of the coin.
 * @returns The pool information for the specified coin symbol, or all pool information if no coin symbol is provided.
 * @throws If there is an error fetching the pool information.
 */
export async function getPoolInfo(coinSymbol: string = "") {

    const pool_real: PoolConfig = pool[coinSymbol as keyof Pool];
    let poolId = pool_real.assetId;

    try {
        const response = await axios.get('https://api-defi.naviprotocol.io/getIndexAssetData');
        const poolInfo = response.data;
        if (poolId != -1) {
            return poolInfo[poolId];
        }
        return poolInfo;
    } catch (error) {
        console.error('Error fetching pool information:', error);
        throw error;
    }
}

export async function tryUpdateProtocolPackageId() {
    const apiUrl = 'https://open-api.naviprotocol.io/api/package';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }

        const data = await response.json();
        const newPackageId = data.packageId;

        // Assuming config is importable and mutable, otherwise you'll need a different approach
        if (newPackageId != config.ProtocolPackage) {
            config.ProtocolPackage = newPackageId;
            console.log('Updated ProtocolPackage:', config.ProtocolPackage);
        }
        // Here you would typically either return the new config, 
        // save it to a file (in Node.js), or update the frontend state
    } catch (error) {
        console.error('Failed to update ProtocolPackage:');
    }
}