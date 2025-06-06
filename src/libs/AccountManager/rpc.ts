import axios from "axios";
import {
  type SuiTransport,
  type SuiTransportRequestOptions,
} from "@mysten/sui/client";
import { SuiClient } from "@mysten/sui/client";

const instance = axios.create({
  timeout: 20000,
});

instance.interceptors.response.use(
  function (response) {
    if (response.data.err) {
      throw new Error(response.data.err);
    }
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    return response;
  },
  function (error) {
    return Promise.reject(error);
  }
);

export class NAVIHttpTransport implements SuiTransport {
  requestId = 0;
  rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  async request<T>(input: SuiTransportRequestOptions): Promise<T> {
    this.requestId += 1;
    const res = await instance.post(this.rpcUrl, {
      jsonrpc: "2.0",
      id: this.requestId,
      method: input.method,
      params: input.params,
    });

    return res.data.result;
  }

  async subscribe<T>(): Promise<() => Promise<boolean>> {
    throw new Error("subscribe not implemented.");
  }
}
