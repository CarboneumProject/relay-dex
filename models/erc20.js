const erc20 = {};
const config = require('../config');
const Web3 = require('web3');

erc20.approved = async function approved(_ERC20Contract, _spender, _value) {
  return await _ERC20Contract.methods.approve(_spender, _value).send({
    from: config.owner,
    value: 0,
    gasLimit: 210000,
    gasPrice: Web3.utils.toWei('21', 'gwei')
  });
};

erc20.check_allowance = async function check_allowance(_ERC20Contract, _owner, _spender) {
  return await _ERC20Contract.methods.allowance(_owner, _spender).call();
};

module.exports = erc20;
