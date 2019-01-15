const erc20 = {};

const Web3 = require('web3');
const erc20_abi = require('../abi/ERC20/token.json');

erc20.transfer = async function transfer(provider, tokenAddress, to, value) {
  let web3Sign = new Web3(provider);
  let erc20ContractSign = new web3Sign.eth.Contract(
    erc20_abi,
    tokenAddress,
  );
  return await erc20ContractSign.methods.transfer(to, value).send({
    from: provider.addresses[0],
    value: 0,
    gasLimit: 210000,
    gasPrice: web3Sign.eth.gasPrice
  });
};

erc20.approve = async function approve(provider, tokenAddress, spender, value) {
  let web3Sign = new Web3(provider);
  let erc20ContractSign = new web3Sign.eth.Contract(
    erc20_abi,
    tokenAddress,
  );
  return await erc20ContractSign.methods.approve(spender, value).send({
    from: provider.addresses[0],
    value: 0,
    gasLimit: 210000,
    gasPrice: web3Sign.eth.gasPrice
  });
};

erc20.allowance = async function allowance(provider, tokenAddress, owner, spender) {
  let web3Sign = new Web3(provider);
  let erc20ContractSign = new web3Sign.eth.Contract(
    erc20_abi,
    tokenAddress,
  );

  return await erc20ContractSign.methods.allowance(owner, spender).call();
};

erc20.balance = async function balance(_ERC20Contract, _owner) {
  return await _ERC20Contract.methods.balanceOf(_owner).call();
};

erc20.etherTokenAddress = '0x0000000000000000000000000000000000000000';

module.exports = erc20;

async function f() {
  const utils = require('./utils');
  let mappedAddressProvider = utils.provider;
  let tokenAddress = '0xd42debe4edc92bd5a3fbb4243e1eccf6d63a4a5d';
  let walletAddress = '0xb2142e26986296dae415337eae92f14747009719';
  return await erc20.allowance(mappedAddressProvider, tokenAddress, mappedAddressProvider.addresses[0], walletAddress);
}
f().then((allowance) =>{
  console.log(allowance);
});
