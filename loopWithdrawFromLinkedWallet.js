const Web3 = require('web3');
const abi = require('./abi/IDEX/exchange.json');
const config = require('./config');
const network = config.getNetwork();
const BigNumber = require('bignumber.js');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(abi);

const useRedis = require('./models/useRedis');
let contractAddress_IDEX_1 = network.IDEX_exchange;

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(network.ws_url),
);

const IDEXContract = new web3.eth.Contract(
  abi,
  contractAddress_IDEX_1,
);

IDEXContract.events.Withdraw({}, async (error, event) => {
  if (event.event === 'Withdraw' && event.removed === false) {
    // let token =  event.returnValues.token;
    // let linkedWalletAddress = event.returnValues.user;
    // let balance = event.returnValues.balance;
    let amountNet = new BigNumber(event.returnValues.amount).toFixed(0);
    let txHash = event.transactionHash;

    console.log(txHash, amountNet);
    useRedis.saveEventWithdraw(txHash, amountNet);
  }

}).on('error', function (error) {
  console.log('error');
  console.error();
  process.exit()
});
