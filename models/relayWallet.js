const relayWallet = {};


relayWallet.wallet_balance = async function wallet_balance(_relayWalletContract, _token, _user) {
  return await _relayWalletContract.methods.balanceOf(_token, _user).call();
};


module.exports = relayWallet;
