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
    gasPrice: await web3Sign.eth.getGasPrice()
  });
};

erc20.approve = async function approve(provider, tokenAddress, spender, value) {
  try {
    let web3Sign = new Web3(provider);
    let erc20ContractSign = new web3Sign.eth.Contract(
      erc20_abi,
      tokenAddress,
    );
    return await erc20ContractSign.methods.approve(spender, value).send({
      from: provider.addresses[0],
      value: 0,
      gasLimit: 210000,
      gasPrice: await web3Sign.eth.getGasPrice()
    });
  } catch (error) {
    console.log(error, ' error');
    return error.message;
  }
};

erc20.allowance = async function allowance(provider, tokenAddress, owner, spender) {
  try {
    let web3Sign = new Web3(provider);
    let erc20ContractSign = new web3Sign.eth.Contract(
      erc20_abi,
      tokenAddress,
    );
    return await erc20ContractSign.methods.allowance(owner, spender).call();
  } catch (error) {
    console.log(error, ' error');
    return error;
  }
};

erc20.etherTokenAddress = '0x0000000000000000000000000000000000000000';

module.exports = erc20;
