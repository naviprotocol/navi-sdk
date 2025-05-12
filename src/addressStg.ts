import { Pool, CoinInfo, PoolConfig } from './types';
import { getLatestProtocolPackageId } from './libs/PoolInfo/index';


let globalPackageId: string;
let globalPackageIdExpireAt: number;
let cacheUpdatePromise: Promise<void> | null = null;

export const AddressMap: Record<string, string> = {
  "0x2::sui::SUI": "Sui",
  "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX":
    "NAVX",
  "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
    "vSui",
  "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdc::USDC":
    "wUSDC", //test usdc
  "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT":
    "USDT", //test usdt
  "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH":
    "WETH", //test weth
  "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI":
    "AFSUI", //test afsui
  "0xa45fa952a312a0a504fafb9bf3fc95faaccdfe613a740190c511663600d39010::usdys::USDYS":
    "USDYs", //test usdy
  "0x6775698681ebe5a3bd931f80c71eda65941d92ce1b8ee17b6fe59aacc2c489b6::tdai::TDAI":
    "TDAI", //test tdai
  "0x0ae6b3b3117ab4d524eaa16d74483324eb1885888ef0370803b331e1b04ee65c::ausd::AUSD":
    "AUSDS", //test ausd
  "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS":
    "CETUS",
  "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI":
    "haSui",
  "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN":
    "WBTC",
  "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD":
    "AUSD",
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC":
    "nUSDC",
  "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH":
    "ETH", // native eth
  "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY":
    "USDY",
  "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS":
    "NS",
  "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN":
    "stBTC",
  "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP":
    "DEEP",
  "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD":
    "FDUSD",
  "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE":
    "BLUE",
  "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK":
    "BUCK",
  "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT":
    "suiUSDT",
  "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI":
    "stSUI",
  "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC":
    "suiBTC",
  "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN":
    "WSOL",
  "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC":
    "LBTC",
  "0x93b6e3432bdf986099feee41910b0dcc8d1db9040e2d3c27ccf20330c18a79ca::wal_test::WAL_TEST":
    "WAL",
  "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL":
    "HAEDAL",
};

export function getPackageCache(): string | undefined {
  return globalPackageId;
}

export function isPackageCacheExpired(): boolean {
  if (!globalPackageIdExpireAt || globalPackageIdExpireAt < Date.now()) {
    return true;
  }
  return false;
}

export async function setPackageCache(
  expirationLength: number = 3600
): Promise<void> {
  const id = await getLatestProtocolPackageId();
  if (!id) {
    return;
  }
  globalPackageId = id;
  globalPackageIdExpireAt = Date.now() + expirationLength * 1000; // Convert seconds to milliseconds
}

async function updateCacheIfNeeded() {
  if (isPackageCacheExpired() && !cacheUpdatePromise) {
    cacheUpdatePromise = setPackageCache();
    await cacheUpdatePromise;
    cacheUpdatePromise = null;
  } else if (cacheUpdatePromise) {
    await cacheUpdatePromise;
  }
}

export const getConfig = async () => {
  await updateCacheIfNeeded();
  // const protocolPackage = getPackageCache();
  const protocolPackage = '0x8200ce83e1bc0894b641f0a466694b4f6e25d3f9cc3093915a887ec9e7f3395e';
  return {
    ProtocolPackage: protocolPackage,
    StorageId:
      "0x111b9d70174462646e7e47e6fec5da9eb50cea14e6c5a55a910c8b0e44cd2913",
    IncentiveV2:
      "0x952b6726bbcc08eb14f38a3632a3f98b823f301468d7de36f1d05faaef1bdd2a", 
    IncentiveV3:
      "0x5db4063954356f37ebdc791ec30f4cfd39734feff18820ee44dc2d2de96db899", 

    PriceOracle:
      "0x25c718f494ff63021f75642ecaaeda826f44b2d9d59859a8ad45ef0fba9626f2",
    ReserveParentId:
      "0x287399b936f75e810e460f3d70ddb21d804d2224f16d04e9f3be12fe80115175", // get it from storage object id. storage.reserves
    uiGetter:
      "0xa37cf08e27973bc437d1adc77d910aa7dc908f263a3378163fb929f7146a2973",
    flashloanConfig:
      "0x3672b2bf471a60c30a03325f104f92fb195c9d337ba58072dce764fe2aa5e2dc",
    flashloanSupportedAssets:
      "0x6c8fc404b4f22443302bbcc50ee593e5b898cc1e6755d72af0a6aab5a7a6f6d3",
  };
};

export const pool: { [key: string]: PoolConfig}  = {
  Sui: {
    name: "SUI",
    assetId: 0,
    poolId:
      "0x68b420259e3adcdadf165350984f59dfdaf677c3d639aaa54c1d907dae2dd1a3",
    type: "0x2::sui::SUI",
    reserveObjectId:
      "0x278cec0691f79d7ba7a4dfef5490d9419eb4e7a48d6cab88d9fa187952ee5462",
    borrowBalanceParentId:
      "0x040ee0bd51ff0adc3fff41d51a9b4d8e55213fee9b97324ee2ecfa76af1cdc55",
    supplyBalanceParentId:
      "0x0864aabbdcab5da56964b70fe6ad8fc592b01dfbb6254cb9bc2a965e517c1029",
    rewardFundId: "0x5fdbd4ae16b58784bc898d81c732815c46f92b915ba3a188a520424482b6bdd9",
  },
  wUSDC: {
    name: "wUSDC",
    assetId: 1,
    poolId:
      "0x8bf81e96302d4307d8da07e49328875e1f2e205dc0c4d457bffe6a8c1740ba25",
    type: "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdc::USDC",
    reserveObjectId:
      "0x4ae60e09f6b326b2c29054f1381a74e6cb7688220a1dad5cead3b2ab3decf029",
    borrowBalanceParentId:
      "0xd41bd348dd5a2a6ed42ecccf296dcf8c0fcb49880d3d07958352269e68cc6648",
    supplyBalanceParentId:
      "0xa3c613f37db324f30947230761bc5980a6d682bdc9027bb75656452d0d44bebc",
    rewardFundId: "",
  },
  USDT: {
    name: "USDT",
    assetId: 2,
    poolId:
      "0x8c07168a57d3734e6fa710e734d228507159b567f8bee9becf2847cd5c5954ec",
    type: "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT",
    reserveObjectId:
      "0x4d712e2acea9339b4613a31501fafd03cb2987285da25e8254c731d29c8f11e8",
    borrowBalanceParentId:
      "0x035e3d850b52de17115ee95f1841bdca045d0040ff6681bfac57a46dbea61646",
    supplyBalanceParentId:
      "0x2eeb81b66f58670b497bde60bfb5b5cab07e0b7971f7b9add981f8c714100c41",
    rewardFundId: "0x619cc3b88a0901e972ae88bdfb51f901170a4b6276bde101e20b7eb852b92632",
  },
  WETH: {
    name: "WETH",
    assetId: 3,
    poolId:
      "0x459f8732415859e4fba362e372db4b3a474d1d18ec54176ac401a2a2ee21f29b",
    type: "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH",
    reserveObjectId:
      "0x06b658f63902ffe866787d5dfa8b5335d57a26b186cbdb60aeddeea75e1701a3",
    borrowBalanceParentId:
      "0xafdeaaaf8cff53acfa116687489dd2a86abb07e3142d57a9743b57241fa691d5",
    supplyBalanceParentId:
      "0x9a0a58a85f515f65ff05272ae48d0e7e3a38d8e7f26fd7e71e74f125624eedd9",
    rewardFundId: "0xfb0de07cd39509ecb312464daa9442fac0eb4487d7a9b984cdfc39c1fb7d2791",
  },
  vSui: {
    name: "VoloSui",
    assetId: 4,
    poolId:
      "0xd386c359fd6295254d92022e902319e85c552bc5a8bd7af003ebe3074bd7f155",
    type: "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    reserveObjectId:
      "0x5bb709497addd45ad3c56e03feebaac002d854b3037243dcf7927018a0b797d4",
    borrowBalanceParentId:
      "0xedec31e75c912133fcd6865efbab331fac9c799d800e28ace77f0930c31ad41f",
    supplyBalanceParentId:
      "0x20f5f360d7efd835dbda0a14de00a72579b77ef3e30c6c6b70ff850b92fe9fab",
    rewardFundId: "0x4a1bf763bdf03c1fae15d7329db115ed37b8bf3c323938a3ddaa6b6e31a89789",
  },
  AFSUI: {
    name: "AFSUI",
    assetId: 5,
    poolId:
      "0x3131b488d328d12869f0e32d0d3f20b0613963c795f8197f118fe2d6561adde7",
    type: "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI",
    reserveObjectId:
      "0xaa7f15b7f2bfce2d6d50dfbe16ab712c6d855e60e406098f6e34ee4a5de5bc2f",
    borrowBalanceParentId:
      "0x272a678d94b099aa7a3bbd99825b124fc606fa609ea18db6a2b3405f592dd137",
    supplyBalanceParentId:
      "0x19807c58a9ba177673e7950208059c7bfe158943fc12a5f015a6e4a2625ac8a9",
    rewardFundId: "",
  },
  haSui: {
    name: "HASUI",
    assetId: 6,
    poolId:
      "0x2e2fe883402d0b077fc000ab947192fc8c055ad9213bc6d4e8ebc73aaf315f5a",
    type: "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    reserveObjectId:
      "0xd2e0865bb361e21109ace6569625804c988b7a7865b57ef3dba25f445dbb1b5a",
    borrowBalanceParentId:
      "0x10680695eee60fde8fb2ca8fbe91c61feee8a83850b51143725b40821f8e82b0",
    supplyBalanceParentId:
      "0x180055b8cb7ce9b032e3383f5719bad5d56caf98ce0648f29efffb1d3cde7da5",
    rewardFundId: "",
  },
  CETUS: {
    name: "CETUS",
    assetId: 7,
    poolId:
      "0xf6a2e1d9fd7c788f1e0763fc8fe277da8b21805d66aa31ea54e56f85a0f32f86",
    type: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    reserveObjectId:
      "0x0b9180b5ce4654a31a58bdbdba4df5f4e6c44db606a665f33732177577b3feba",
    borrowBalanceParentId:
      "0x0ebffa79684eca608c72914e0dd0bdc94819de83aff755be9d31e0bb2296b99c",
    supplyBalanceParentId:
      "0x277683ed790d0a8b18e27fb1a731ae279be2f60e0c559b593605318d002c9a83",
    rewardFundId: "",
  },
  NAVX: {
    name: "NAVX",
    assetId: 8,
    poolId:
      "0x521451b6329a41b7c49395e93cd718d821a6bb803ef9c8087d31d6056fe67819",
    type: "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
    reserveObjectId:
      "0x239b1026413181a1e78b8b187bc9954e8f488f0d62c33246bd4bfb3af3382341",
    borrowBalanceParentId:
      "0x2a5e8d1c0e6c9c35d6be4b415a29eb0ff08ed2c425f826f571e287dbf4d9c210",
    supplyBalanceParentId:
      "0xa28b2b2ffb3b3c611b272fa6877d00fd9352746557b758b54d03825b7dac4058",
    rewardFundId: "0x96945c944a7263ad6631c0ec4ef31adcf611563ef951d3b420bf0480338174ba",
  },
  USDYS: {
    name: "USDYS",
    assetId: 9,
    poolId:
      "0xf76c7a424142c14da26659cd623e154b0a54c3952f2a684cc9a1fde8e766150a",
    type: "0xa45fa952a312a0a504fafb9bf3fc95faaccdfe613a740190c511663600d39010::usdys::USDYS",
    reserveObjectId:
      "0x44dbd23ca122eda5bb982371ffb5deb24daf31e42befa66bedc111f626d8de37",
    borrowBalanceParentId:
      "0x0fc4b6cc252579b6349b70d2f080a091d97ab6f944dbb395f5e56c0d484f6bdf",
    supplyBalanceParentId:
      "0xa1aaf010c20c32a716fbc52dfe4ddcbcf3cee1ba5a0c806147a2cc576fa0bcac",
    rewardFundId: "",
  },
  USDY: {
    name: "USDY",
    assetId: 10,
    poolId:
      "0x8a08b94bb4ba4564446eb051cbab9e0438d8c2dd8ccf9bb29281e220973e3a61",
    type: "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY",
    reserveObjectId:
      "0xe1fdcbad49a6c094c9434a77b0ea8d3cc68dd9966926aa6fcd7251c16f7e5897",
    borrowBalanceParentId:
      "0x2d92220d0d99c235acc8041f6c9b25e14085eee230b5bb38b38832493a307142",
    supplyBalanceParentId:
      "0x4a5637d4461378a0a048d970bc34f3c93b40e1b2decb538782966dd671e2636f",
    rewardFundId: "",
  },
  BUCK: {
    name: "BUCK",
    assetId: 11,
    poolId:
      "0x33f07c409f427c3c898a386bf8e15b52b5a0ecd287e30cba0ef9904e97e76ed8",
    type: "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
    reserveObjectId:
      "0x61ab088159c9ac868e5292869190b72185ab7ea28839f74184b81d0546c66fa5",
    borrowBalanceParentId:
      "0x91343bd0358e508e5a3a47f471996750d3453f28f959d1f2fc7b6c10ed319125",
    supplyBalanceParentId:
      "0x9e394fb34811396b80bb9bec3156c7d8e97f99584624cf27720ce0d8cf0a8b20",
      rewardFundId: "",
  },
  FDUSD: {
    name: "FDUSD",
    assetId: 12,
    poolId:
      "0xae84d70b04ef658231d88639ab7186da88a3328a4638752944a2ad3a2d2efa31",
    type: "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD",
    reserveObjectId:
      "0xd81096867c2177b61134df549a282c80f207380f581a52bf7b0789a4d984f6cf",
    borrowBalanceParentId:
      "0x8f061998eb6030ec626a84761f5d0762516c8f32e49eafd6d07cd85630eb4331",
    supplyBalanceParentId:
      "0xfee9f9f94995e5af4e8c1441b01fede684c96d370665bcb7633cb51569f7f744",
      rewardFundId: "",
  },
  TDAI: {
    name: "TDAI",
    assetId: 13,
    poolId:
      "0xdd0f01b3483e99d51455541d1744e4aade22721d3e89d83bd6b681134ed17cc3",
    type: "0x6775698681ebe5a3bd931f80c71eda65941d92ce1b8ee17b6fe59aacc2c489b6::tdai::TDAI",
    reserveObjectId:
      "0x19218b90c7a219497fa4050eaf94c5e76a911b059b97f99466a38db9ec625e5b",
    borrowBalanceParentId:
      "0x16dacabb682d0ff050b7cb038ae07af4925d0f0022ef740e8dba4489c18fe836",
    supplyBalanceParentId:
      "0x47693490df9ce025217eacecad302b79308c68edf8d6bfa54ab62aadd9f0c611",
      rewardFundId: "",
  },
  AUSDs: {
    name: "AUSDs",
    assetId: 14,
    poolId:
      "0x83579779b30fdd43a1d302e43974b992a24ee5eb7fedf35717f86219577996a9",
    type: "0x0ae6b3b3117ab4d524eaa16d74483324eb1885888ef0370803b331e1b04ee65c::ausd::AUSD",
    reserveObjectId:
      "0x95e25ef72ab7b1613dcbbb0aa2554cb7ae9f9048aa09a99b96d3ccaf1213a0d3",
    borrowBalanceParentId:
      "0xce71078dff569c43069c552d843ec57b7207e6f6374e6c0916243b824246c6c5",
    supplyBalanceParentId:
      "0x3dd645e67697dc68beb07ef97d6a22d80602544a2efb5ff2e75f78e5862792ef",
      rewardFundId: "",
  },
  WBTC: {
    name: "WBTC",
    assetId: 15,
    poolId:
      "0x45d56b57c3d9015ea8a3f017414116ab428f9c97a0db00fb418f83c003d2a09c",
    type: "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
    reserveObjectId:
      "0x85023c9a57a95c5c08d37e275e8be6b40f12a2eb09bfb4cc258f3576523b4d4f",
    borrowBalanceParentId:
      "0x919efa3099cac69f39f971a4943e2ed211d5339f8ddf25b14555211418093875",
    supplyBalanceParentId:
      "0x6422fd09a988e27e2d2fb48461ea5e74224185e9e3528275d923f2f53522fb41",
    rewardFundId: "",
  },
  AUSD: {
    name: "AUSD",
    assetId: 16,
    poolId:
      "0x90b4d0f180692203316d047825c19a66a53c9938ddd1ed1acc3e05a8438e813c",
    type: "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
    reserveObjectId:
      "0x95e25ef72ab7b1613dcbbb0aa2554cb7ae9f9048aa09a99b96d3ccaf1213a0d3",
    borrowBalanceParentId:
      "0xce71078dff569c43069c552d843ec57b7207e6f6374e6c0916243b824246c6c5",
    supplyBalanceParentId:
      "0x3dd645e67697dc68beb07ef97d6a22d80602544a2efb5ff2e75f78e5862792ef",
      rewardFundId: "",
  },
  ETH: {
    name: "ETH",
    assetId: 17,
    poolId:
      "0xc0dd8dc69de288c37d531cbca6098ded14d06d21e595053759435d68e12fe434",
    type: "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::weth::WETH",
    reserveObjectId:
      "0x5e89d2f1efeceed394e5feca32ccb873afa3ac494124d3d5247e706c12214870",
    borrowBalanceParentId:
      "0xda2f2cc0a1d83f5ccda12a7c2b317f69cb8b8b04a6de50ad4b8c44079a5233b6",
    supplyBalanceParentId:
      "0xc9608a574fffe857cde6b1e26ac2e544a3cdc564f829a228667722417dad9b12",
      rewardFundId: "",
  },
  NS: {
    name: "NS",
    assetId: 18,
    poolId:
      "0x9560bd8276ec2a2dce85e53c4fd6c541fa383b802fa49c8e6fd4555a2a964eb4",
    type: "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
    reserveObjectId:
      "0x3321b80228ac92e9f6d3c58be1a859053f513bbfb340d4527f1cc0000bd68c42",
    borrowBalanceParentId:
      "0x69d878fe4f5eb3083ff7b2ca71a009924c0857f2984ea0b3b982eff5fa84ef33",
    supplyBalanceParentId:
      "0xfaf7e58bb35c565f58ca479ef0bdb74ac9a8352f85310b68185e97d788fdf9a8",
      rewardFundId: "",
  },
  LorenzoBTC: {
    name: "stBTC",
    assetId: 19,
    poolId:
      "0xb7b48430bfeb7f30ec9fbc8c2d67b0188aa19ff0f03e6b39193bae01fb19489b",
    type: "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN",
    reserveObjectId:
      "0x5ed96cb34c2005f6be120bac670760f673062236d5215c05569a003d73b50e2e",
    borrowBalanceParentId:
      "0x34b1fa39bc329f82ef24f05f8e67e3e77f67ca2d44a9f90427338505680a2263",
    supplyBalanceParentId:
      "0x66eaae717f228f798f3177ec5587319621ba077bfd1151ae40d9992f6e573fe8",
      rewardFundId: "",
  },
  DEEP: {
    name: "DEEP",
    assetId: 20,
    poolId:
      "0x9582044bd2a7682c6c6c7e0028c79cdb7c9452a9a7600b0653051649ef93e8eb",
    type: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    reserveObjectId:
      "0x61da4ef8555558997b4428a34d8ba1bc9335041f4c3cfc3260e8523e5859fdb0",
    borrowBalanceParentId:
      "0x5842c5e448220155d414a44d4c8e0e47170b3b3df56492bf264995038cfe5170",
    supplyBalanceParentId:
      "0xfc61d47b3f8ffbed926fd1f6f5374ccf81bdc70fbfbab06489c4806314db6a10",
      rewardFundId: "",
  },
  stSUI: {
    name: "stSUI",
    assetId: 21,
    poolId:
      "0xf6ab1d1838a64e3684161e3b958a4f2bb7bb4edb0ba79480796ecd149673b3de",
    type: "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
    reserveObjectId:
      "0x09072667183f8f634f75656fd7b065e3f96d14bcdc5d95eaed3303974baa0ec1",
    borrowBalanceParentId:
      "0x871f55514a0b37672e4435e32c61cc921e176006d85c9a07823ced3e8cdfaf00",
    supplyBalanceParentId:
      "0x7d53c267d7727ea48488620f1ae1afe49d6fdacfd8ed23d4c55c2bb3189d4e9e",
      rewardFundId: "",
  },
  BLUE: {
    name: "BLUE",
    assetId: 22,
    poolId:
      "0xa07495c10a08a16848d23c31ce28d6f29d2e15cb7570f43c574efe8523ef548e",
    type: "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
    reserveObjectId:
      "0xbf20842ec67af28c3cf30e65a95890b0b78057b14e1297d8c4aa2c7453639555",
    borrowBalanceParentId:
      "0xf8599cce8d8bc326112f0a2c77f2616f2b587411df3ec9ca308132abcd92e954",
    supplyBalanceParentId:
      "0xb1126323a5f349cb4699d34dcf019b173787d288f621ab9a8046eaa4296bf05c",
      rewardFundId: "",
  },
  suiUSDT: {
    name: "suiUSDT",
    assetId: 23,
    poolId:
      "0x35410660a4dad5f8a036d8a3cfe1cd81ae8152acea9615855e1e8a6f32c50085",
    type: "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
    reserveObjectId:
      "0xcffbf7ce9a1766b9cd109bd42b14e364c078c07f43c2bbae47ecd7dc9bca2d46",
    borrowBalanceParentId:
      "0x68dfa0a7a25e1b9bff3fb64d33e739fce92dd85c19970a48bd943e9c97f365b5",
    supplyBalanceParentId:
      "0xd4aa50314bfba95cba658890c73efc618668916df7a8f37ece2769c31e935070",
      rewardFundId: "",
  },
  suiBTC: {
    name: "suiBTC",
    assetId: 24,
    poolId:
      "0x599aeb1f69a24262e5f13bae2960ba10f928c75888d3de7ab3940567fa52108a",
    type: "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC",
    reserveObjectId:
      "0xadceed70c7c83a390e200854ef399a9cf895c9e09843e053db21308079eb2ff4",
    borrowBalanceParentId:
      "0xf233de5c743da3f20722570846cb1832a2f5c1c26c939f1b4031a8a39592c11e",
    supplyBalanceParentId:
      "0x0e2717209650d4eb7b3a0cf85e014840982c6605c4772310fdead9e858bf5375",
      rewardFundId: "",
  },
  WSOL: {
    name: "WSOL",
    assetId: 25,
    poolId:
      "0x026d8c51bbdbbc0438148ab8a21570f47cc4a5e1087014648af03fa2981936a1",
    type: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
    reserveObjectId:
      "0xcf020fdd93f47c63c2d8e853492b442f792d2203a51034ecea22e325e7ea8206",
    borrowBalanceParentId:
      "0x9ead83e3c40c81d41892d9196bf0a7ca83a9114b4f0c77c9cd4a796bc536edd6",
    supplyBalanceParentId:
      "0xdbb2f6a5503195d7c113321702d1d1d389c84ce1a0413eb440ca20a35af7cdf9",
      rewardFundId: "",
  },
  LBTC: {
    name: "LBTC",
    assetId: 26,
    poolId:
      "0x79bbc465a041d13cf82c33567d6b6e5ad3a09743145b6cc418700506c07717e5",
    type: "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC",
    reserveObjectId:
      "0xe4ceb4a1ff88768f0efeef0c3867adff577e593f6b4c78a8b5530456f36d8ffd",
    borrowBalanceParentId:
      "0x9a29792a2c3bb22000da2640c9a9903fdc8ac76f0f170447c945639c05b00536",
    supplyBalanceParentId:
      "0x017c91c2a61152ebdc135c0574d286911308166d08c2934bb94fa9f693682346",
      rewardFundId: "",
  },
  WAL: {
    name: "WAL",
    assetId: 27,
    poolId:
      "0x464e5d31faad52217a72f70aa547f0c76d951215a643f1127c0a50f3e1e1465e",
    type: "0x93b6e3432bdf986099feee41910b0dcc8d1db9040e2d3c27ccf20330c18a79ca::wal_test::WAL_TEST",
    reserveObjectId:
      "0xf33a49d855b51f118f4d5f30e23b739b19f7c00d5211ec543ea45494483e9e94",
    borrowBalanceParentId:
      "0x70a5bfe9bac87dd52143797c9c35b80749f79064f1e169aba486e3f98e2fb67f",
    supplyBalanceParentId:
      "0xe185780cd3aa7ab792b7e4a032bd10351df20e4377050d3dea00de7d965c6118",
      rewardFundId: "",
  },
  HAEDAL: {
    name: "HAEDAL",
    assetId: 28,
    poolId:
      "0x1c1a32850593c77b92eac4dcb8cefefb338118e6af030b400180f9d8d36357fb",
    type: "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL",
    reserveObjectId:
      "0xe368e392a53da9ede3e4a48cd90723a7fd2160e9dfb6740ae768f6ffb15694dd",
    borrowBalanceParentId:
      "0x3d65233aec5f488cacdfdbcb4cd00e728e0f3f74970a2623cf6e41f5e6417fd2",
    supplyBalanceParentId:
      "0xd74ae98a59f5bbbe8779856b063c0344cd6cab179c78685e697fac154f0c42f2",
      rewardFundId: "",
  },
  HIPPO: {
    name: "HIPPO",
    assetId: 88,
    poolId:
      "0x464e5d31faad52217a72f70aa547f0c76d951215a643f1127c0a50f3e1e1465e",
    type: "0x8993129d72e733985f7f1a00396cbd055bad6f817fee36576ce483c8bbb8b87b::sudeng::SUDENG",
    reserveObjectId:
      "0xf33a49d855b51f118f4d5f30e23b739b19f7c00d5211ec543ea45494483e9e94",
    borrowBalanceParentId:
      "0x70a5bfe9bac87dd52143797c9c35b80749f79064f1e169aba486e3f98e2fb67f",
    supplyBalanceParentId:
      "0xe185780cd3aa7ab792b7e4a032bd10351df20e4377050d3dea00de7d965c6118",
      rewardFundId: "",
  },
};

export const flashloanConfig = {
  id: "0x3672b2bf471a60c30a03325f104f92fb195c9d337ba58072dce764fe2aa5e2dc",
};

export const Sui: CoinInfo = {
  symbol: "Sui",
  address: "0x2::sui::SUI",
  decimal: 9,
};

export const wUSDC: CoinInfo = {
  symbol: "wUSDC",
  address:
    "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdc::USDC",
  decimal: 6,
};

export const USDT: CoinInfo = {
  symbol: "USDT",
  address:
    "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT",
  decimal: 6,
};

export const WETH: CoinInfo = {
  symbol: "WETH",
  address:
    "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH",
  decimal: 8,
};

export const vSui: CoinInfo = {
  symbol: "vSui",
  address:
    "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
  decimal: 9,
};

export const AFSUI: CoinInfo = {
  symbol: "AFSUI",
  address:
    "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI",
  decimal: 9,
};

export const haSui: CoinInfo = {
  symbol: "haSui",
  address:
    "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
  decimal: 9,
};

export const CETUS: CoinInfo = {
  symbol: "CETUS",
  address:
    "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
  decimal: 9,
};

export const NAVX: CoinInfo = {
  symbol: "NAVX",
  address:
    "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
  decimal: 9,
};

export const USDYS: CoinInfo = {
  symbol: "USDYS",
  address:
    "0xa45fa952a312a0a504fafb9bf3fc95faaccdfe613a740190c511663600d39010::usdys::USDYS",
  decimal: 6,
};

export const USDY: CoinInfo = {
  symbol: "USDY",
  address:
    "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY",
  decimal: 6,
};

export const BUCK: CoinInfo = {
  symbol: "BUCK",
  address:
    "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
  decimal: 9,
};

export const FDUSD: CoinInfo = {
  symbol: "FDUSD",
  address:
    "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD",
  decimal: 6,
};

export const TDAI: CoinInfo =  {
  symbol: "TDAI",
  address: "0x6775698681ebe5a3bd931f80c71eda65941d92ce1b8ee17b6fe59aacc2c489b6::tdai::TDAI",
  decimal: 6,

}

export const AUSDS: CoinInfo = {
  symbol: "AUSD",
  address:
    "0x0ae6b3b3117ab4d524eaa16d74483324eb1885888ef0370803b331e1b04ee65c::ausd::AUSD",
  decimal: 6,
};

export const WBTC: CoinInfo = {
  symbol: "WBTC",
  address:
    "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
  decimal: 8,
};

export const AUSD: CoinInfo = {
  symbol: "AUSD",
  address:
    "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
  decimal: 6,
};

export const ETH: CoinInfo = {
  symbol: "ETH",
  address:
    "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
  decimal: 8,
};

export const NS: CoinInfo = {
  symbol: "NS",
  address:
    "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
  decimal: 6,
};

export const LorenzoBTC: CoinInfo = {
  symbol: "stBTC",
  address:
    "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN",
  decimal: 8,
};

export const DEEP: CoinInfo = {
  symbol: "DEEP",
  address:
    "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
  decimal: 6,
};

export const stSUI: CoinInfo = {
  symbol: "stSUI",
  address:
    "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
  decimal: 9,
};

export const BLUE: CoinInfo = {
  symbol: "BLUE",
  address:
    "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
  decimal: 9,
};

export const suiUSDT: CoinInfo = {
  symbol: "suiUSDT",
  address:
    "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
  decimal: 6,
};

export const suiBTC: CoinInfo = {
  symbol: "suiBTC",
  address:
    "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC",
  decimal: 8,
};

export const nUSDC: CoinInfo = {
  symbol: "nUSDC",
  address:
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  decimal: 6,
};

export const WSOL: CoinInfo = {
  symbol: "WSOL",
  address:
    "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
  decimal: 8,
};
export const LBTC: CoinInfo = {
  symbol: "LBTC",
  address:
    "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC",
  decimal: 8,
};
export const WAL: CoinInfo = {
  symbol: "WAL",
  address:
    "0x93b6e3432bdf986099feee41910b0dcc8d1db9040e2d3c27ccf20330c18a79ca::wal_test::WAL_TEST",
  decimal: 9,
};
export const HAEDAL: CoinInfo = {
  symbol: "HAEDAL",
  address:
    "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL",
  decimal: 9,
};


export const HIPPO: CoinInfo = {
  symbol: "HIPPO",
  address:
    "0x8993129d72e733985f7f1a00396cbd055bad6f817fee36576ce483c8bbb8b87b::sudeng::SUDENG",
  decimal: 9,
};

export const vSuiConfig = {
  ProtocolPackage:
    "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55",
  pool: "0x7fa2faa111b8c65bea48a23049bfd81ca8f971a262d981dcd9a17c3825cb5baf",
  metadata:
    "0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60",
  wrapper: "0x05",
};

export interface IPriceFeed {
  oracleId: number;
  maxTimestampDiff: number;
  priceDiffThreshold1: number;
  priceDiffThreshold2: number;
  maxDurationWithinThresholds: number;
  maximumAllowedSpanPercentage: number;
  maximumEffectivePrice: number;
  minimumEffectivePrice: number;
  historicalPriceTTL: number;
  coinType: string;
  feedId: string;

  supraPairId: number;
  pythPriceFeedId: string;
  pythPriceInfoObject: string;

  priceDecimal: number;
  expiration: number;
}

export const PriceFeedConfig: { [key: string]: IPriceFeed } = {
  SUI: {
    oracleId: 0,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 3000000000, // 3 = 3 * 1e9 = 3000000000
    minimumEffectivePrice: 100000000, // 0.1 = 0.1 * 1e9 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    feedId:
      "0x2cab9b151ca1721624b09b421cc57d0bb26a1feb5da1f821492204b098ec35c9", // TODO: value
    supraPairId: 90, // SUI_USDT -> 90, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Under%20Supervision-,SUI_USDT,-90
    pythPriceFeedId:
      "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744", // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37",
    priceDecimal: 9,
    expiration: 30,
  },
  WUSDC: {
    oracleId: 1,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 100000, // 0.1 = 0.1 * 1e6 = 100000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdc::USDC",
    feedId:
      "0x70a79226dda5c080378b639d1bb540ddea64761629aa4ad7355d79266d55af61", // TODO: value
    supraPairId: 47, // USDC_USDT -> 47, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Supra%20Standard-,USDC_USDT,-47
    pythPriceFeedId:
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", // **fixed value: Crypto.USDC/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x5dec622733a204ca27f5a90d8c2fad453cc6665186fd5dff13a83d0b6c9027ab",
    priceDecimal: 6,
    expiration: 30,
  },
  USDT: {
    oracleId: 2,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 100000, // 0.1 = 0.1 * 1e6 = 100000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT",
    feedId:
      "0xf72d8933873bb4e5bfa1edbfa9ff6443ec5fac25c1d99ba2ef37f50a125826f3", // TODO: value
    supraPairId: 48, // USDT_USD -> 48, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Supra%20Premium-,USDT_USD,-48
    pythPriceFeedId:
      "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b", // **fixed value: Crypto.USDT/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x985e3db9f93f76ee8bace7c3dd5cc676a096accd5d9e09e9ae0fb6e492b14572",
    priceDecimal: 6,
    expiration: 30,
  },
  WETH: {
    oracleId: 3,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 600000000000, // 6000 = 6000 * 1e8 = 600000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH",
    feedId:
      "0x44d92366eba1f1652ec81f34585406726bef267565a2db1664ffd5ef18e21693", // TODO: value
    supraPairId: 1, // ETH_USDT -> 1, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Supra%20Premium-,ETH_USDT,-1
    pythPriceFeedId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // **fixed value: Crypto.ETH/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x9193fd47f9a0ab99b6e365a464c8a9ae30e6150fc37ed2a89c1586631f6fc4ab",
    priceDecimal: 8,
    expiration: 30,
  },
  CERT: {
    oracleId: 4,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 3000000000, // 3 = 3 * 1e9 = 3000000000
    minimumEffectivePrice: 100000000, // 0.1 = 0.1 * 1e9 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    feedId:
      "0x086bb5540047b3c77ae5e2f9b811c7ef085517a73510f776753c8ee83d19e62c", // TODO: value
    supraPairId: 90, // SUI_USDT -> 90, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Under%20Supervision-,SUI_USDT,-90
    pythPriceFeedId:
      "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744", // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37",
    priceDecimal: 9,
    expiration: 30,
  },
  AFSUI: {
    oracleId: 5,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 3000000000, // 3 = 3 * 1e9 = 3000000000
    minimumEffectivePrice: 100000000, // 0.1 = 0.1 * 1e9 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI",
    feedId:
      "0x086bb5540047b3c77ae5e2f9b811c7ef085517a73510f776753c8ee83d19e62c", // TODO: value
    supraPairId: 90, // SUI_USDT -> 90, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Under%20Supervision-,SUI_USDT,-90
    pythPriceFeedId:
      "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744", // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37",
    priceDecimal: 9,
    expiration: 30,
  },
  HASUI: {
    oracleId: 6,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 3000000000, // 3 = 3 * 1e9 = 3000000000
    minimumEffectivePrice: 100000000, // 0.1 = 0.1 * 1e9 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    feedId:
      "0xac934a2a2d406085e7f73b460221fe1b11935864605ba58cdbb8e21c15f12acd", // TODO: value
    supraPairId: 90, // SUI_USDT -> 90, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Under%20Supervision-,SUI_USDT,-90
    pythPriceFeedId:
      "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744", // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37",
    priceDecimal: 9,
    expiration: 30,
  },
  CETUS: {
    oracleId: 7,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 200, // x1: 2% = 0.02 * 10000 = 200
    priceDiffThreshold2: 400, // x2: 4% = 0.04 * 10000 = 400
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 1000000000, // 1 = 1 * 1e9 = 1000000000
    minimumEffectivePrice: 1000000, // 0.001 = 0.001 * 1e9 = 1000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    feedId:
      "0x5ac98fc1e6723af2a6d9a68a5d771654a6043f9c4d2b836b2d5fb4832a3be4f2", // TODO: value
    supraPairId: 93, // CETUS_USDT -> 93, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Supra%20Premium-,CETUS_USDT,-93
    pythPriceFeedId:
      "0xe5b274b2611143df055d6e7cd8d93fe1961716bcd4dca1cad87a83bc1e78c1ef", // **fixed value: Crypto.CETUS/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x24c0247fb22457a719efac7f670cdc79be321b521460bd6bd2ccfa9f80713b14",
    priceDecimal: 9,
    expiration: 30,
  },

  NAVX: {
    oracleId: 8,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 200, // x1: 2% = 0.02 * 10000 = 200
    priceDiffThreshold2: 400, // x2: 4% = 0.04 * 10000 = 400
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 1000000000, // 1 = 1 * 1e9 = 1000000000
    minimumEffectivePrice: 1000000, // 0.001 = 0.001 * 1e9 = 1000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
    feedId:
      "0x4324c797d2f19eff517c24adec8b92aa2d282e44f3a5cafb36d6c4b30d7f2dca", // TODO: value
    supraPairId: 408, // NAVX_USDT -> 408, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Supra%20Premium-,NAVX_USDT,-408
    pythPriceFeedId:
      "0x88250f854c019ef4f88a5c073d52a18bb1c6ac437033f5932cd017d24917ab46", // **fixed value: Crypto.NAVX/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x5b117a6a2de70796bffe36495bad576b788a34c33ca0648bd57852ead3f41e32",
    priceDecimal: 9,
    expiration: 30,
  },
  USDYS: {
    oracleId: 9,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 10000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "a45fa952a312a0a504fafb9bf3fc95faaccdfe613a740190c511663600d39010::usdys::USDYS",
    feedId:
      "0x11ddf2ac1868d493e2487deeb2a0c2791bb7ca69632c8c5fefe85e09390be093", // TODO: values
    supraPairId: 185,
    pythPriceFeedId:
      "0xe393449f6aff8a4b6d3e1165a7c9ebec103685f3b41e60db4277b5b6d10e7326",
    pythPriceInfoObject:
      "0x62e15c2fd1437a4d0e111dbd8a193f244878ba25cc7caa9120d0ee41ac151ea5",
    priceDecimal: 6,
    expiration: 30,
  },
  USDY: {
    oracleId: 10,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 10000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY",
    feedId:
      "0x11ddf2ac1868d493e2487deeb2a0c2791bb7ca69632c8c5fefe85e09390be093", // TODO: values
    supraPairId: 185,
    pythPriceFeedId:
      "0xe393449f6aff8a4b6d3e1165a7c9ebec103685f3b41e60db4277b5b6d10e7326",
    pythPriceInfoObject:
      "0x62e15c2fd1437a4d0e111dbd8a193f244878ba25cc7caa9120d0ee41ac151ea5",
    priceDecimal: 6,
    expiration: 30,
  },
  BUCK: {
    oracleId: 11,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 80,
    priceDiffThreshold2: 150,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000000,
    minimumEffectivePrice: 1000000,
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
    feedId:
      "0x93c1b815f64ef7c4311d74ff7c0ca1e47739c3ac31fdee0068c30887633ba2fb",
    supraPairId: 161,
    pythPriceFeedId:
      "0xfdf28a46570252b25fd31cb257973f865afc5ca2f320439e45d95e0394bc7382",
    pythPriceInfoObject:
      "0x3ef821a54dbdfe3f211b2ff7261dea0f0330c72fd292422ce586e21f43809a56",
    priceDecimal: 9,
    expiration: 30,
  },
  FDUSD: {
    oracleId: 12,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 10000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD",
    feedId:
      "0x843b39829166bd97d61843b8967405f13d443e066ce2f4fa0685f187974d34bd",
    supraPairId: 474,
    pythPriceFeedId:
      "0xccdc1a08923e2e4f4b1e6ea89de6acbc5fe1948e9706f5604b8cb50bc1ed3979",
    pythPriceInfoObject:
      "0x5f6583b2b0fe1ecf94aaffeaab8a838794693960cea48c0da282d5f4a24be027",
    priceDecimal: 6,
    expiration: 30,
  },
  TDAI: {
    oracleId: 13,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 10000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0x6775698681ebe5a3bd931f80c71eda65941d92ce1b8ee17b6fe59aacc2c489b6::tdai::TDAI",
    feedId:
      "0x843b39829166bd97d61843b8967405f13d443e066ce2f4fa0685f187974d34bd",
    supraPairId: 474,
    pythPriceFeedId:
      "0xccdc1a08923e2e4f4b1e6ea89de6acbc5fe1948e9706f5604b8cb50bc1ed3979",
    pythPriceInfoObject:
      "0x5f6583b2b0fe1ecf94aaffeaab8a838794693960cea48c0da282d5f4a24be027",
    priceDecimal: 6,
    expiration: 30,
  },

  AUSDS: {
    oracleId: 14,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 10000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x0ae6b3b3117ab4d524eaa16d74483324eb1885888ef0370803b331e1b04ee65c::ausd::AUSD",
    feedId:
      "0x9a0656e1e10a0cdf3f03dce9db9ad931f51dc6eac2e52ebfbf535dfbcf8100ef", // TODO: values
    supraPairId: 99999,
    pythPriceFeedId:
      "0xd9912df360b5b7f21a122f15bdd5e27f62ce5e72bd316c291f7c86620e07fb2a",
    pythPriceInfoObject:
      "0x94ef89923e7beccd4a52043a9451a87c614684b847426fb5fd76faa8cb1e907f",
    priceDecimal: 6,
    expiration: 30,
  },

  WBTC: {
    oracleId: 15,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 10000000000000, // 100000 = 100000 * 1e8 = 10000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
    feedId:
      "0x1bf4727242a61d892feef6616d3e40a3bd24b64b5deb884054e86cb9360556c4", // TODO: value
    supraPairId: 0, // BTC_USDT -> 0, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Pair%20Category-,BTC_USDT,-0
    pythPriceFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // Crypto.BTC/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2",
    priceDecimal: 8,
    expiration: 30,
  },
  AUSD: {
    oracleId: 16,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 10000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
    feedId:
      "0x9a0656e1e10a0cdf3f03dce9db9ad931f51dc6eac2e52ebfbf535dfbcf8100ef", // TODO: values
    supraPairId: 99999,
    pythPriceFeedId:
      "0xd9912df360b5b7f21a122f15bdd5e27f62ce5e72bd316c291f7c86620e07fb2a",
    pythPriceInfoObject:
      "0x94ef89923e7beccd4a52043a9451a87c614684b847426fb5fd76faa8cb1e907f",
    priceDecimal: 6,
    expiration: 30,
  },
  ETH: {
    oracleId: 18,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 600000000000, // 6000 = 6000 * 1e8 = 600000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::weth::WETH",
    feedId:
      "0x9a6ffc707270286e98e8d0f654ce38f69efbc302ac98e2deb11fbad2211600f0", // TODO: value
    supraPairId: 1, // ETH_USDT -> 1, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Supra%20Premium-,ETH_USDT,-1
    pythPriceFeedId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // **fixed value: Crypto.ETH/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x9193fd47f9a0ab99b6e365a464c8a9ae30e6150fc37ed2a89c1586631f6fc4ab",
    priceDecimal: 8,
    expiration: 30,
  },

  NS: {
    oracleId: 20,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 100000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
    feedId:
      "0xc771ec0ca245857f30195ce05197a7b3ab41c58c1e8abe0661919d90675ad63d",
    supraPairId: 99999, // ignore for now
    pythPriceFeedId:
      "0xbb5ff26e47a3a6cc7ec2fce1db996c2a145300edc5acaabe43bf9ff7c5dd5d32",
    pythPriceInfoObject:
      "0xc6352e1ea55d7b5acc3ed690cc3cdf8007978071d7bfd6a189445018cfb366e0",
    priceDecimal: 6,
    expiration: 30,
  },
  LORENZOBTC: {
    oracleId: 21,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 20000000000000, // 20000000000000 = 200000 * 1e8 = 20000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN",
    feedId:
      "0xdf9b254a7a64742e1edf8c48bd2a1f182b52f020de2ab070ae0e3f9228d05280",
    supraPairId: 0,
    pythPriceFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    pythPriceInfoObject:
      "0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2",
    priceDecimal: 8,
    expiration: 30,
  },
  DEEP: {
    oracleId: 19,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 200, // x1: 2% = 0.02 * 10000 = 200
    priceDiffThreshold2: 400, // x2: 4% = 0.04 * 10000 = 400
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 400000, // 0.4 = 0.4 * 1e6 = 400000
    minimumEffectivePrice: 1000, // 0.001 = 0.001 * 1e6 = 1000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    feedId:
      "0x4558092b08ad1b33b0eb536f91a4655693c2390ac568f06de6f6fad827888600",
    supraPairId: 491,
    pythPriceFeedId:
      "0x29bdd5248234e33bd93d3b81100b5fa32eaa5997843847e2c2cb16d7c6d9f7ff",
    pythPriceInfoObject:
      "0x8c7f3a322b94cc69db2a2ac575cbd94bf5766113324c3a3eceac91e3e88a51ed",
    priceDecimal: 6,
    expiration: 30,
  },
  STSUI: {
    oracleId: 22,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 100,
    priceDiffThreshold2: 300,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 10000000000,
    minimumEffectivePrice: 100000000,
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
    feedId:
      "0xd7a8c920db9f8b5c3c300307d88fca53684fd15b760977dbf8f0adc6e55783bd",
    supraPairId: 90,
    pythPriceFeedId:
      "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
    pythPriceInfoObject:
      "0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37",
    priceDecimal: 9,
    expiration: 30,
  },
  BLUE: {
    oracleId: 23,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 200, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 400, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 1000000, // 0.01 = 0.01 * 1e6 = 10000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
    feedId:
      "0xd8286c11df7e49496ee75622ae4132c56385c30b4bedb392e36c0699a52a1d52",
    supraPairId: 99999,
    pythPriceFeedId:
      "0x04cfeb7b143eb9c48e9b074125c1a3447b85f59c31164dc20c1beaa6f21f2b6b",
    pythPriceInfoObject:
      "0x5515a34fc610bba6b601575ed1d2535b2f9df1f339fd0d435fef487c1ee3df9c",
    priceDecimal: 9,
    expiration: 30,
  },

  SUIUSDT: {
    oracleId: 24,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 80,
    priceDiffThreshold2: 150,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000,
    minimumEffectivePrice: 100000,
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
    feedId:
      "0xdeba21105ff41300f8829aaeba45fdec25d1533a64d504ef0348ff005da3fbe5",
    supraPairId: 48,
    pythPriceFeedId:
      "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
    pythPriceInfoObject:
      "0x985e3db9f93f76ee8bace7c3dd5cc676a096accd5d9e09e9ae0fb6e492b14572",
    priceDecimal: 6,
    expiration: 30,
  },

  SUIBTC: {
    oracleId: 25,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 20000000000000, // 200000 = 200000 * 1e8 = 20000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC",
    feedId:
      "0x4e4666c82c476f0b51b27c5ed8c77ab960aa5e4c3a48796e179d721b471e3b7e", // TODO: value
    supraPairId: 0, // BTC_USDT -> 0, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Pair%20Category-,BTC_USDT,-0
    pythPriceFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // Crypto.BTC/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2",
    priceDecimal: 8,
    expiration: 30,
  },
  WSOL: {
    oracleId: 26,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 100000000000, // 1000 * 1e8 = 100000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType: '0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN',
    feedId: '0x9a7d68cd26885be09472b2cc140cd53d73a42ea112a9d15511ca41894951ddef',
    supraPairId: 10, // SOL_USDT -> 10
    pythPriceFeedId: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', // **fixed value: Crypto.SOL/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject: '0x9d0d275efbd37d8a8855f6f2c761fa5983293dd8ce202ee5196626de8fcd4469',
    priceDecimal: 8,
    expiration: 30,
  },
  LBTC: {
      oracleId: 27,
      maxTimestampDiff: 30 * 1000, // 30s(millisecond)
      priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
      priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
      maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
      maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
      maximumEffectivePrice: 15000000000000, // 150000 = 150000 * 1e8 = 15000000000000
      minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
      historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
      coinType: '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC',
      feedId: '0x33bad24fd78655cf4f1703072f78e5b56b9e940d7b331f9edd41ba261ca22d07', // TODO: value
      supraPairId: 0, // BTC_USDT -> 0, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Pair%20Category-,BTC_USDT,-0
      pythPriceFeedId: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // Crypto.BTC/USD -> https://pyth.network/developers/price-feed-ids
      pythPriceInfoObject: '0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2',
      priceDecimal: 8,
      expiration: 30,
  },
  WAL: {
    oracleId: 29,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 100,
    priceDiffThreshold2: 300,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 10000000000, // 10 * 1e9 = 10000000000
    minimumEffectivePrice: 1000000, // 0.001 * 1e9 = 1000000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType: '0x93b6e3432bdf986099feee41910b0dcc8d1db9040e2d3c27ccf20330c18a79ca::wal_test::WAL_TEST', // TODO: test verison
    feedId: '0xc18d1471524a7666ca89b7b7fb25c0f9fa55034280b0143218e311390dbad5d8', // TODO: value
    supraPairId: 99999, // none
    pythPriceFeedId: '0xeba0732395fae9dec4bae12e52760b35fc1c5671e2da8b449c9af4efe5d54341', // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject: '0xeb7e669f74d976c0b99b6ef9801e3a77716a95f1a15754e0f1399ce3fb60973d',
    priceDecimal: 9,
    expiration: 30,
},
HAEDAL: {
  oracleId: 30,
  maxTimestampDiff: 30000, // 30s(millisecond)
  priceDiffThreshold1: 100,
  priceDiffThreshold2: 300,
  maxDurationWithinThresholds: 30000, // 30s(millisecond)
  maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
  maximumEffectivePrice: 10000000000, // 10 * 1e9 = 10000000000
  minimumEffectivePrice: 1000000, // 0.001 * 1e9 = 1000000
  historicalPriceTTL: 300000, // 5min(millisecond)
  coinType: '0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL', //
  feedId: '0xf37501b0b8e56f51af45db3e3a358ac6dcbd752aab87bcdeacc62cdcef3afb21', // TODO: value
  supraPairId: 99999, // none
  pythPriceFeedId: '0xe67d98cc1fbd94f569d5ba6c3c3c759eb3ffc5d2b28e64538a53ae13efad8fd1', // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
  pythPriceInfoObject: '0xbc98681c15de1ca1b80a8e26500d43c77f7113368b024de1bf490afcb0387109',
  priceDecimal: 9,
  expiration: 30,
},

  HIPPO: {
    oracleId: 88,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 100,
    priceDiffThreshold2: 300,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 10000000000,
    minimumEffectivePrice: 100000000,
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType: '0x8993129d72e733985f7f1a00396cbd055bad6f817fee36576ce483c8bbb8b87b::sudeng::SUDENG', // TODO: test verison
    feedId: '0xc18d1471524a7666ca89b7b7fb25c0f9fa55034280b0143218e311390dbad5d8', // TODO: value
    supraPairId: 90, // SUI_USDT -> 90, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Under%20Supervision-,SUI_USDT,-90
    pythPriceFeedId: '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744', // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject: '0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37',
    priceDecimal: 9,
    expiration: 30,
  },
};

export interface IOracleProConfig {
    PackageId: string
    PriceOracle: string
    OracleAdminCap: string

    OracleConfig: string

    PythStateId: string
    WormholeStateId: string
    SupraOracleHolder: string
    Sender: string
    GasObject: string
}

export const OracleProConfig: IOracleProConfig = {
    PackageId: '0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83', // TODO: value
    PriceOracle: '0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef', // TODO: value
    OracleAdminCap: '0x7204e37882baf10f31b66cd1ac78ac65b3b8ad29c265d1e474fb4b24ccd6d5b7', // TODO: value

    OracleConfig: '0x1afe1cb83634f581606cc73c4487ddd8cc39a944b951283af23f7d69d5589478', // TODO: value

    PythStateId: '0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8', // **fixed value
    WormholeStateId: '0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c', // **fixed value
    SupraOracleHolder: '0xaa0315f0748c1f24ddb2b45f7939cff40f7a8104af5ccbc4a1d32f870c0b4105', // **fixed value

    Sender: '0x39c70d4ce3ce769a46f46ad80184a88bc25be9b49545751f5425796ef0c3d9ba', // TODO: value
    GasObject: '0x1e30410559ed83708ee1bb6b21e3a1dae96f1768ce35ed8233590b130ddc0086', // TODO: value
}

export const ProFundsPoolInfo: Record<string, { coinType: string; oracleId: number }> = {
  '524e28adcb04fe8b0ac5ddc23e6ca78f9a7d8afa17b680f6e59e7ab406ba60a9': {
    coinType: '0x2::sui::SUI',
    oracleId: 0,
},
'6797966d809eccdd4827a49012c32172e2cac7dda27109aab922c513e83cf0c9': {
    coinType: '0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdc::USDC',
    oracleId: 1,
},
'f78f9269623a8a4b8b46b84ac4382ad450deea3d305cd8143870577332399e1f': {
    coinType: '0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT',
    oracleId: 2,
},
'1ca8aff8df0296a8dcdbce782c468a9474d5575d16c484359587c3b26a7229e4': {
    coinType: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
    oracleId: 4,
},
'68505acdc8f9d73446f08b160d6fbfb878ec9c81f6b706883240c030545d2c8a': {
    coinType: 'f325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI',
    oracleId: 5,
},
'29659ecf615b9431f52c8e0cb9895b3610620acc988232fa7bbe877ba2f682e2': {
    coinType: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
    oracleId: 6,
},
'015a4aa921fa99e071e0440d5d8c522b076bda63a0395a083adaafaf9061d4fa': {
    coinType: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
    oracleId: 8,
},
}
export const noDepositCoinType = [
  '0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT',
  '0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH',
  '0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdc::USDC',
]