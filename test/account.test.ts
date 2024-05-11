
import { describe, it } from 'vitest';
import { NAVISDKClient } from '../src/index';
import { USDC } from '../src/address';

describe('Test Navi SDk - account', async () => {
    it('should account functions executed', async () => {
        //Dummy mnemonic
        const sdk = new NAVISDKClient({mnemonic:'asset birth pluck impose vendor until sock honey genius claim spring damp'});
        const account = sdk.accounts[0]

        await account.depositToNavi(USDC, 1_000)

        await account.borrow(USDC, 750)

        await account.repay(USDC, 750)
    }, {timeout: 30000});
});