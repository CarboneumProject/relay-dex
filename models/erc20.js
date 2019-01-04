const erc20 = {};
const config = require('../config');
const Web3 = require('web3');

erc20.approve = async function approve(_ERC20Contract, _spender, _value) {
  return await _ERC20Contract.methods.approve(_spender, _value).send({
    from: config.owner,
    value: 0,
    gasLimit: 210000,
    gasPrice: Web3.utils.toWei('21', 'gwei')
  });
};

erc20.allowance = async function allowance(_ERC20Contract, _owner, _spender) {
  return await _ERC20Contract.methods.allowance(_owner, _spender).call();
};

erc20.balance = async function balance(_ERC20Contract, _owner) {
  return await _ERC20Contract.methods.balanceOf(_owner).call();
};

erc20.etherTokenAddress = '0x0000000000000000000000000000000000000000';

module.exports = erc20;
