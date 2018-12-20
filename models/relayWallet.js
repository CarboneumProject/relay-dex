const relayWallet = {};


relayWallet.wallet_balance = async function wallet_balance(_relayWalletContract, _token, _user) {
  return await _relayWalletContract.methods.balanceOf(_token, _user).call();
};

relayWallet.adjust_balance = async function adjust_balance(
  _relayWalletContract,
  _user,
  _tokenBuy,
  _tokenSell,
  _amountBuy,
  _amountSell
) {
  return await _relayWalletContract.methods.adjustBalance(
    _token,
    _user,
    _tokenBuy,
    _tokenSell,
    _amountBuy,
    _amountSell
  ).call();
};


module.exports = relayWallet;
