import axios from "axios";

export const BridgeConfig = {
  baseUrl: "https://open-aggregator-api.naviprotocol.io",
  apiKey: "",
};

export const apiInstance = axios.create({
  baseURL: BridgeConfig.baseUrl,
  timeout: 30000,
});

export function config(newConfig: Partial<typeof BridgeConfig>) {
  Object.assign(BridgeConfig, newConfig);
  apiInstance.defaults.baseURL = BridgeConfig.baseUrl;
  if (BridgeConfig.apiKey) {
    apiInstance.defaults.headers.common["x-navi-token"] = BridgeConfig.apiKey;
  } else {
    delete apiInstance.defaults.headers.common["x-navi-token"];
  }
}
