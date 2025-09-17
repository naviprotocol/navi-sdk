import axios from 'axios'

export default async function getRemotePositiveSlippageSetting() {
  const resp = await axios.get('https://open-api.naviprotocol.io/api/internal/ag/positive-slippage')

  return resp.data.data.should_enable_positive_slippage
}
