import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { springSuiConfig } from "../../../address";
import { LstClient } from "@suilend/springsui-sdk";
export async function makeSpringSuiPTB(
  txb: Transaction,
  pathTempCoin: any,
  a2b: boolean
) {
  let coinB;

  if (a2b) {
    // Mint: SUI -> SpringSui (rSUI)
    // Using move call approach similar to vSui
    [coinB] = txb.moveCall({
      target: `${springSuiConfig.id}::liquid_staking::mint`,
      typeArguments: [],
      arguments: [pathTempCoin],
    });
  } else {
    // Redeem: SpringSui (rSUI) -> SUI
    [coinB] = txb.moveCall({
      target: `${springSuiConfig.id}::liquid_staking::redeem`,
      typeArguments: [],
      arguments: [pathTempCoin],
    });
  }

  return coinB;
}
