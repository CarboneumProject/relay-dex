const relayWallet = {};


relayWallet.wallet_balance = async function wallet_balance(_relayWalletContract, _token, _user) {
  return await _relayWalletContract.methods.availableBalanceOf(_token, _user).call();
};

relayWallet.lock_balance = async function lock_balance(_relayWalletContract, _user, _token, _amount) {
  return await _relayWalletContract.methods.lockBalance(_user, _token, _amount).send({
    from: config.owner,
    value: 0,
    gasLimit: 42000,
    gasPrice: Web3.utils.toWei('2', 'gwei')
  });
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
  ).send({
    from: config.owner,
    value: 0,
    gasLimit: 42000,
    gasPrice: Web3.utils.toWei('2', 'gwei')
  });
};


module.exports = relayWallet;
