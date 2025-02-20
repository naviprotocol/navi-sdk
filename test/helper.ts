import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import * as fs from "fs";
import * as path from "path";
import { SignAndSubmitTXB } from "../src/libs/PTB";

// Mapping of error codes and function names to user-friendly messages
const errorMessages: Record<string, string> = {
  "1502": "Oracle price is outdated. Recharge the oracle fee to keep it running.",
  "2": "The pool has no rewards. Recharge the pool rewards.",
  // Add more error codes and corresponding messages as needed
};
/**
 * Parse the error message to extract the error code.
 * @param errorMessage The error message string.
 * @returns The extracted error code, or null if no match is found.
 */
const parseErrorMessage = (errorMessage: string) => {
  const match = /MoveAbort\(.*?, (\d+)\)/.exec(errorMessage);
  if (match) {
    return match[1]; // Return the error code as a string
  }
  return null;
};

/**
 * Dry run a transaction block without actually submitting it.
 * @param txb The transaction block to run.
 * @param client The Sui client to interact with the blockchain.
 * @returns The result of the dry run.
 */
export async function dryRunTXB(txb: Transaction, client: SuiClient) {
  const txBytes = await txb.build({ client });
  return await client.dryRunTransactionBlock({ transactionBlock: txBytes });
}

/**
 * Log the provided data to a file in JSON format.
 * @param data The data to log.
 * @param filePath The path of the file where data should be written.
 */
export function writeLogToFile(data: any, filePath: string) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Create a transaction for a given account with an optional gas budget.
 * @param account The account initiating the transaction.
 * @param gasBudget The gas budget for the transaction (default: 300_000_000).
 * @returns A transaction object.
 */
export const createTransaction = (
  account: any,
  userAddress?: string,
  gasBudget = 1000_000_000
): Transaction => {
  const txb = new Transaction();
  if (userAddress) {
    txb.setSender(userAddress);
  } else {
    txb.setSender(account.address);
  }
  txb.setGasBudget(gasBudget);
  return txb;
};

/**
 * Log the transaction result to a file.
 * @param txRes The transaction result.
 * @param testName The name of the test or transaction.
 */
const logTransactionResultToFile = (txRes: any, testName: string) => {
  const status = txRes.effects.status.status;
  const errorMessage = txRes.effects.status.error
    ? txRes.effects.status.error
    : "no_error";

  const logFileName = `${status}_${testName}.log`;
  const logFilePath = path.join(__dirname, "logs", logFileName);

  // Ensure the logs directory exists
  const dir = path.dirname(logFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the transaction result to a log file
  writeLogToFile(txRes, logFilePath);
};

/**
 * Handle the result of a transaction, either by dry-running or submitting it.
 * Optionally log the result to a file if required.
 * @param txb The transaction block to process.
 * @param account The account initiating the transaction.
 * @param testName The name of the test or transaction.
 * @param isDryRun Flag to determine if it's a dry run or a real transaction submission.
 * @param isLogFile Flag to determine if transaction results should be logged to a file.
 * @returns The status of the transaction.
 * @throws An error if the transaction fails.
 */
export const handleTransactionResult = async (
  txb: Transaction,
  account: any,
  testName = "",
  isDryRun = true,
  isLogFile = false
) => {
  let txRes;

  // Run the transaction (dry run or submit it)
  if (isDryRun) {
    txRes = await dryRunTXB(txb, account.client);
  } else {
    txRes = await SignAndSubmitTXB(txb, account.client, account.keypair);
  }

  // If logging is enabled, log the transaction result to a file
  if (isLogFile) {
    logTransactionResultToFile(txRes, testName);
  }

  // If the transaction failed, log the result and throw an error
  if (txRes.effects.status.status === "failure") {
    const errorMessage = txRes.effects.status.error || "Unknown Error";
    // Parse the error message to extract the error code
    const errorCode = parseErrorMessage(errorMessage);
    console.log(errorCode)
    console.log(errorMessage)
    if (errorCode) {
      // Check if we have a custom error message for this code
      const userMessage =
        errorMessages[errorCode] ||
        `Unknown error occurred (code ${errorCode}).`;

      console.error(`Transaction failed: ${userMessage}`);
    } else {
      console.error(`Transaction failed: ${errorMessage}`);
    }

    logTransactionResultToFile(txRes, testName);
  }

  // Return the transaction status
  return txRes.effects.status.status;
};
