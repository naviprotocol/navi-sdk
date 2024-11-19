import axios from 'axios';
import { AggregatorConfig } from './config';
import { Quote, SwapOptions } from '../../types';


/**
 * Get a swap quote between two coins using the aggregator API.
 *
 * @param fromCoinAddress - The address of the coin to swap from.
 * @param toCoinAddress - The address of the coin to swap to.
 * @param amountIn - The amount of the fromCoin to swap. Can be a number, string, or bigint.
 * @param apiKey - Optional API key for authentication.
 * @param swapOptions - Optional swap options including baseUrl, dexList, byAmountIn, and depth.
 * @returns A promise that resolves to a Router object containing the swap route details.
 * @throws Will throw an error if the API request fails or returns no data.
 */
export async function getQuote(
    fromCoinAddress: string,
    toCoinAddress: string,
    amountIn: number | string | bigint,
    apiKey?: string,
    swapOptions: SwapOptions = { baseUrl: undefined, dexList: [], byAmountIn: true, depth: 3 },
): Promise<Quote> {
    let baseUrl = AggregatorConfig.aggregatorBaseUrl;
    if (swapOptions.baseUrl) {
        baseUrl = swapOptions.baseUrl;
    }

    // Construct query parameters for the API request
    const params = new URLSearchParams({
        from: fromCoinAddress,
        target: toCoinAddress,
        amount: (typeof amountIn === 'bigint' ? Number(amountIn) : amountIn).toString(),
        by_amount_in: swapOptions?.byAmountIn !== undefined ? swapOptions.byAmountIn.toString() : 'true',
        depth: swapOptions?.depth !== undefined ? swapOptions.depth.toString() : '3',
    }).toString();

    // Construct dex provider string if dexList is provided
    let dexString = '';
    if (swapOptions?.dexList && swapOptions.dexList.length > 0) {
        dexString = swapOptions.dexList.map(dex => `providers=${dex}`).join('&');
    }

    // Combine parameters and dexString for the full API request
    const fullParams = dexString ? `${params}&${dexString}` : params;
    try {
        // Make the API request to fetch the swap route
        const axiosConfig = apiKey ? { headers: { 'x-navi-token': apiKey } } : {};
        const { data } = await axios.get(`${baseUrl}?${fullParams}`, axiosConfig);

        if (!data) {
            throw new Error('No data returned from the API.');
        }

        // Set the from and target properties in the returned data
        data.data.from = fromCoinAddress;
        data.data.target = toCoinAddress;

        return data.data as Quote;
    } catch (error: any) {
        console.error(`Error fetching routes from ${AggregatorConfig.aggregatorBaseUrl} with params ${JSON.stringify(params)}:`, error.message);
        throw error;
    }
}
