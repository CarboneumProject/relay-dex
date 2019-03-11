const Web3 = require('web3');
const relayWallet = require('./models/relayWallet');
const idex = require('./models/idex');
const useRedis = require('./models/useRedis');
const erc20 = require('./models/erc20');
const BigNumber = require('bignumber.js');
const logToFile = require('./models/logToFile');

const config = require('./config');
const network = config.getNetwork();

const redis = require('redis');

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(network.ws_url),
);

const abi = require('./abi/IDEX/exchange.json');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(abi);

let contractAddress_IDEX_1 = network.IDEX_exchange;

function watchDepositedToLinkWallet() {
  let client = redis.createClient();
  const { promisify } = require('util');
  const getAsync = promisify(client.get).bind(client);

  client.keys('withdrawEvent:new:*', async function (err, txHash_dict) {
    console.log(txHash_dict);

    if (txHash_dict !== null) {
      if (txHash_dict.length === 0) {
        client.quit();
      }

      let txHash = txHash_dict[0].split('withdrawEvent:new:')[1];
      let amountNet = await getAsync('withdrawEvent:new:' + txHash);
      console.log(txHash, amountNet);

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
              console.log({tokenAddress, amount, linkedWalletAddress, nonce, v, r, s, withdrawHash, txHash});

              let walletAddress = await getAsync('withdrawHash:new:' + withdrawHash);
              console.log(walletAddress);

              if (walletAddress){
                let mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
                logToFile.writeLog('withdrawFromLinkedWallet', tokenAddress + ' ' + amount + ' ' + linkedWalletAddress + ' ' + nonce + ' ' + v + ' ' + r + ' ' + s + ' ' + withdrawHash + ' ' + txHash);
                if (tokenAddress === '0x0000000000000000000000000000000000000000') {

                  const w3 = new Web3(mappedAddressProvider);
                  await w3.eth.sendTransaction(
                    {
                      to: walletAddress,
                      from: mappedAddressProvider.addresses[0],
                      value: amountNet,
                    }, function (err, transactionHash) {
                      if (!err){
                        useRedis.markWithdrawed(withdrawHash, walletAddress, txHash, transactionHash);
                      }
                    });

                  //TODO PUSH MSG HERE.
                } else {
                  erc20.transfer(
                    mappedAddressProvider,
                    tokenAddress,
                    walletAddress,
                    amountNet
                  );
                  useRedis.markWithdrawed(withdrawHash, walletAddress, txHash);
                  //TODO PUSH MSG HERE.
                }
              }
            }
          }
        }
      }

    } else {
      client.quit();
    }
  });

}

watchDepositedToLinkWallet();
