module.exports = {
  contract: {
    address: '0xd598AC2393Ea26a9b1AA391ba8c4b55F77C278D0',
    provider: 'wss://kovan.infura.io/_ws',
  },
  IExchangeContractKovan: {
    sender: '0xa250a55a282af49809b7be653631f12603c3797b',//	0xa4f0e5b6c0bbc0e9b26fd011f95e509e5334d2c4
    address: '0xa250a55a282af49809b7be653631f12603c3797b',// 0xa4f0e5b6c0bbc0e9b26fd011f95e509e5334d2c4
    provider: 'wss://kovan.infura.io/_ws',
  },
  zxExchangeContractKovan: {
    address: '0x35dD2932454449b14Cee11A94d3674a936d5d7b2',
    provider: 'wss://kovan.infura.io/_ws',
  },
  zxExchangeContractRinkeby: {
    address: '0x22ebc052f43a88efa06379426120718170f2204e',
    provider: 'wss://rinkeby.infura.io/_ws',
  },
  zxExchangeContractMainnet: {
    address: '0x4f833a24e1f95d70f028921e27040ca56e09ab0b',
    provider: 'wss://mainnet.infura.io/_ws',
  },
  mnemonic: process.env.MNEMONIC || '', //Your mnemonic
  relayBaseURL: 'https://api.openrelay.xyz'
};
