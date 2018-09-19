module.exports = {
  contract: {
    address: '0xd598AC2393Ea26a9b1AA391ba8c4b55F77C278D0',
    provider: 'wss://kovan.infura.io/_ws',
  },
  wethContract: {
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    provider: 'wss://mainnet.infura.io/_ws',
  },
  zxExchangeContract: {
    address: '0x12459C951127e0c374FF9105DdA097662A027093',
    provider: 'wss://mainnet.infura.io/_ws',
  },
  zxExchangeContractKovan: {
    address: '0x90fe2af704b34e0224bf2299c838e04d4dcf1364',
    provider: 'wss://kovan.infura.io/_ws',
  },
  mnemonic: '', //Your mnemonic
  followingAddress: '', // Address to copy trade.
  relayBaseURL: '', // End point of a 0x relay submit order.
  portionOfFund: 1.0, // 0.1 = 100% of a holding token.
};
