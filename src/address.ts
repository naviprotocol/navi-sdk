import { Pool, CoinInfo, PoolConfig } from "./types";
import { getLatestProtocolPackageId } from "./libs/PoolInfo/index";

let globalPackageId: string;
let globalPackageIdExpireAt: number;
let cacheUpdatePromise: Promise<void> | null = null;

export const defaultProtocolPackage =
  "0xee0041239b89564ce870a7dec5ddc5d114367ab94a1137e90aa0633cb76518e0";

export const AddressMap: Record<string, string> = {
  "0x2::sui::SUI": "Sui",
  "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX":
    "NAVX",
  "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
    "vSui",
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN":
    "wUSDC", //wormhole usdc
  "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN":
    "USDT",
  "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN":
    "WETH",
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
  "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL":
    "WAL",
  "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL":
    "HAEDAL",
  "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC":
    "XBTC",
  "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA":
    "IKA",
  "0x8f2b5eb696ed88b71fea398d330bccfa52f6e2a5a8e1ac6180fcb25c6de42ebc::coin::COIN":
    "EnzoBTC",
  "0xd1a91b46bd6d966b62686263609074ad16cfdffc63c31a4775870a2d54d20c6b::mbtc::MBTC":
    "MBTC",
  "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI":
    "SpringSui",
  "0xa03ab7eee2c8e97111977b77374eaf6324ba617e7027382228350db08469189e::ybtc::YBTC":
    "YBTC",
  "0x9d297676e7a4b771ab023291377b2adfaa4938fb9080b8d12430e4b108b836a9::xaum::XAUM":
    "XAUM",
};

// if the cache is not set, return the default protocol package.
export function getPackageCache(): string {
  return globalPackageId || defaultProtocolPackage;
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
  globalPackageId = await getLatestProtocolPackageId();
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
  const protocolPackage = getPackageCache();
  // const protocolPackage = '0x81c408448d0d57b3e371ea94de1d40bf852784d3e225de1e74acab3e8395c18f';
  return {
    ProtocolPackage: protocolPackage,
    StorageId:
      "0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe",
    IncentiveV2:
      "0xf87a8acb8b81d14307894d12595541a73f19933f88e1326d5be349c7a6f7559c", // The new incentive version: V2
    IncentiveV3:
      "0x62982dad27fb10bb314b3384d5de8d2ac2d72ab2dbeae5d801dbdb9efa816c80", // The new incentive version: V3

    PriceOracle:
      "0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef",
    ReserveParentId:
      "0xe6d4c6610b86ce7735ea754596d71d72d10c7980b5052fc3c8cdf8d09fea9b4b", // get it from storage object id. storage.reserves
    uiGetter:
      "0xf56370478288b5e1838769929823efaed88bf7ad89040d8a2ac391d6bd0aa2f2",
    flashloanConfig:
      "0x3672b2bf471a60c30a03325f104f92fb195c9d337ba58072dce764fe2aa5e2dc",
    flashloanSupportedAssets:
      "0x6c8fc404b4f22443302bbcc50ee593e5b898cc1e6755d72af0a6aab5a7a6f6d3",
  };
};

export const pool: { [key: string]: PoolConfig } = {
  Sui: {
    name: "SUI",
    assetId: 0,
    poolId:
      "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
    type: "0x2::sui::SUI",
    reserveObjectId:
      "0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf",
    borrowBalanceParentId:
      "0xe7ff0daa9d090727210abe6a8b6c0c5cd483f3692a10610386e4dc9c57871ba7",
    supplyBalanceParentId:
      "0x589c83af4b035a3bc64c40d9011397b539b97ea47edf7be8f33d643606bf96f8",
    rewardFundId: "",
  },
  USDT: {
    name: "USDT",
    assetId: 2,
    poolId:
      "0x0e060c3b5b8de00fb50511b7a45188c8e34b6995c01f69d98ea5a466fe10d103",
    type: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    reserveObjectId:
      "0xb8c5eab02a0202f638958cc79a69a2d30055565caad1684b3c8bbca3bddcb322",
    borrowBalanceParentId:
      "0xc14d8292a7d69ae31164bafab7ca8a5bfda11f998540fe976a674ed0673e448f",
    supplyBalanceParentId:
      "0x7e2a49ff9d2edd875f82b76a9b21e2a5a098e7130abfd510a203b6ea08ab9257",
    rewardFundId: "",
  },
  WETH: {
    name: "WETH",
    assetId: 3,
    poolId:
      "0x71b9f6e822c48ce827bceadce82201d6a7559f7b0350ed1daa1dc2ba3ac41b56",
    type: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
    reserveObjectId:
      "0xafecf4b57899d377cc8c9de75854c68925d9f512d0c47150ca52a0d3a442b735",
    borrowBalanceParentId:
      "0x7568d06a1b6ffc416a36c82791e3daf0e621cf19d4a2724fc6f74842661b6323",
    supplyBalanceParentId:
      "0xa668905b1ad445a3159b4d29b1181c4a62d864861b463dd9106cc0d97ffe8f7f",
    rewardFundId: "",
  },
  CETUS: {
    name: "CETUS",
    assetId: 4,
    poolId:
      "0x3c376f857ec4247b8ee456c1db19e9c74e0154d4876915e54221b5052d5b1e2e",
    type: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    reserveObjectId:
      "0x66a807c06212537fe46aa6719a00e4fa1e85a932d0b53ce7c4b1041983645133",
    borrowBalanceParentId:
      "0x4c3da45ffff6432b4592a39cdb3ce12f4a28034cbcb804bb071facc81fdd923d",
    supplyBalanceParentId:
      "0x6adc72faf2a9a15a583c9fb04f457c6a5f0b456bc9b4832413a131dfd4faddae",
    rewardFundId: "",
  },
  vSui: {
    name: "VoloSui",
    assetId: 5,
    poolId:
      "0x9790c2c272e15b6bf9b341eb531ef16bcc8ed2b20dfda25d060bf47f5dd88d01",
    type: "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    reserveObjectId:
      "0xd4fd7e094af9819b06ea3136c13a6ae8da184016b78cf19773ac26d2095793e2",
    borrowBalanceParentId:
      "0x8fa5eccbca2c4ba9aae3b87fd44aa75aa5f5b41ea2d9be4d5321379384974984",
    supplyBalanceParentId:
      "0xe6457d247b6661b1cac123351998f88f3e724ff6e9ea542127b5dcb3176b3841",
    rewardFundId:
      "0x7093cf7549d5e5b35bfde2177223d1050f71655c7f676a5e610ee70eb4d93b5c",
  },
  haSui: {
    name: "HaedalSui",
    assetId: 6,
    poolId:
      "0x6fd9cb6ebd76bc80340a9443d72ea0ae282ee20e2fd7544f6ffcd2c070d9557a",
    type: "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    reserveObjectId:
      "0x0c9f7a6ca561dc566bd75744bcc71a6af1dc3caf7bd32c099cd640bb5f3bb0e3",
    borrowBalanceParentId:
      "0x01f36898e020be6c3423e5c95d9f348868813cd4d0be39b0c8df9d8de4722b00",
    supplyBalanceParentId:
      "0x278b8e3d09c3548c60c51ed2f8eed281876ea58c392f71b7ff650cc9286d095b",
    rewardFundId: "",
  },
  NAVX: {
    name: "NAVX",
    assetId: 7,
    poolId:
      "0xc0e02e7a245e855dd365422faf76f87d9f5b2148a26d48dda6e8253c3fe9fa60",
    type: "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
    reserveObjectId:
      "0x2e13b2f1f714c0c5fa72264f147ef7632b48ec2501f810c07df3ccb59d6fdc81",
    borrowBalanceParentId:
      "0xa5bf13075aa400cbdd4690a617c5f008e1fae0511dcd4f7121f09817df6c8d8b",
    supplyBalanceParentId:
      "0x59dedca8dc44e8df50b190f8b5fe673098c1273ac6168c0a4addf3613afcdee5",
    rewardFundId:
      "0x1a3f9fcfdfac10e92c99220203f7c4bb502558692f0be0f2cb5f788b4e12a6b5",
  },
  WBTC: {
    name: "WBTC",
    assetId: 8,
    poolId:
      "0xd162cbe40f8829ce71c9b3d3bf3a83859689a79fa220b23d70dc0300b777ae6e",
    type: "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
    reserveObjectId:
      "0x8b4d81f004e4e9faf4540951a896b6d96e42598a270e6375f598b99742db767e",
    borrowBalanceParentId:
      "0x55e1f3c9e6e5cf9fff563bdd61db07a3826458c56ef72c455e049ab3b1b0e99c",
    supplyBalanceParentId:
      "0x821e505a0091b089edba94deaa14c2f2230d026bbaa7b85680554441aad447e0",
    rewardFundId: "",
  },
  AUSD: {
    name: "AUSD",
    assetId: 9,
    poolId:
      "0xc9208c1e75f990b2c814fa3a45f1bf0e85bb78404cfdb2ae6bb97de58bb30932",
    type: "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
    reserveObjectId:
      "0x918889c6a9d9b93108531d4d59a4ebb9cc4d41689798ffc1d4aed6e1ae816ec0",
    borrowBalanceParentId:
      "0x551300b9441c9a3a16ca1d7972c1dbb4715e15004ccd5f001b2c2eee22fd92c1",
    supplyBalanceParentId:
      "0xe151af690355de8be1c0281fbd0d483c099ea51920a57c4bf8c9666fd36808fd",
    rewardFundId: "",
  },
  wUSDC: {
    name: "wUSDC",
    assetId: 1,
    poolId:
      "0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8",
    type: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
    reserveObjectId:
      "0xeb3903f7748ace73429bd52a70fff278aac1725d3b58afa781f25ce3450ac203",
    borrowBalanceParentId:
      "0x8a3aaa817a811131c624658f6e77cba04ab5829293d2c49c1a9cce8ac9c8dec4",
    supplyBalanceParentId:
      "0x8d0a4467806458052d577c8cd2be6031e972f2b8f5f77fce98aa12cd85330da9",
    rewardFundId: "",
  },
  nUSDC: {
    name: "nUSDC",
    assetId: 10,
    poolId:
      "0xa3582097b4c57630046c0c49a88bfc6b202a3ec0a9db5597c31765f7563755a8",
    type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    reserveObjectId:
      "0x4c8a2c72a22ae8da803a8519798d312c86e74a9e0d6ec0eec2bfcf7e4b3fef5e",
    borrowBalanceParentId:
      "0xb0b0c7470e96cabbb4f1e8d06bef2fbea65f4dbac52afae8635d9286b1ea9a09",
    supplyBalanceParentId:
      "0x08b5ce8574ac3bc9327e66ad5decd34d07ee798f724ad01058e8855ac9acb605",
    rewardFundId: "",
  },
  ETH: {
    name: "ETH",
    assetId: 11,
    poolId:
      "0x78ba01c21d8301be15690d3c30dc9f111871e38cfb0b2dd4b70cc6052fba41bb",
    type: "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
    reserveObjectId:
      "0x376faea6dfbffab9ea808474cb751d91222b6d664f38c0f1d23de442a8edb1ce",
    borrowBalanceParentId:
      "0xf0c6ce5cfaee96073876a5fab7426043f3a798b79502c4caeb6d9772cd35af1f",
    supplyBalanceParentId:
      "0xc0a0cb43620eb8a84d5a4a50a85650e7fa7ba81e660f9cc2863404fd84591d4b",
    rewardFundId:
      "0xfb0de07cd39509ecb312464daa9442fac0eb4487d7a9b984cdfc39c1fb7d2791",
  },
  USDY: {
    name: "USDY",
    assetId: 12,
    poolId:
      "0x4b6253a9f8cf7f5d31e6d04aed4046b9e325a1681d34e0eff11a8441525d4563",
    type: "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY",
    reserveObjectId:
      "0xddeb55afe4860995d755fddb0b1dfb8f8011ca08edb66e43c867a21bd6e0551a",
    borrowBalanceParentId:
      "0xc0f59c5665d6289408ba31efc48718daa4d14a291a303a0d50d306e51eb68872",
    supplyBalanceParentId:
      "0x8aac332c01340926066a53f7a5f8ac924e61ea2ae6bc6ce61f112e9094fd5639",
    rewardFundId: "",
  },
  NS: {
    name: "NS",
    assetId: 13,
    poolId:
      "0x2fcc6245f72795fad50f17c20583f8c6e81426ab69d7d3590420571364d080d4",
    type: "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
    reserveObjectId:
      "0x03f405f4d5ed2688b8b7ab4cfbf3e0a8572622a737d615db829342131f3586f2",
    borrowBalanceParentId:
      "0x2c7b7e6d323ca8f63908bb03191225a2ecf177bf0c4602ccd21d7ac121d52fa4",
    supplyBalanceParentId:
      "0x071dc718b1e579d476d088456979e30d142ecdde6a6eec875477b5b4786530f0",
    rewardFundId:
      "0xc6b14b4eda9015ca69ec5f6a9688faa4f760259ce285dafe902ebe6700f5838f",
  },
  LorenzoBTC: {
    name: "stBTC",
    assetId: 14,
    poolId:
      "0xd96dcd6982c45e580c83ff1d96c2b4455a874c284b637daf67c0787f25bc32dd",
    type: "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN",
    reserveObjectId:
      "0x9634f9f7f8ea7236e2ad5bfbecdce9673c811a34cf8c3741edfbcaf5d9409100",
    borrowBalanceParentId:
      "0xb5cac1b39f67da86f4496f75339001a12f4b8ba78b047682f5158ac4ae8e1649",
    supplyBalanceParentId:
      "0xad0d8be450e020f54e3212b5b1f4f1256bb8ea882bc85bc9f86708f73d653720",
    rewardFundId: "",
  },
  DEEP: {
    name: "DEEP",
    assetId: 15,
    poolId:
      "0x08373c5efffd07f88eace1c76abe4777489d9ec044fd4cd567f982d9c169e946",
    type: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    reserveObjectId:
      "0x0b30fe8f42a4fda168c38d734e42a36a77b3d4dd6669069b1cbe53a0c3905ba8",
    borrowBalanceParentId:
      "0xba03bb3e0167e1ec355926dfe0c130866857b062b93fb5d9cfba20824ad9f1d5",
    supplyBalanceParentId:
      "0x3fdd91f32dcea2af6e16ae66a7220f6439530ef6238deafe5a72026b3e7aa5f5",
    rewardFundId:
      "0xc889d78b634f954979e80e622a2ae0fece824c0f6d9590044378a2563035f32f",
  },
  FDUSD: {
    name: "FDUSD",
    assetId: 16,
    poolId:
      "0x38d8ac76efc14035bbc8c8b38803f5bd012a0f117d9a0bad2103f8b2c6675b66",
    type: "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD",
    reserveObjectId:
      "0xf1737d6c6c1fffdf145c440a9fc676de0e6d0ffbacaab5fa002d30653f235a8e",
    borrowBalanceParentId:
      "0x4a4bb401f011c104083f56e3ee154266f1a88cad10b8acc9c993d4da304ebf00",
    supplyBalanceParentId:
      "0x6dffc3d05e79b055749eae1c27e93a47b5a9999214ce8a2f6173574151d120bf",
    rewardFundId:
      "0x958dd7ad70755b10f96693bcd591d7a2cb9830a6c523baf43b3b5897664aa788",
  },
  BLUE: {
    name: "BLUE",
    assetId: 17,
    poolId:
      "0xe2cfd1807f5b44b44d7cabff5376099e76c5f0e4b35a01bdc4b0ef465a23e32c",
    type: "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
    reserveObjectId:
      "0xcc993cdfc8fcf421115bb4b2c2247abbfecff35bcab777bb368b4b829d39b073",
    borrowBalanceParentId:
      "0x897b75f0e55b9cfaae65e818d02ebefa5c91d4cf581f9c7c86d6e39749c87020",
    supplyBalanceParentId:
      "0xc12b3d04d566fb418a199a113c09c65c121fd878172084ec0c60e08def51726f",
    rewardFundId: "",
  },
  BUCK: {
    name: "BUCK",
    assetId: 18,
    poolId:
      "0x98953e1c8af4af0cd8f59a52f9df6e60c9790b8143f556751f10949b40c76c50",
    type: "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
    reserveObjectId:
      "0xe1182350b6756e664f824aa1448f5fc741ddc868168dbe09ed3a6e79b7bf249c",
    borrowBalanceParentId:
      "0x6ae3645ff5936c10ab98c2529d3a316b0d4b22eff46d0d262e27db41371af597",
    supplyBalanceParentId:
      "0xdcd4fd6c686eebb54b1816e9851183647a306817303d306bbf70f82757f3eff9",
    rewardFundId: "",
  },
  suiUSDT: {
    name: "suiUSDT",
    assetId: 19,
    poolId:
      "0xa3e0471746e5d35043801bce247d3b3784cc74329d39f7ed665446ddcf22a9e2",
    type: "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
    reserveObjectId:
      "0x2abb6f2b007fef1e59133b027f53eca568f3af79e310e6f16d4b37bc09664a50",
    borrowBalanceParentId:
      "0x2ad9fe604fb74c1acfe646fe79fc27acf7b62cf4e7d0c6cbb23f6d440ce79306",
    supplyBalanceParentId:
      "0xe0399b39ca6127a879071371aff22ca98d8e7f24872afa8435a12e2a77c00e15",
    rewardFundId: "",
  },
  stSUI: {
    name: "stSUI",
    assetId: 20,
    poolId:
      "0x0bccd5189d311002f4e10dc98270a3362fb3f7f9d48164cf40828f6c09f351e2",
    type: "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
    reserveObjectId:
      "0x9a91a751ff83ef1eb940066a60900d479cbd39c6eaccdd203632c97dedd10ce9",
    borrowBalanceParentId:
      "0x67bbcb4d8ef039883c568fe74016ba85839d14f158d9926d68cf930a4d16b169",
    supplyBalanceParentId:
      "0xfa30b3db35ee961f702f259ea42fb9c5524dce630187e3a7e0b0e24eb0187fef",
    rewardFundId:
      "0x65a952a1f239c48d8c6fc80de1d3bb248ce6905d1c3897c2ef52948fc7df3616",
  },
  suiBTC: {
    name: "suiBTC",
    assetId: 21,
    poolId:
      "0x348f4049063e6c4c860064d67a170a7b3de033db9d67545d98fa5da3999966bc",
    type: "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC",
    reserveObjectId:
      "0xb6a8441d447dd5b7cd45ef874728a700cd05366c331f9cc1e37a4665f0929c2b",
    borrowBalanceParentId:
      "0x33d8a4cb800c863f19ae27fc173e1eb5895cdbcea7ae302b756fb275c678dc72",
    supplyBalanceParentId:
      "0xf99e9bbd4c2b5dee460abeddc0f96042f2fb51420cb634d5a378d5d7643dd189",
    rewardFundId: "",
  },
  WSOL: {
    name: "WSOL",
    assetId: 22,
    poolId:
      "0xac5f6d750063244cc5abceef712b7ea1aa377f73762099b31c0051a842c13b10",
    type: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
    reserveObjectId:
      "0x2e2f8b1c34b23b1db894e08a87adda35b387a289fe644ca479fc4f7ec9065c8e",
    borrowBalanceParentId:
      "0x9bb2749aa677392295d0951fe72440884f286e3db069506916004b30a08f3a04",
    supplyBalanceParentId:
      "0xca1ec4793c0d1ec3ab58fbb5ccb2366c962dc5b903ff9ce809c6384c6e07aeb6",
    rewardFundId: "",
  },
  LBTC: {
    name: "LBTC",
    assetId: 23,
    poolId:
      "0x377b8322c0d349b44b5873d418192eefe871b9372bb3a86f288cafe97317de04",
    type: "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC",
    reserveObjectId:
      "0x1acee7192fe5dd422ee6e0376417f80a709172d67cec1bf0e660666eee6eb627",
    borrowBalanceParentId:
      "0x81b4063de499c8fba76523fde33b3dc4579047e7b815ffbf2f1eb82510314daa",
    supplyBalanceParentId:
      "0x71b90679af894cd5f0fdefee87a228e4bdacc8a1ad444e39011476208a1eb9d4",
    rewardFundId: "",
  },
  WAL: {
    name: "WAL",
    assetId: 24,
    poolId:
      "0xef76883525f5c2ff90cd97732940dbbdba0b391e29de839b10588cee8e4fe167",
    type: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
    reserveObjectId:
      "0xe6824edab84affecc78646e87fe85ca8fd4374335680e9daee2c981f13dce202",
    borrowBalanceParentId:
      "0xf8741f2550b0d7f7a3179ba2a0363c73e206ca6691d2d1ebbb95b6018359e17b",
    supplyBalanceParentId:
      "0xa476b12f8b45c7cb595cf1648822d48e4e82d63a47ba94304f3ad3bb19247ff9",
    rewardFundId:
      "0xe65f2d9ea46cd8d44a08ec9b7728173a3b9383c7346c496eb88543574db1db51",
  },
  HAEDAL: {
    name: "HAEDAL",
    assetId: 25,
    poolId:
      "0x930f5cf61dcb66d699ba57b2eb72da6fd04c64a53073cc40f751ef12c77aaa6a",
    type: "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL",
    reserveObjectId:
      "0x09c7b740981a2aa81b407e83d052a46cf1830c7470f80d053e6a49715eb29876",
    borrowBalanceParentId:
      "0x1b16a14873c5dfdf3b3a81be095420c67225a922ace939feaf66b18c20f39569",
    supplyBalanceParentId:
      "0xf761d46deb8df8114b2e39f364716644dc84c8f2e8a82a011b899be45427bac0",
    rewardFundId:
      "0xa1d5ba382609b8cb209f3be8003f73b16fd58b17b5af007c01206eaaa27ad0df",
  },
  XBTC: {
    name: "XBTC",
    assetId: 26,
    poolId:
      "0xd9c9a1d8a2f82d752d4f2504c1097636bbe7f0f335a89be85f65fb32dc6b1866",
    type: "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC",
    reserveObjectId:
      "0x9a1a0533b157361a5cc42ed64fdee6970ab66eb4731afa6dde8e7fe27a36d24d",
    borrowBalanceParentId:
      "0x14f4702a6ea138b83531a640c3fa953d3e723075beb687c4db3309d067fa9792",
    supplyBalanceParentId:
      "0xdeec1fb37d7ea634bd329f9e02d2d564956f778a490f1d47a899865266d086cd",
    rewardFundId: "",
  },
  IKA: {
    name: "IKA",
    assetId: 27,
    poolId:
      "0x3566577feaba2f24b9e0b315a10f1afe04e7d275c2da6f28caeba095d00dee8d",
    type: "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
    reserveObjectId:
      "0x96e0827599a28f7eadeaa5165a67c4a5414d21f55070c61b5b66583b2a845d6d",
    borrowBalanceParentId:
      "0xd7dcdf9305157638569b030e127392834d73a79ce0f64c51866a864cb7f11247",
    supplyBalanceParentId:
      "0x424143c7ddf4080f4f9e8eb3bcc9a6ebed10c8a3f3b99d2d32fd495067f593be",
    rewardFundId:
      "0xd378384c3a93869cac01098b045dc5d9bdbe254cb0562644db473daf2090f3df",
  },
  EnzoBTC: {
    name: "EnzoBTC",
    assetId: 28,
    poolId:
      "0x35017707dfbacfc79e9cbd9d36bd7df02be9fc7fe8ad5765b20517a6971616d2",
    type: "0x8f2b5eb696ed88b71fea398d330bccfa52f6e2a5a8e1ac6180fcb25c6de42ebc::coin::COIN",
    reserveObjectId:
      "0xe10cb3da49d69a525d1dc5e6c203f09050cbecf2e36af6d7da10f954fc8cf0d5",
    borrowBalanceParentId:
      "0xc2b07a060e3549331d236e53c0fe0c94088e7967e58a4380f279feb9d880653e",
    supplyBalanceParentId:
      "0x1e0f6b432e96428c97cca7bea1af8c0c67e143456525d0224b257f724372793c",
    rewardFundId: "",
  },
  MBTC: {
    name: "MBTC",
    assetId: 29,
    poolId:
      "0x1cea8c1275b3ec9d61faaf2d5bde53c0a5c8a7f939a68f7cf5ad4b9ed38b8e78",
    type: "0xd1a91b46bd6d966b62686263609074ad16cfdffc63c31a4775870a2d54d20c6b::mbtc::MBTC",
    reserveObjectId:
      "0x17665e447178ba70dd291a6b24812c0c718dc008d4bc135b1f745c6b19197156",
    borrowBalanceParentId:
      "0xaa3bc8cf77c8b5343d31df359bdb335f08b2737ec21d85b6524a37d91a01c3bf",
    supplyBalanceParentId:
      "0xc2f93d7280de7ed2fc88e59dfe271ffe696a44e6600b82be728e015a75727943",
    rewardFundId: "",
  },
  YBTC: {
    name: "YBTC",
    assetId: 30,
    poolId:
      "0xadc7f434a042018d41d08c9e9efc851a6fcaeb779273755d47a5029f056206ef",
    type: "0xa03ab7eee2c8e97111977b77374eaf6324ba617e7027382228350db08469189e::ybtc::YBTC",
    reserveObjectId:
      "0x052727f47790aff100bdd3e53aa5dbfd1c55ab632713021e7ad4722dc91d8474",
    borrowBalanceParentId:
      "0x73fd2ced34429783b9cba6457fde8f8608a2f7310515cd14295f54febbcd44c2",
    supplyBalanceParentId:
      "0xf12fa3cd399500713ace89e6154647cda48687fec3774c44b2552b9de0b4be1c",
    rewardFundId: "",
  },
  XAUM: {
    name: "XAUM",
    assetId: 31,
    poolId:
      "0x33b2924f2b7e12112a134ad69d9f2b3565c316b0a756e328abe9914c8deca034",
    type: "0x9d297676e7a4b771ab023291377b2adfaa4938fb9080b8d12430e4b108b836a9::xaum::XAUM",
    reserveObjectId:
      "0x520aaee2b1b1172ef23e66cdca01dc35acd44a2e2ee293843ea4a4511f3f7110",
    borrowBalanceParentId:
      "0xbc41da647d04a24e7faa5a46be036caca1c746708a75718e44f0fbf241d42a9c",
    supplyBalanceParentId:
      "0x79b6e696058bd666e536d43f810c012172c8968fea5e4332dd416a495574adf5",
    rewardFundId: "",
  },
};

export const flashloanConfig = {
  id: "0x3672b2bf471a60c30a03325f104f92fb195c9d337ba58072dce764fe2aa5e2dc",
};

export const NAVX: CoinInfo = {
  symbol: "NAVX",
  address:
    "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
  decimal: 9,
};

export const Sui: CoinInfo = {
  symbol: "Sui",
  address: "0x2::sui::SUI",
  decimal: 9,
};

export const vSui: CoinInfo = {
  symbol: "vSui",
  address:
    "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
  decimal: 9,
};

export const USDT: CoinInfo = {
  symbol: "USDT",
  address:
    "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
  decimal: 6,
};

export const WETH: CoinInfo = {
  symbol: "WETH",
  address:
    "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
  decimal: 8,
};

export const CETUS: CoinInfo = {
  symbol: "CETUS",
  address:
    "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
  decimal: 9,
};

export const haSui: CoinInfo = {
  symbol: "haSui",
  address:
    "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
  decimal: 9,
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

export const wUSDC: CoinInfo = {
  symbol: "wUSDC",
  address:
    "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
  decimal: 6,
};

export const nUSDC: CoinInfo = {
  symbol: "nUSDC",
  address:
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  decimal: 6,
};

export const ETH: CoinInfo = {
  symbol: "ETH",
  address:
    "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
  decimal: 8,
};

export const USDY: CoinInfo = {
  symbol: "USDY",
  address:
    "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY",
  decimal: 6,
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

export const FDUSD: CoinInfo = {
  symbol: "FDUSD",
  address:
    "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD",
  decimal: 6,
};

export const BLUE: CoinInfo = {
  symbol: "BLUE",
  address:
    "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
  decimal: 9,
};

export const BUCK: CoinInfo = {
  symbol: "BUCK",
  address:
    "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
  decimal: 9,
};

export const suiUSDT: CoinInfo = {
  symbol: "suiUSDT",
  address:
    "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
  decimal: 6,
};

export const stSUI: CoinInfo = {
  symbol: "stSUI",
  address:
    "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
  decimal: 9,
};

export const suiBTC: CoinInfo = {
  symbol: "suiBTC",
  address:
    "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC",
  decimal: 8,
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
    "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
  decimal: 9,
};

export const HAEDAL: CoinInfo = {
  symbol: "HAEDAL",
  address:
    "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL",
  decimal: 9,
};

export const XBTC: CoinInfo = {
  symbol: "XBTC",
  address:
    "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC",
  decimal: 8,
};

export const IKA: CoinInfo = {
  symbol: "IKA",
  address:
    "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
  decimal: 9,
};

export const EnzoBTC: CoinInfo = {
  symbol: "EnzoBTC",
  address:
    "0x8f2b5eb696ed88b71fea398d330bccfa52f6e2a5a8e1ac6180fcb25c6de42ebc::coin::COIN",
  decimal: 8,
};

export const MBTC: CoinInfo = {
  symbol: "MBTC",
  address:
    "0xd1a91b46bd6d966b62686263609074ad16cfdffc63c31a4775870a2d54d20c6b::mbtc::MBTC",
  decimal: 8,
};

export const SpringSui: CoinInfo = {
  symbol: "sSui",
  address:
    "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI",
  decimal: 9,
};

export const YBTC: CoinInfo = {
  symbol: "YBTC",
  address:
    "0xa03ab7eee2c8e97111977b77374eaf6324ba617e7027382228350db08469189e::ybtc::YBTC",
  decimal: 8,
};

export const XAUM: CoinInfo = {
  symbol: "XAUM",
  address:
    "0x9d297676e7a4b771ab023291377b2adfaa4938fb9080b8d12430e4b108b836a9::xaum::XAUM",
  decimal: 9,
};

export const vSuiConfig = {
  ProtocolPackage:
    "0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20",
  pool: "0x2d914e23d82fedef1b5f56a32d5c64bdcc3087ccfea2b4d6ea51a71f587840e5",
  metadata:
    "0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60",
  wrapper: "0x05",
};

export const springSuiConfig = {
  id: "0x15eda7330c8f99c30e430b4d82fd7ab2af3ead4ae17046fcb224aa9bad394f6b",
  publishAt:
    "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7",
  type: "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI",
  weightHookId:
    "0xbbafcb2d7399c0846f8185da3f273ad5b26b3b35993050affa44cfa890f1f144",
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
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
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
      "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
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
      "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
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
  CETUS: {
    oracleId: 4,
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
  CERT: {
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
  NAVX: {
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
  WBTC: {
    oracleId: 8,
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
  NUSDC: {
    oracleId: 10,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 80, // x1: 0.8% = 0.008 * 10000 = 80
    priceDiffThreshold2: 150, // x2: 1.5% = 0.015 * 10000 = 150
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 2000000, // 2 = 2 * 1e6 = 2000000
    minimumEffectivePrice: 100000, // 0.1 = 0.1 * 1e6 = 100000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    feedId:
      "0xe120611435395f144b4bcc4466a00b6b26d7a27318f96e148648852a9dd6b31c", // TODO: value
    supraPairId: 47, // USDC_USDT -> 47, https://supra.com/docs/data-feeds/data-feeds-index/#:~:text=Supra%20Standard-,USDC_USDT,-47
    pythPriceFeedId:
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", // **fixed value: Crypto.USDC/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x5dec622733a204ca27f5a90d8c2fad453cc6665186fd5dff13a83d0b6c9027ab",
    priceDecimal: 6,
    expiration: 30,
  },
  ETH: {
    oracleId: 11,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 600000000000, // 6000 = 6000 * 1e8 = 600000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
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
  USDY: {
    oracleId: 12,
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
  NS: {
    oracleId: 13,
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
    oracleId: 14,
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
    oracleId: 15,
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
  FDUSD: {
    oracleId: 16,
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
  BLUE: {
    oracleId: 17,
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
  BUCK: {
    oracleId: 18,
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
  SUIUSDT: {
    oracleId: 19,
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
  STSUI: {
    oracleId: 20,
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
  SUIBTC: {
    oracleId: 21,
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
    oracleId: 22,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 100000000000, // 1000 * 1e8 = 100000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
    feedId:
      "0x2611dff736233a6855e28ae95f8e5f62a6bf80653ddb118bf012fd783d530fa1",
    supraPairId: 10, // SOL_USDT -> 10
    pythPriceFeedId:
      "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // **fixed value: Crypto.SOL/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x9d0d275efbd37d8a8855f6f2c761fa5983293dd8ce202ee5196626de8fcd4469",
    priceDecimal: 8,
    expiration: 30,
  },
  LBTC: {
    oracleId: 23,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 20000000000000, // 200000 = 200000 * 1e8 = 20000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC",
    feedId:
      "0x8ee4d9d61d0bfa342cdb3ee8b7f047c91f0b586e0ff66fd6e8fc761e235e5409", // TODO: value
    supraPairId: 99999, // none
    pythPriceFeedId:
      "0x8f257aab6e7698bb92b15511915e593d6f8eae914452f781874754b03d0c612b", // Crypto.LBTC/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0xeba15840ddf425dacb5ff0990334fc03d034487f4ad416280859b96bf2af89f8",
    priceDecimal: 8,
    expiration: 30,
  },
  WAL: {
    oracleId: 24,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 100,
    priceDiffThreshold2: 300,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 10000000000, // 10 * 1e9 = 10000000000
    minimumEffectivePrice: 1000000, // 0.001 * 1e9 = 1000000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL", // Mainnet verison
    feedId:
      "0x924bf9f715d857605f9f4146537fffc0414809c85845ce9d695f3645a22a5426", // TODO: value
    supraPairId: 99999, // none
    pythPriceFeedId:
      "0xeba0732395fae9dec4bae12e52760b35fc1c5671e2da8b449c9af4efe5d54341", // Crypto.WAL/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0xeb7e669f74d976c0b99b6ef9801e3a77716a95f1a15754e0f1399ce3fb60973d",
    priceDecimal: 9,
    expiration: 30,
  },
  HAEDAL: {
    oracleId: 25,
    maxTimestampDiff: 30000, // 30s(millisecond)
    priceDiffThreshold1: 100,
    priceDiffThreshold2: 300,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 10000000000, // 10 * 1e9 = 10000000000
    minimumEffectivePrice: 1000000, // 0.001 * 1e9 = 1000000
    historicalPriceTTL: 300000, // 5min(millisecond)
    coinType:
      "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL", //
    feedId:
      "0xe8a90eed4e6de66e114e6d00802852a9529054a33de0e8460ec37109f0d09d5e", // TODO: value
    supraPairId: 99999, // none
    pythPriceFeedId:
      "0xe67d98cc1fbd94f569d5ba6c3c3c759eb3ffc5d2b28e64538a53ae13efad8fd1", // **fixed value: Crypto.SUI/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0xbc98681c15de1ca1b80a8e26500d43c77f7113368b024de1bf490afcb0387109",
    priceDecimal: 9,
    expiration: 30,
  },
  XBTC: {
    oracleId: 26,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 50000000000000, // 500000 = 500000 * 1e8 = 50000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 5 * 60 * 1000, // 5min(millisecond)
    coinType:
      "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC",
    feedId:
      "0xbe3a049bbbdc596cc6109fcff0bc2c968e7533bcc675e5718f7ecdf3c5dae506", // TODO: value
    supraPairId: 0,
    pythPriceFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    pythPriceInfoObject:
      "0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2",
    priceDecimal: 8,
    expiration: 30,
  },
  IKA: {
    oracleId: 27,
    maxTimestampDiff: 30 * 1000, // 30s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 4000, // 40% = 0.4 * 10000 = 4000
    maximumEffectivePrice: 2000000000, // 2 = 2 * 1e9 = 2000000000
    minimumEffectivePrice: 10000000, // 0.01 = 0.01 * 1e9 = 10000000
    historicalPriceTTL: 2 * 60 * 1000, // 2min(millisecond)
    coinType:
      "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
    feedId:
      "0xebe4e84fd1b1e28622274640c1bce7f4d79f43e95c6f54bec3880781b88a0d92", // TODO: value
    supraPairId: 99999, // none
    pythPriceFeedId:
      "0x2b529621fa6e2c8429f623ba705572aa64175d7768365ef829df6a12c9f365f4", // **fixed value: Crypto.USDC/USD -> https://pyth.network/developers/price-feed-ids
    pythPriceInfoObject:
      "0x06c6b9e6eb87da329189e713b7fb319cc7990cf5abf192862a443f939eedc43b",
    priceDecimal: 9,
    expiration: 30,
  },
  EnzoBTC: {
    oracleId: 28,
    maxTimestampDiff: 60 * 1000, // 60s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 50000000000000, // 500000 = 500000 * 1e8 = 50000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 2 * 60 * 1000, // 2min(millisecond)
    coinType:
      "0x8f2b5eb696ed88b71fea398d330bccfa52f6e2a5a8e1ac6180fcb25c6de42ebc::coin::COIN",
    feedId:
      "0xc7f87ba22d24e8ce5764f05f775c10f87fc04e2a411c6ad7922fc936e8f7b8e3", // TODO: value
    supraPairId: 99999,
    pythPriceFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    pythPriceInfoObject:
      "0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2",
    priceDecimal: 8,
    expiration: 60,
  },
  MBTC: {
    oracleId: 29,
    maxTimestampDiff: 60 * 1000, // 60s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 50000000000000, // 500000 = 500000 * 1e8 = 50000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 2 * 60 * 1000, // 2min(millisecond)
    coinType:
      "0xd1a91b46bd6d966b62686263609074ad16cfdffc63c31a4775870a2d54d20c6b::mbtc::MBTC",
    feedId:
      "0x1d7e07f8fcc6a51d55d69f425cdc84c23807aeac6516dc5d909fe537d7c6eeb1", // TODO: value
    supraPairId: 99999,
    pythPriceFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    pythPriceInfoObject:
      "0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2",
    priceDecimal: 8,
    expiration: 60,
  },
  YBTC: {
    oracleId: 30,
    maxTimestampDiff: 60 * 1000, // 60s(millisecond)
    priceDiffThreshold1: 100, // x1: 1% = 0.01 * 10000 = 100
    priceDiffThreshold2: 300, // x2: 3% = 0.03 * 10000 = 300
    maxDurationWithinThresholds: 30 * 1000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 700, // 7% = 0.07 * 10000 = 700
    maximumEffectivePrice: 50000000000000, // 500000 = 500000 * 1e8 = 50000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e8 = 100000000
    historicalPriceTTL: 2 * 60 * 1000, // 2min(millisecond)
    coinType:
      "0xa03ab7eee2c8e97111977b77374eaf6324ba617e7027382228350db08469189e::ybtc::YBTC",
    feedId:
      "0x9efc82d7786261800fa78fa347e1b39bf3d3808e4a3e192fb3677fa78a324928", // TODO: value
    supraPairId: 99999,
    pythPriceFeedId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    pythPriceInfoObject:
      "0x9a62b4863bdeaabdc9500fce769cf7e72d5585eeb28a6d26e4cafadc13f76ab2",
    priceDecimal: 8,
    expiration: 60,
  },
  XAUM: {
    oracleId: 31,
    maxTimestampDiff: 60 * 1000, // 60s(millisecond)
    priceDiffThreshold1: 200,
    priceDiffThreshold2: 400,
    maxDurationWithinThresholds: 30000, // 30s(millisecond)
    maximumAllowedSpanPercentage: 3000, // 30% = 0.3 * 10000 = 3000
    maximumEffectivePrice: 50000000000000, // 500000 = 500000 * 1e9 = 500000000000000
    minimumEffectivePrice: 100000000, // 1 = 1 * 1e9 = 1000000000
    historicalPriceTTL: 2 * 60 * 1000, // 2min(millisecond)
    coinType:
      "0x9d297676e7a4b771ab023291377b2adfaa4938fb9080b8d12430e4b108b836a9::xaum::XAUM",
    feedId:
      "0x5fc8ae7618a0c1551d0e5f5879d144ae5862a070f6a87c6c21c18dae3cb0645b",
    supraPairId: 99999,
    pythPriceFeedId:
      "0xd7db067954e28f51a96fd50c6d51775094025ced2d60af61ec9803e553471c88",
    pythPriceInfoObject:
      "0x2731a8e3e9bc69b2d6af6f4c032fcd4856c77e2c21f839134d1ebcc3a16e4b1b",
    priceDecimal: 9,
    expiration: 60,
  },
};

export interface IOracleProConfig {
  PackageId: string;
  PriceOracle: string;
  OracleAdminCap: string;

  OracleConfig: string;

  PythStateId: string;
  WormholeStateId: string;
  SupraOracleHolder: string;
  Sender: string;
  GasObject: string;
}

export const OracleProConfig: IOracleProConfig = {
  PackageId:
    "0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83", // TODO: value
  PriceOracle:
    "0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef", // TODO: value
  OracleAdminCap:
    "0x7204e37882baf10f31b66cd1ac78ac65b3b8ad29c265d1e474fb4b24ccd6d5b7", // TODO: value

  OracleConfig:
    "0x1afe1cb83634f581606cc73c4487ddd8cc39a944b951283af23f7d69d5589478", // TODO: value

  PythStateId:
    "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8", // **fixed value
  WormholeStateId:
    "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c", // **fixed value
  SupraOracleHolder:
    "0xaa0315f0748c1f24ddb2b45f7939cff40f7a8104af5ccbc4a1d32f870c0b4105", // **fixed value

  Sender: "0x39c70d4ce3ce769a46f46ad80184a88bc25be9b49545751f5425796ef0c3d9ba", // TODO: value
  GasObject:
    "0x1e30410559ed83708ee1bb6b21e3a1dae96f1768ce35ed8233590b130ddc0086", // TODO: value
};

export const ProFundsPoolInfo: Record<
  string,
  { coinType: string; oracleId: number }
> = {
  f975bc2d4cca10e3ace8887e20afd77b46c383b4465eac694c4688344955dea4: {
    coinType: "0x2::sui::SUI",
    oracleId: 0,
  },
  e2b5ada45273676e0da8ae10f8fe079a7cec3d0f59187d3d20b1549c275b07ea: {
    coinType:
      "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    oracleId: 5,
  },
  a20e18085ce04be8aa722fbe85423f1ad6b1ae3b1be81ffac00a30f1d6d6ab51: {
    coinType:
      "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    oracleId: 6,
  },
  "9dae0cf104a193217904f88a48ce2cf0221e8cd9073878edd05101d6b771fa09": {
    coinType:
      "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
    oracleId: 7,
  },
  bc14736bbe4ac59a4e3af6835a98765c15c5f7dbf9e7ba9b36679ce7ff00dc19: {
    coinType:
      "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
    oracleId: 13,
  },
  "8e25210077ab957b1afec39cbe9165125c93d279daef89ee29b97856385a3f3e": {
    coinType:
      "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    oracleId: 15,
  },
  "141c67c566de590788ff04f2bcc26e68798304254f6595df93a824b0f6acee2a": {
    coinType:
      "f16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD",
    oracleId: 16,
  },
  "523a53e4469fc1fe17791c2c5710e6582145bd50543b9fee9dafcc9aa0c0ef8e": {
    coinType:
      "e1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
    oracleId: 17,
  },
  "463d80f40fc4ac625479938925594ccf1c89146f28ec8489c056879167448224": {
    coinType:
      "d1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
    oracleId: 20,
  },
};
export const noDepositCoinType = [
  "0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdt::USDT",
  "0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::weth::WETH",
  "0x0eedc3857f39f5e44b5786ebcd790317902ffca9960f44fcea5b7589cfc7a784::usdc::USDC",
];
