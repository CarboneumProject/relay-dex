const idex = require("./models/idex");
const erc20 = require("./models/erc20");
const utils = require("./models/utils");
const BN = require('bignumber.js');
const MAX_ALLOWANCE = new BN(10).pow(55).toPrecision();
const erc20_abi = require('./abi/ERC20/token.json');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet_abi = require('./abi/relaywallet/RelayWalletIDEX.json');
const config = require('./config');
const custodian_address = config.custodian;   //custodian
const Provider = config.getProvider();

const Web3 = require('web3');
const web3 = new Web3(
  utils.provider,
);

const web3_readonly = new Web3(
  new Web3.providers.WebsocketProvider(Provider.ws_url),
);

const IDEXContract = new web3.eth.Contract(
  IDEX_abi,
  Provider.IDEX_exchange,
);

const relayWalletContract = new web3_readonly.eth.Contract(
  relayWallet_abi,
  Provider.relayWallet,
);


async function checkApprovalIDEX(_token) {
  let ERC20Contract = await new web3.eth.Contract(
    erc20_abi,
    _token,
  );

  let checkAllowance = await erc20.check_allowance(ERC20Contract, custodian_address, Provider.IDEX_exchange);
  let balanceOfIDEX = await idex.IDEX_balance(IDEXContract, _token, custodian_address);
  if (parseInt(checkAllowance) <= parseInt(balanceOfIDEX)) {
    await erc20.approved(ERC20Contract, Provider.IDEX_exchange, MAX_ALLOWANCE);
    console.log('update token. (IDEX \'s allowance) ', _token);
  }
}


async function checkApprovalWithdraw(_token) {
  let ERC20Contract = await new web3.eth.Contract(
    erc20_abi,
    _token,
  );

  let checkAllowance = await erc20.check_allowance(ERC20Contract, custodian_address, Provider.relayWallet);
  let balanceOfCustodian = await erc20.check_balance(ERC20Contract, custodian_address);
  if (parseInt(checkAllowance) <= parseInt(balanceOfCustodian)) {
    await erc20.approved(ERC20Contract, Provider.relayWallet, MAX_ALLOWANCE);
    console.log('be able to withdraw. (Relay \'s allowance) ', _token);
  }
}


relayWalletContract.events
  .Deposit(async function (error, event) {
    if (error) return console.error(error);
    console.log(event, '======');
    let amount = event.returnValues.amount;
    let token = event.returnValues.token;
    // let address = event.returnValues.user;
    if (token === erc20.etherTokenAddress) {
      await IDEXContract.methods.deposit().send({
        from: config.owner,
        value: amount,
        gasLimit: 42000,
        gasPrice: web3.utils.toWei('2', 'gwei')
      });
    } else {
      await checkApprovalIDEX(token);
      await IDEXContract.methods.depositToken(token, amount).send({
        from: config.owner,
        value: 0,
        gasLimit: 210000,
        gasPrice: web3.utils.toWei('2', 'gwei')
      });
      await checkApprovalWithdraw(token);
    }
  });

console.log('end');
