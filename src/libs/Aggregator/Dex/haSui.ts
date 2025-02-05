import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { AggregatorConfig } from "../config";
import { SUI_CLOCK_OBJECT_ID, normalizeSuiAddress } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { vSuiConfig } from "../../../address";

export async function makeHASUIPTB(
  txb: Transaction,
  pathTempCoin: any,
  a2b: boolean
) {
  const func = a2b ? "request_stake_coin" : "request_unstake_instant_coin";

  let coinB;
  if (a2b) {
    [coinB] = txb.moveCall({
      target: `${AggregatorConfig.haSuiPackageId}::staking::${func}`,
      typeArguments: [],
      arguments: [
        txb.object(vSuiConfig.wrapper),
        txb.object(AggregatorConfig.haSuiConfigId),
        pathTempCoin,
        txb.pure.address(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ),
      ],
    });
  } else {
    [coinB] = txb.moveCall({
      target: `${AggregatorConfig.haSuiPackageId}::staking::${func}`,
      typeArguments: [],
      arguments: [
        txb.object(vSuiConfig.wrapper),
        txb.object(AggregatorConfig.haSuiConfigId),
        pathTempCoin,
      ],
    });
  }

  return coinB;
}
