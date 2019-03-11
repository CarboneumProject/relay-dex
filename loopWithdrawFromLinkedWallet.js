const Web3 = require('web3');
const abi = require('./abi/IDEX/exchange.json');
const config = require('./config');
const network = config.getNetwork();
const BigNumber = require('bignumber.js');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(abi);

const useRedis = require('./models/useRedis');
const erc20 = require("./models/erc20");
const transfer = require("./models/transfer");
const idex = require('./models/idex');
const relayWallet = require('./models/relayWallet');
const logToFile = require("./models/logToFile");

const redis = require('redis'), client = redis.createClient();
const { promisify } = require('util');
const getAsync = promisify(client.get).bind(client);

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

    let trx = await web3.eth.getTransaction(txHash);
    if (trx != null && trx.to != null) {
      if (trx.to.toLowerCase() === contractAddress_IDEX_1) {
        let receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt.status) {
          let transaction = abiDecoder.decodeMethod(trx.input);
          if (transaction.name === 'adminWithdraw') {
            let params = transaction.params;
            let tokenAddress = params[0].value;
            let amount = new BigNumber(params[1].value).toFixed(0);
            let linkedWalletAddress = (params[2].value).toLowerCase();
            let nonce = new BigNumber(params[3].value).toFixed(0);
            let v = params[4].value;
            let r = params[5].value;
            let s = params[6].value;

            let withdrawHash = idex.withdrawHash(tokenAddress, amount, linkedWalletAddress, nonce, v, r, s);

            console.log(tokenAddress, amount, linkedWalletAddress, nonce, v, r, s, withdrawHash, txHash);

            let walletAddress = await getAsync('withdrawHash:new:' + withdrawHash);

            if (walletAddress){
              let mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
              logToFile.writeLog('withdrawFromLinkedWallet', tokenAddress + ' ' + amount + ' ' + linkedWalletAddress + ' ' + nonce + ' ' + v + ' ' + r + ' ' + s + ' ' + withdrawHash + ' ' + txHash);
              if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                transfer.sendEth(
                  mappedAddressProvider,
                  mappedAddressProvider.addresses[0],
                  walletAddress,
                  amountNet
                );
                useRedis.markWithdrawed(withdrawHash, walletAddress);
              } else {
                erc20.transfer(
                  mappedAddressProvider,
                  tokenAddress,
                  walletAddress,
                  amountNet
                );
                useRedis.markWithdrawed(withdrawHash, walletAddress);
              }
            }
          }
        }
      }
    }
  }

}).on('error', console.error);
