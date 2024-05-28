
import { describe, it, expect } from 'vitest';
import { NAVISDKClient } from '../src/index';

describe('Test Navi SDk', async () => {
    it('should import account', async () => {
        //Dummy mnemonic
        const sdk = new NAVISDKClient({mnemonic:''});
        expect(sdk.account.getPublicKey()).toBe("");
    });
});