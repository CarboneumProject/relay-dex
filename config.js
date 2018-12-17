const providers = {
  rinkeby: {
    ws_url: 'wss://rinkeby.infura.io/_ws',
    socialtrading: '',
    IExchange: '',
    zxExchange: '0x22ebc052f43a88efa06379426120718170f2204e',
    relayWallet: '0xd4a62064c58abe1d115f5a52f304df801d01dd61',
    IDEX_exchange: '0x2e404de9faebc4b94d7e21366bdf96534cd76585',
    radarrelay_url: '',
    openrelay_url: ''
  },

  kovan: {
    ws_url: 'wss://kovan.infura.io/_ws',
    socialtrading: '0xd598AC2393Ea26a9b1AA391ba8c4b55F77C278D0',
    IExchange: {
      sender: '0xa250a55a282af49809b7be653631f12603c3797b',
      address: '0xfa2de623035c7e068d4346857bb62ce98aa7b728',
    },
    zxExchange: '0x35dD2932454449b14Cee11A94d3674a936d5d7b2',
    relayWallet: '',
    IDEX_exchange: '',
    radarrelay_url: 'https://api.kovan.radarrelay.com',
    openrelay_url: 'https://api.openrelay.xyz'

  },
  mainnet: {
    ws_url: 'wss://mainnet.infura.io/_ws',
    socialtrading: '',
    IExchange: '',
    zxExchange: '0x4f833a24e1f95d70f028921e27040ca56e09ab0b',
    relayWallet: '',
    IDEX_exchange: '',
    radarrelay_url: 'https://api.radarrelay.com',
    openrelay_url: 'https://api.openrelay.xyz'
  },
};


function getProvider(network){
  return providers[process.env.NETWORK || network || 'rinkeby']
}


module.exports = {
  getProvider:getProvider,
  mnemonic: process.env.MNEMONIC || '', //Your mnemonic
  owner: '0xa250a55a282af49809b7be653631f12603c3797b',
};
