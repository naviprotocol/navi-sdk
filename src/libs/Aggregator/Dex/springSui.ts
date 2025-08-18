import { Transaction } from "@mysten/sui/transactions";
import { springSuiConfig } from "../../../address";

// 从 @suilend/springsui-sdk 源码中提取的常量
const SUI_SYSTEM_STATE_ID = "0x0000000000000000000000000000000000000000000000000000000000000005";

export async function makeSpringSuiPTB(
  txb: Transaction,
  pathTempCoin: any,
  a2b: boolean
) {
  let coinB;
  
  if (a2b) {
    // Mint: SUI -> SpringSui (rSUI)
    console.log("🔄 Building Spring Sui mint transaction (direct moveCall)...");
    
    // 直接调用 moveCall，与 suilend SDK 底层完全一致
    const [lst] = txb.moveCall({
      target: `${springSuiConfig.id}::liquid_staking::mint`,
      typeArguments: [springSuiConfig.type],
      arguments: [
        txb.object(springSuiConfig.id),           // self: Spring Sui合约对象
        txb.object(SUI_SYSTEM_STATE_ID),          // systemState: Sui系统状态
        pathTempCoin,                             // sui: 用户输入的SUI代币
      ],
    });
    
    coinB = lst;
    console.log("✅ Spring Sui mint transaction built successfully (direct moveCall)");
    
  } else {
    // Redeem: SpringSui (rSUI) -> SUI
    console.log("🔄 Building Spring Sui redeem transaction (direct moveCall)...");
    
    // 直接调用 moveCall，与 suilend SDK 底层完全一致
    const [sui] = txb.moveCall({
      target: `${springSuiConfig.id}::liquid_staking::redeem`,
      typeArguments: [springSuiConfig.type],
      arguments: [
        txb.object(springSuiConfig.id),           // self: Spring Sui合约对象
        pathTempCoin,                             // lst: 用户输入的Spring Sui代币
        txb.object(SUI_SYSTEM_STATE_ID),          // systemState: Sui系统状态
      ],
    });
    
    coinB = sui;
    console.log("✅ Spring Sui redeem transaction built successfully (direct moveCall)");
  }
  
  return coinB;
}
