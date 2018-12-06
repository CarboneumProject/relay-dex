const Web3 = require('web3');
const abi = require('./abi/0x/v2/exchange.json');
const config = require('./config');
const exchangeModel = require('./models/0xExchange');

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.zxExchangeContractKovan.provider),
);

const zxContract = new web3.eth.Contract(
  abi,
  config.zxExchangeContractKovan.address,
);


var redis = require("redis"), client = redis.createClient();

exchangeModel.sendOrder();

console.log('end');
