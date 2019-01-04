const relayWallet = {};
const config = require('../config');
const network = config.getNetwork();

String.prototype.hashCode = function () {
  let hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

relayWallet.getUserWalletProvider = function getUserWalletProvider(userAddress) {
  let accountIndex = Math.abs(userAddress.toLowerCase().hashCode()); // use absolute to fit HD wallet limit 0x80000000

  return new HDWalletProvider(
    process.env.MNEMONIC || config.mnemonic,
    `https://${network.name}.infura.io/${process.env.INFURA_API_KEY}`,
    accountIndex,
    1
  );
};

module.exports = relayWallet;
