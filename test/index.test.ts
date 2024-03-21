
import { describe, it, expect } from 'vitest';
import { NAVISDKClient } from '../src/index';

describe('Test Navi SDk', async () => {
    it('should import account', async () => {
        //Dummy mnemonic
        const sdk = new NAVISDKClient({mnemonic:'asset birth pluck impose vendor until sock honey genius claim spring damp'});
        expect(sdk.account.getPublicKey()).toBe("0x7bec179ebf4406a2d4f54f0086bf239779f72f9b4c91a638b2189b52f3173406");
    });
});