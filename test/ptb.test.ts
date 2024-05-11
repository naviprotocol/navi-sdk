
import { describe, it, expect } from 'vitest';
import { NAVISDKClient } from '../src/index';
import { Pool, PoolConfig } from '../src/types';
import { Sui, USDC, pool } from '../src/address';
import { SignAndSubmitTXB, borrowCoin, depositCoin, withdrawCoin, flashloan, mergeCoins, repayDebt, repayFlashLoan } from '../src/libs/PTB';
import { TransactionBlock } from '@mysten/sui.js/transactions';

describe('Test Navi SDk - PTB', async () => {
    it('should PTB functions executed', async () => {
        //Dummy mnemonic
        const sdk = new NAVISDKClient({mnemonic:'asset birth pluck impose vendor until sock honey genius claim spring damp'});
        const account = sdk.accounts[0]
        const address = account.address

        const Sui_pool: PoolConfig = pool[Sui.symbol as keyof Pool]
        const USDC_pool: PoolConfig = pool[USDC.symbol as keyof Pool]

        const loan_amount = 1_000
        const borrow_amount = 750
        const repay_debt_amount = 750

        const txb = new TransactionBlock()
        txb.setSender(address)

        // falsh loan
        const [loan_balance, receipt] = await flashloan(txb, USDC_pool, loan_amount)
        const loan_coin = txb.moveCall({
          target: '0x2::coin::from_balance',
          arguments: [loan_balance],
          typeArguments: [USDC_pool.type]
        })

        // deposit
        await depositCoin(txb, USDC_pool, loan_coin, loan_amount)

        // withdraw
        const [withdraw_coin] = await withdrawCoin(txb, USDC_pool, loan_amount)

        // borrow 
        const [borrow_sui] =  await borrowCoin(txb, Sui_pool, borrow_amount)
        txb.transferObjects([borrow_sui], account.address)

        // repay debt
        const [repay_sui] = txb.splitCoins(txb.gas, [txb.pure(repay_debt_amount)])
        await repayDebt(txb, Sui_pool, repay_sui, repay_debt_amount)

        const repay_balance = txb.moveCall({
          target: '0x2::coin::into_balance',
          arguments: [txb.object(withdraw_coin)],
          typeArguments: [USDC_pool.type]
        })

        const [repay_loan_coin] = await repayFlashLoan(txb, USDC_pool, receipt, repay_balance)

        txb.transferObjects([repay_loan_coin], account.address)

        const res = await SignAndSubmitTXB(txb, account.client, account.keypair)

        expect(res.digest).not.toBeUndefined()
    }, {timeout: 30000});
});