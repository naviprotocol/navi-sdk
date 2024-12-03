
import { describe, it, expect } from 'vitest';
import { NAVISDKClient } from '../src/index';
import { NAVX, nUSDC, Sui } from '../src/address';
import { Transaction } from "@mysten/sui/transactions";
import { borrowCoin, depositCoin, withdrawCoin, repayDebt, stakeTovSuiPTB, updateOraclePTB, swapPTB, SignAndSubmitTXB } from '../src/libs/PTB';
import { Pool, PoolConfig, CoinInfo, OptionType } from "../src/types";
import { getConfig, pool, AddressMap, vSui } from "../src/address";
import { error } from 'console';
import dotenv from 'dotenv';
import { AccountManager } from '../src/libs/AccountManager';

dotenv.config();

const rpcUrl = process.env.RPC || '';
const mnemonic = process.env.MNEMONIC || '';
const privateKey = process.env.PRIVATE_KEY || '';

describe('NAVI SDK Client', async () => {

    const client = new NAVISDKClient({ networkType: rpcUrl, mnemonic: mnemonic });

    it('should generate correct account', async () => {
        expect(client.accounts[0].getPublicKey()).toBe(client.getAllAccounts()[0].getPublicKey());
    });
    it('should generate correct account with private key in client', async () => {
        const client1 = new NAVISDKClient({ privateKeyList: [privateKey, privateKey], networkType: rpcUrl });
        expect(client1.accounts.length).toBe(2);
        expect(client1.accounts[0].getPublicKey()).toBe(client.accounts[0].getPublicKey());
    });

    it('should generate correct account with private key with AccountManager', async () => {
        const account = new AccountManager({ privateKey: privateKey });
        expect(account.getPublicKey()).toBe(client.getAllAccounts()[0].getPublicKey());
    });
    it('should get correct pool Info', async () => {
        const coinAddress = '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX';
        const res = await client.getPoolInfo(NAVX)
        expect(res.coin_type).toBe(coinAddress);

    });
    it('should get correct reserve Info', async () => {
        const poolObjectId = '0x2e13b2f1f714c0c5fa72264f147ef7632b48ec2501f810c07df3ccb59d6fdc81';
        const res = await client.getReserveDetail(NAVX)
        expect(res.data?.objectId).toBe(poolObjectId);

    });
    it('should get correct check user health factor', async () => {
        const userToCheck = '0x523c19fd6af645a12c6cb69bff0740b693aedd3f7613b1b20aa40d78f45204be';
        const res = await client.getHealthFactor(userToCheck)
        expect(res).toBeGreaterThan(1);
        expect(res).toBeLessThan(20);

    });
    it('should get correct check user dynamic health factor', async () => {
        const userToCheck = '0x523c19fd6af645a12c6cb69bff0740b693aedd3f7613b1b20aa40d78f45204be';
        const res = await client.getDynamicHealthFactor(userToCheck, Sui, 1e9, 0, true)
        const resNumber = Number(res);
        expect(resNumber).toBeGreaterThan(1);
        expect(resNumber).toBeLessThan(20);

    });
    it('should get correct return all accounts\' Navi Portfolio', async () => {

        const res = await client.getAllNaviPortfolios();
        const haSui: any = res.get('HaedalSui');

        expect(haSui.borrowBalance).toBe(0);
        expect(haSui.supplyBalance).toBe(0);

    });
    it('should get correct return all accounts\' wallet balance', async () => {

        const res = await client.getAllBalances();
        const sui: any = res;

        expect(typeof sui).toBe('object');

    });
    it('should get correct return available rewards for specific address', async () => {
        const address = '0xcb98748e6a6bb10d0250eeaef3aade81003b5ac25034c08a95e090768473144b';

        const res = await client.getAddressAvailableRewards(address);
        const reward = res['0'];
        expect(reward.asset_id).toBe('0');

    });

});

describe('NAVI SDK Account Manager', async () => {
    const client = new NAVISDKClient({ networkType: rpcUrl, mnemonic: mnemonic });
    const account = client.accounts[0];

    it('should return correct public key', async () => {
        const publicKey = account.getPublicKey();
        expect(account.address).toBe(publicKey);
    });
    it('should return correct derivationPath', async () => {
        const path = account.getDerivationPath(0);
        expect(path).toBe(`m/44'/784'/0'/0'/0'`);
    });
    it('should return correct coin decimal', async () => {
        const path = await account.getCoinDecimal(Sui);
        expect(path).toEqual(9);
    });
    it('should success deposit Sui to NAVI protocol', async () => {
        let txb = new Transaction();
        txb.setSender(account.address);
        const poolConfig: PoolConfig = pool["Sui" as keyof Pool];

        const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
        await depositCoin(txb, poolConfig, toDeposit, 1e9);

        const result = await account.client.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: account.address,
        })

        if (result.effects.status.status === "failure") {
            throw new Error(result.effects.status.error)
        }
        expect(result.effects.status.status).toEqual("success");

    });
    it('should success withdraw Sui to NAVI protocol', async () => {
        let txb = new Transaction();
        txb.setSender(account.address);
        const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
        const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
        await depositCoin(txb, poolConfig, toDeposit, 1e9);
        await withdrawCoin(txb, poolConfig, 1e9);

        const result = await account.client.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: account.address,
        })
        if (result.effects.status.status === "failure") {
            throw new Error(result.effects.status.error)
        }
        expect(result.effects.status.status).toEqual("success");

    });
    it('should success borrow Sui from NAVI protocol', async () => {
        let txb = new Transaction();
        txb.setSender(account.address);
        const poolConfig: PoolConfig = pool["Sui" as keyof Pool];
        const [toDeposit] = txb.splitCoins(txb.gas, [1e9]);
        await depositCoin(txb, poolConfig, toDeposit, 1e9);
        await borrowCoin(txb, poolConfig, 0.5e9);

        const result = await account.client.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: account.address,
        })
        if (result.effects.status.status === "failure") {
            throw new Error(result.effects.status.error)
        }
        expect(result.effects.status.status).toEqual("success");

    });
    it('should success Repay Sui from NAVI protocol - random address might fail', async () => {
        let txb = new Transaction();
        txb.setSender('0x010ac247d4b9f8fcc9704b53b4aee5c4b00c3263b17bc39d3898ea802518bac9');
        const poolConfig: PoolConfig = pool["USDT" as keyof Pool];
        const [toRepay] = txb.splitCoins("0x7ae2714cb57cad133e62b83c58c59f4332a912256193203e86905571aa420d03", [0.1e6]);

        await repayDebt(txb, poolConfig, toRepay, 0.1e6);

        const result = await account.client.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x010ac247d4b9f8fcc9704b53b4aee5c4b00c3263b17bc39d3898ea802518bac9'
        })
        if (result.effects.status.status === "failure") {
            throw new Error(result.effects.status.error)
        }
        expect(result.effects.status.status).toEqual("success");

    });
    it('should success stake Sui to Volo Sui', async () => {
        let txb = new Transaction();

        const [toStake] = txb.splitCoins(txb.gas, [1e9]);

        await stakeTovSuiPTB(txb, toStake);

        const result = await account.client.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: account.address
        })
        if (result.effects.status.status === "failure") {
            throw new Error(result.effects.status.error)
        }
        expect(result.effects.status.status).toEqual("success");

    });
    it('should success update oracle', async () => {
        let txb = new Transaction();
        txb.setSender(account.address);
        await updateOraclePTB(account.client, txb);

        const result = await account.client.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: account.address,
        })
        if (result.effects.status.status === "failure") {
            throw new Error(result.effects.status.error)
        }
        expect(result.effects.status.status).toEqual("success");

    });

    it('should get correct NS rewards', async () => {
        const res = await client.getAddressAvailableRewards('0x33be2c133f87c268e48b527a7c62a509ad862b01e1eb4cf671ea5064218cfdc0');
        expect(res).toHaveProperty('13extra');
        expect(Number(res['13extra'].available)).toBeGreaterThan(0);
    });
    it('should get correct quote', async () => {
        const res = await client.getQuote(Sui.address, nUSDC.address, 1e9, '');
        console.log(res);
        expect(Number(res.amount_in)).toBeGreaterThan(0);
        expect(Number(res.amount_out)).toBeGreaterThan(0);
        expect(res.routes.length).toBeGreaterThan(0);
    });
    it('should build swap ptb from quote without fee', async () => {
        const txb = new Transaction();
        const from = "0x2::sui::SUI";
        const to = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
        const amount = 1e9;
        const fromCoin = txb.splitCoins(txb.gas, [amount]);

        swapPTB(account.address, txb, from, to, fromCoin, amount, 0, ""
        ).then(coinB => {
            txb.transferObjects([coinB], account.address);
            account.client.devInspectTransactionBlock({
                transactionBlock: txb,
                sender: account.address,
            }).then(result => {
                if (result.effects.status.status === "failure") {
                    throw new Error(result.effects.status.error)
                }
                expect(result.effects.status.status).toEqual("success");
            });
            // txb.build({
            //     client: account.client
            // }).then(dryRunTxBytes => {
            //     account.client.dryRunTransactionBlock({ transactionBlock: dryRunTxBytes }).then(res => {
            //         console.log(res);

            //     });
            // });
        });

    });

    it('should build swap ptb from quote with fee', async () => {
        const txb = new Transaction();
        const from = "0x2::sui::SUI";
        const to = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
        const amount = 1e9;
        const fromCoin = txb.splitCoins(txb.gas, [amount]);

        swapPTB(account.address, txb, from, to, fromCoin, amount, 0, "", {
            feeOption: {
                fee: 0.1, //10% of fee
                receiverAddress: account.address
            }
        }
        ).then(coinB => {
            txb.transferObjects([coinB], account.address);
            account.client.devInspectTransactionBlock({
                transactionBlock: txb,
                sender: account.address,
            }).then(result => {
                if (result.effects.status.status === "failure") {
                    throw new Error(result.effects.status.error)
                }
                expect(result.effects.status.status).toEqual("success");
            });
        });
    });
});

