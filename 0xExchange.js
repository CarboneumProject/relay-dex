const Web3 = require('web3');
const abi = require('./abi/0x/v2/exchange.json');
const config = require('./config');
const Provider = config.getProvider();
const exchangeModel = require('./models/0xExchange');

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(Provider.ws_url),
);

const zxContract = new web3.eth.Contract(
  abi,
  Provider.zxExchange,
);


var redis = require("redis"), client = redis.createClient();

exchangeModel.sendOrder();

console.log('end');
