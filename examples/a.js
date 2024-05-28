"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const naviSDK_1 = require("../src/naviSDK");
const address_1 = require("../src/address");
const PoolInfo_1 = require("../src/libs/PoolInfo");
const accountKey = "track taste embark ill tag link design peanut asthma tip thrive language";
const customizedRPC = "https://enterprise.onerpc.com/sui?apikey=oOtbRO6J3wZpnwhHvRQicUbwleYvREfg";
const client = new naviSDK_1.NAVISDKClient({ mnemonic: accountKey, networkType: customizedRPC });
const account = client.accounts[0];
const sender = account.address;
const receiver = "0x9f4c3feee7b70d6cf2d0c25296c4581bd4c281b11f45910c94bb8a962db0349d";
console.log(`use address: `, account.address);
// account.sendCoinToMany(USDC, [receiver, receiver, receiver], [1e5, 1e5, 1e5]);
// client.getReserveDetail(Sui).then((poolInfo) => {
//     console.log(poolInfo);
// });
// client.getAllBalances().then((balances) => {
//     console.log(balances);
// });
// account.unstakeSuiFromVoloSui()
// account.getCoins(vSui).then((coins) => {
//     console.log(coins.data.);
// });
// const allPortfolio = client.getAllNaviPortfolios();
// allPortfolio.then((res) => {
//     console.log(res);
// })
// account.getNAVIPortfolio("0x4066297a6d54cf423ef09e05cf13ba29faba01de16d7b66ea60cc4c16893109a").then((res) => {
//     console.log(res);
// });
// client.getPoolInfo(Sui).then((res) => {
//     console.log(res);
// });
// client.getReserveDetail(Sui).then((res) => {
//     console.log(res);
// });
(0, PoolInfo_1.getPoolInfo)(address_1.Sui).then((res) => {
    console.log(res);
});
