import { Transaction } from "@mysten/sui/transactions";
import { springSuiConfig } from "../../../address";

const SUI_SYSTEM_STATE_ID = "0x0000000000000000000000000000000000000000000000000000000000000005";

export async function makeSpringSuiPTB(
  txb: Transaction,
  pathTempCoin: any,
  a2b: boolean
) {
  let coinB;

  if (a2b) {    
    const [lst] = txb.moveCall({
      target: `${springSuiConfig.publishAt}::liquid_staking::mint`,
      typeArguments: [springSuiConfig.type],
      arguments: [
        txb.object(springSuiConfig.id),         
        txb.object(SUI_SYSTEM_STATE_ID),         
        pathTempCoin,                        
      ],
    });

    coinB = lst;    
  } else {    
    const [sui] = txb.moveCall({
      target: `${springSuiConfig.publishAt}::liquid_staking::redeem`,
      typeArguments: [springSuiConfig.type],
      arguments: [
        txb.object(springSuiConfig.id),           
        pathTempCoin,                             
        txb.object(SUI_SYSTEM_STATE_ID),         
      ],
    });
    coinB = sui;
  }
  return coinB;
}