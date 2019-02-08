const networks = {
  rinkeby: {
    name : 'rinkeby',
    ws_url: 'wss://rinkeby.infura.io/ws',
    socialtrading: '0x7f47ab9202d059b8c906118b2c1824fcc7af4326',
    IExchange: '',
    zxExchange: '0x22ebc052f43a88efa06379426120718170f2204e',
    relayWallet: '0xb45b4702187894a605893a260aab1103b3784a70',
    IDEX_exchange: '0xb583ef86fbaa630a67b62435ee797cb5ae4cc7e1',
    radarrelay_url: '',
    openrelay_url: '',
    IDEX_API_BASE_URL: 'http://localhost:8880',
    IDEX_API_BASE_WS: 'ws://localhost:8881',
    REWARD: 48,
    FEE: 8,
  },

  kovan: {
    name : 'kovan',
    ws_url: 'wss://kovan.infura.io/ws',
    socialtrading: '0xd598AC2393Ea26a9b1AA391ba8c4b55F77C278D0',
    IExchange: {
      sender: '0xa250a55a282af49809b7be653631f12603c3797b',
      address: '0xfa2de623035c7e068d4346857bb62ce98aa7b728',
    },
    zxExchange: '0x35dD2932454449b14Cee11A94d3674a936d5d7b2',
    relayWallet: '',
    IDEX_exchange: '0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208',
    radarrelay_url: 'https://api.kovan.radarrelay.com',
    openrelay_url: 'https://api.openrelay.xyz',
    IDEX_API_BASE_URL: 'http://localhost:8880',
    IDEX_API_BASE_WS: 'ws://localhost:8881',
    REWARD: 48,
    FEE: 8,
  },

  mainnet: {
    name : 'mainnet',
    // ws_url: 'wss://mainnet.infura.io/ws',
    ws_url: 'ws://x.stockradars.co:8546',
    socialtrading: '0x8e21b2c846ec9d3ccbb170f2c4053b419a680ea1',
    IExchange: '',
    zxExchange: '0x4f833a24e1f95d70f028921e27040ca56e09ab0b',
    relayWallet: '',
    IDEX_exchange: '0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208',
    radarrelay_url: 'https://api.radarrelay.com',
    openrelay_url: 'https://api.openrelay.xyz',
    IDEX_API_BASE_URL: 'https://api.idex.market',
    IDEX_API_BASE_WS: 'wss://v1.idex.market',
    REWARD: 48,
    FEE: 8,
  },
};


function getNetwork(network){
  return networks[process.env.NETWORK || network || 'mainnet'];
}


module.exports = {
  getNetwork:getNetwork,
  mnemonic: process.env.MNEMONIC || '', //Your mnemonic
};
