const idex = {};
const config = require('../config');
const Web3 = require('web3');

idex.IDEX_balance = async function IDEX_balance(_IDEXContract, _token, _user) {
  return await _IDEXContract.methods.balanceOf(_token, _user).call();
};

idex.deposit_eth_idex = async function deposit_eth(_IDEXContract, _ether) {
  return await _IDEXContract.methods.deposit().send({
    from: config.owner,
    value: _ether,
    gasLimit: 42000,
    gasPrice: Web3.utils.toWei('2', 'gwei')
  });
};

idex.deposit_token_idex = async function deposit_token(_IDEXContract, _token, _amount) {
  return await _IDEXContract.methods.depositToken('0xd36255cee98d10068d0bc1a394480bf09b3db4d7', '1').send({
    from: config.owner,
    value: 0,
    gasLimit: 210000,
    gasPrice: Web3.utils.toWei('2', 'gwei')
  });
};


module.exports = idex;
