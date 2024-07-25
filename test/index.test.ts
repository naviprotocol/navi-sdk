
import { describe, it, expect } from 'vitest';
import { NAVISDKClient } from '../src/index';
import { NAVX, Sui } from '../src/address';

describe('NAVI SDK Client', async () => {
    const client = new NAVISDKClient({});
    it('should generate correct account', async () => {
        expect(client.accounts[0].getPublicKey()).toBe(client.getAllAccounts()[0].getPublicKey());
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
        expect(res).toBeLessThan(5);

    });
    it('should get correct check user dynamic health factor', async () => {
        const userToCheck = '0x523c19fd6af645a12c6cb69bff0740b693aedd3f7613b1b20aa40d78f45204be';
        const res = await client.getDynamicHealthFactor(userToCheck, Sui, 1e9, 0, true)
        const resNumber = Number(res);
        expect(resNumber).toBeGreaterThan(1);
        expect(resNumber).toBeLessThan(5);

    });
    it('should get correct return all accounts\' Navi Portfolio', async () => {

        const res = await client.getAllNaviPortfolios();
        const haSui:any = res.get('HaedalSui');

        expect(haSui.borrowBalance).toBe(0);
        expect(haSui.supplyBalance).toBe(0);
        
    });
    it('should get correct return all accounts\' wallet balance', async () => {

        const res = await client.getAllBalances();
        const sui:any = res;

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
    const client = new NAVISDKClient({});
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

    
});