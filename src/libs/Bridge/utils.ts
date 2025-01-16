import { Connection, TransactionSignature, Commitment } from "@solana/web3.js";

export async function waitForSolanaTransaction(
  connection: Connection,
  txSignature: TransactionSignature,
  commitment: Commitment = "confirmed",
  timeoutMs: number = 60000
): Promise<void> {
  console.log(`等待交易完成，交易签名: ${txSignature}`);

  const startTime = Date.now();

  while (true) {
    // 检查超时
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`等待交易超时: ${txSignature}`);
    }

    // 查询交易确认状态
    const result = await connection.getSignatureStatus(txSignature, {
      searchTransactionHistory: true,
    });
    const status = result.value;

    if (status) {
      if (
        status.confirmationStatus === commitment ||
        status.confirmations === null
      ) {
        if (status.err) {
          console.error("交易失败:", status.err);
          throw new Error("交易失败");
        }

        console.log("交易已确认!");
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
