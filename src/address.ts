import { Pool, CoinInfo } from './types';
import {getLatestProtocolPackageId} from './libs/PoolInfo/index';

export const AddressMap: Record<string, string> = {
    '0x2::sui::SUI': "Sui",
    '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX': "NAVX",
    '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT': 'vSui',
    '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': 'USDC',
    '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN': 'USDT',
    '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN': 'WETH',
    '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS': 'CETUS',
    '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI': 'haSui',
};

export const getConfig = async () => {
    return {
        ProtocolPackage: await getLatestProtocolPackageId(),
        StorageId: '0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe',
        Incentive: '0xaaf735bf83ff564e1b219a0d644de894ef5bdc4b2250b126b2a46dd002331821',
        IncentiveV2: '0xf87a8acb8b81d14307894d12595541a73f19933f88e1326d5be349c7a6f7559c', // The new incentive version: V2

        PriceOracle: '0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef',
        ReserveParentId: '0xe6d4c6610b86ce7735ea754596d71d72d10c7980b5052fc3c8cdf8d09fea9b4b', // get it from storage object id. storage.reserves
        uiGetter: '0x1ee4061d3c78d6244b5f32eb4011d081e52f5f4b484ca4a84de48b1146a779f7',
    };
};

export const pool: Pool = {
    Sui: {
        name: 'SUI',
        assetId: 0,
        poolId: '0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5',
        type: '0x2::sui::SUI',
        reserveObjectId: '0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf',
        borrowBalanceParentId: '0xe7ff0daa9d090727210abe6a8b6c0c5cd483f3692a10610386e4dc9c57871ba7',
        supplyBalanceParentId: '0x589c83af4b035a3bc64c40d9011397b539b97ea47edf7be8f33d643606bf96f8',
    },
    USDC: {
        name: 'USDC',
        assetId: 1,
        poolId: '0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8',
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
        reserveObjectId: '0xeb3903f7748ace73429bd52a70fff278aac1725d3b58afa781f25ce3450ac203',
        borrowBalanceParentId: '0x8a3aaa817a811131c624658f6e77cba04ab5829293d2c49c1a9cce8ac9c8dec4',
        supplyBalanceParentId: '0x8d0a4467806458052d577c8cd2be6031e972f2b8f5f77fce98aa12cd85330da9',
    },
    USDT: {
        name: 'USDT',
        assetId: 2,
        poolId: '0x0e060c3b5b8de00fb50511b7a45188c8e34b6995c01f69d98ea5a466fe10d103',
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
        reserveObjectId: '0xb8c5eab02a0202f638958cc79a69a2d30055565caad1684b3c8bbca3bddcb322',
        borrowBalanceParentId: '0xc14d8292a7d69ae31164bafab7ca8a5bfda11f998540fe976a674ed0673e448f',
        supplyBalanceParentId: '0x7e2a49ff9d2edd875f82b76a9b21e2a5a098e7130abfd510a203b6ea08ab9257',
    },
    WETH: {
        name: 'WETH',
        assetId: 3,
        poolId: '0x71b9f6e822c48ce827bceadce82201d6a7559f7b0350ed1daa1dc2ba3ac41b56',
        type: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
        reserveObjectId: '0xafecf4b57899d377cc8c9de75854c68925d9f512d0c47150ca52a0d3a442b735',
        borrowBalanceParentId: '0x7568d06a1b6ffc416a36c82791e3daf0e621cf19d4a2724fc6f74842661b6323',
        supplyBalanceParentId: '0xa668905b1ad445a3159b4d29b1181c4a62d864861b463dd9106cc0d97ffe8f7f',
    },
    CETUS: {
        name: 'CETUS',
        assetId: 4,
        poolId: '0x3c376f857ec4247b8ee456c1db19e9c74e0154d4876915e54221b5052d5b1e2e',
        type: '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
        reserveObjectId: '0x66a807c06212537fe46aa6719a00e4fa1e85a932d0b53ce7c4b1041983645133',
        borrowBalanceParentId: '0x4c3da45ffff6432b4592a39cdb3ce12f4a28034cbcb804bb071facc81fdd923d',
        supplyBalanceParentId: '0x6adc72faf2a9a15a583c9fb04f457c6a5f0b456bc9b4832413a131dfd4faddae',
    },
    vSui: {
        name: 'VoloSui',
        assetId: 5,
        poolId: '0x9790c2c272e15b6bf9b341eb531ef16bcc8ed2b20dfda25d060bf47f5dd88d01',
        type: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
        reserveObjectId: '0xd4fd7e094af9819b06ea3136c13a6ae8da184016b78cf19773ac26d2095793e2',
        borrowBalanceParentId: '0x8fa5eccbca2c4ba9aae3b87fd44aa75aa5f5b41ea2d9be4d5321379384974984',
        supplyBalanceParentId: '0xe6457d247b6661b1cac123351998f88f3e724ff6e9ea542127b5dcb3176b3841'
    },
    haSui: {
        name: 'HaedalSui',
        assetId: 6,
        poolId: '0x6fd9cb6ebd76bc80340a9443d72ea0ae282ee20e2fd7544f6ffcd2c070d9557a',
        type: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
        reserveObjectId: '0x0c9f7a6ca561dc566bd75744bcc71a6af1dc3caf7bd32c099cd640bb5f3bb0e3',
        borrowBalanceParentId: '0x01f36898e020be6c3423e5c95d9f348868813cd4d0be39b0c8df9d8de4722b00',
        supplyBalanceParentId: '0x278b8e3d09c3548c60c51ed2f8eed281876ea58c392f71b7ff650cc9286d095b'
    },
    NAVX: {
        name: 'NAVX',
        assetId: 7,
        poolId: '0xc0e02e7a245e855dd365422faf76f87d9f5b2148a26d48dda6e8253c3fe9fa60',
        type: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
        reserveObjectId: '0x2e13b2f1f714c0c5fa72264f147ef7632b48ec2501f810c07df3ccb59d6fdc81',
        borrowBalanceParentId: '0xa5bf13075aa400cbdd4690a617c5f008e1fae0511dcd4f7121f09817df6c8d8b',
        supplyBalanceParentId: '0x59dedca8dc44e8df50b190f8b5fe673098c1273ac6168c0a4addf3613afcdee5'
    },
};

export const flashloanConfig = {
    id: '0x3672b2bf471a60c30a03325f104f92fb195c9d337ba58072dce764fe2aa5e2dc'
}

export const NAVX: CoinInfo = {
    symbol: 'NAVX',
    address: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
    decimal: 9
}

export const Sui: CoinInfo = {
    symbol: 'Sui',
    address: '0x2::sui::SUI',
    decimal: 9
}

export const vSui: CoinInfo = {
    symbol: 'vSui',
    address: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
    decimal: 9
}

export const USDT: CoinInfo = {
    symbol: 'USDT',
    address: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
    decimal: 6
}

export const USDC: CoinInfo = {
    symbol: 'USDC',
    address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    decimal: 6
}

export const WETH: CoinInfo = {
    symbol: 'WETH',
    address: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
    decimal: 18
}

export const CETUS: CoinInfo = {
    symbol: 'CETUS',
    address: '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
    decimal: 9
}

export const haSui: CoinInfo = {
    symbol: 'haSui',
    address: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
    decimal: 9
}