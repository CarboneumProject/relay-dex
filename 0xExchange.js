const Web3 = require('web3');
const abi = require('./abi/0x/v0/exchange.json');
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

zxContract.events
  .LogFill(async function (error, event) {
    if (error) return console.error(error);
    client.hgetall("leader:" + event.returnValues.maker, async function (err, results) {
      if (results) {

        Object.keys(results).forEach(async function (key) {
          exchangeModel.makerTrade(event, results[key]);
        });
      } else {
        console.log(results, " null 1")
      }
    });

    client.hgetall("leader:" + event.returnValues.taker, async function (err, results) {
      if (results) {


        Object.keys(results).forEach(async function (key) {
          exchangeModel.takerTrade(event, results[key]);
          });
      }
      else {
        console.log(results, " null 2")
      }
    });


  });
console.log('end');
