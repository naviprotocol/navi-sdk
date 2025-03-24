export const AggregatorConfig = {
  aggregatorBaseUrl: "https://open-aggregator-api.naviprotocol.io/find_routes",
  aggregatorContract:
    "0x5b7d732adeb3140a2dbf2becd1e9dbe56cee0e3687379bcfe7df4357ea664313",
  cetusPackageId:
    "0xc6faf3703b0e8ba9ed06b7851134bbbe7565eb35ff823fd78432baa4cbeaa12e",
  cetusConfigId:
    "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f",
  turbosPackageId:
    "0x9df4666296ee324a6f11e9f664e35e7fd6b6e8c9e9058ce6ee9ad5c5343c2f87",
  kriyaV3Version:
    "0xf5145a7ac345ca8736cf8c76047d00d6d378f30e81be6f6eb557184d9de93c78",
  kriyaV3PackageId:
    "0xbd8d4489782042c6fafad4de4bc6a5e0b84a43c6c00647ffd7062d1e2bb7549e",
  kriyaV2PackageId:
    "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66",
  clockAddress: "0x6",
  aftermathPackageId:
    "0xc4049b2d1cc0f6e017fda8260e4377cecd236bd7f56a54fee120816e72e2e0dd",
  aftermathPoolRegistry:
    "0xfcc774493db2c45c79f688f88d28023a3e7d98e4ee9f48bbf5c7990f651577ae",
  aftermathFeeVault:
    "0xf194d9b1bcad972e45a7dd67dd49b3ee1e3357a00a50850c52cd51bb450e13b4",
  aftermathTreasury:
    "0x28e499dff5e864a2eafe476269a4f5035f1c16f338da7be18b103499abf271ce",
  aftermathInsuranceFund:
    "0xf0c40d67b078000e18032334c3325c47b9ec9f3d9ae4128be820d54663d14e3b",
  aftermathReferralVault:
    "0x35d35b0e5b177593d8c3a801462485572fc30861e6ce96a55af6dc4730709278",
  deepbookPackageId:
    "0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809",
  deepSponsoredPackageId:
    "0x5871cfe2f6a5e432caea0a894aa51fc423fba798dfed540859abdf17ecc61219",
  deepSponsoredPoolConfig:
    "0x0b5e88bb54746b94bc5c7912f279cba30e0c4bd0241b935ba1d0d0c032218b6f",
  deepTokenAddress:
    "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
  bluefinPackageId:
    "0x6c796c3ab3421a68158e0df18e4657b2827b1f8fed5ed4b82dba9c935988711b",
  bluefinGlobalConfig:
    "0x03db251ba509a8d5d8777b6338836082335d93eecbdd09a11e190a1cff51c352",
  vSuiPackageId:
    "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55",
  haSuiPackageId:
    "0x3f45767c1aa95b25422f675800f02d8a813ec793a00b60667d071a77ba7178a2",
  haSuiConfigId:
    "0x47b224762220393057ebf4f70501b6e657c3e56684737568439a04f80849b2ca",
  magmaPackageId:
    "0x2e704d8afc1d6d7f154dee337cc14c153f6f9ce1708213e5dc04a32afe0e45f1",
  magmaConfigId:
    "0x4c4e1402401f72c7d8533d0ed8d5f8949da363c7a3319ccef261ffe153d32f8a",
};

export function updateConfig(newConfig: Partial<typeof AggregatorConfig>) {
  Object.assign(AggregatorConfig, newConfig);
}
