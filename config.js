module.exports = {
  contract: {
    address: '0xd598AC2393Ea26a9b1AA391ba8c4b55F77C278D0',
    provider: 'wss://kovan.infura.io/_ws',
  },
  zxExchangeContractKovan: {
    address: '0x90fe2af704b34e0224bf2299c838e04d4dcf1364',
    provider: 'wss://kovan.infura.io/_ws',
  },
  mnemonic: process.env.MNEMONIC || '', //Your mnemonic
  relayBaseURL: 'https://api.kovan.radarrelay.com/0x',
};
