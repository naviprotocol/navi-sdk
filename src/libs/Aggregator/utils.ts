import CryptoJS from 'crypto-js';

// Reserved ref_id
const RESERVED_IDS_ARRAY = [1873161113, 8190801341];
const RESERVED_REF_IDS = new Set<number>(RESERVED_IDS_ARRAY);

// Keep 10 decimal digits
const REF_ID_MOD = 10 ** 10;

/**
 * Generates a unique reference ID based on the provided API key.
 * The reference ID is derived from the SHA-256 hash of the API key,
 * ensuring it is a 10-digit decimal number and does not conflict with reserved IDs.
 *
 * @param {string} apiKey - The API key used to generate the reference ID.
 * @returns {number} A unique reference ID.
 */
export function generateRefId(apiKey: string): number {
    // Use SHA-256 to hash the apiKey with crypto-js
    const digest = CryptoJS.SHA256(apiKey).toString(CryptoJS.enc.Hex);

    // Extract the first 16 hexadecimal characters (corresponding to 8 bytes) and convert them to an integer
    let refIdCandidate = parseInt(digest.slice(0, 16), 16);

    // Limit to 10 decimal digits
    refIdCandidate = refIdCandidate % REF_ID_MOD;

    // Avoid conflicts with reserved ref_id
    let offset = 0;
    let finalRefId = refIdCandidate;

    // Try increasing offset each time and take modulo to stay within 10 digits
    while (RESERVED_REF_IDS.has(finalRefId)) {
        offset += 1;
        finalRefId = (refIdCandidate + offset) % REF_ID_MOD;
    }

    return finalRefId;
}
