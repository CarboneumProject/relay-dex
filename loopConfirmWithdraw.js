const Web3 = require('web3');
const relayWallet = require('./models/relayWallet');
const idex = require('./models/idex');
const useRedis = require('./models/useRedis');
const erc20 = require('./models/erc20');
const logToFile = require('./models/logToFile');

const redis = require('redis');
const abi = require('./abi/IDEX/exchange.json');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(abi);

function watchDepositedToLinkWallet() {
  let client = redis.createClient();
  client.keys('withdrawEvent:new:*', function (err, txHash_dict) {

    if (txHash_dict !== null) {
      if (txHash_dict.length === 0) {
        client.quit();
        process.exit();
      }

      Object.keys(txHash_dict).forEach(function (row) {
        console.log(txHash_dict[row]);
        if (parseInt(row) === txHash_dict.length - 1) {
          client.quit();
        }
        let txHash = txHash_dict[row].split('withdrawEvent:new:')[1];
        useRedis.getAmountWithdrawNet(txHash).then(async (amountNet) => {

          idex.withdrawTxHash(txHash).then((withdrawHash) => {
            if (withdrawHash) {
              useRedis.findWalletTarget(withdrawHash).then(async (walletAddress) => {

                if (walletAddress) {
                  let mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
                  if (tokenAddress === '0x0000000000000000000000000000000000000000') {

                    const w3 = new Web3(mappedAddressProvider);
                    await w3.eth.sendTransaction(
                      {
                        to: walletAddress,
                        from: mappedAddressProvider.addresses[0],
                        value: amountNet,
                      }, function (err, transactionHash) {
                        if (!err) {
                          useRedis.markWithdrawed(withdrawHash, walletAddress, txHash, transactionHash);
                          logToFile.writeLog('withdrawFromLinkedWallet', withdrawHash + ' ' + txHash + ' ' + walletAddress + ' ' + transactionHash);
                        }
                      });
                    w3.currentProvider.engine.stop();

                    //TODO PUSH MSG HERE.
                  } else {
                    erc20.transfer(
                      mappedAddressProvider,
                      tokenAddress,
                      walletAddress,
                      amountNet
                    );
                    logToFile.writeLog('withdrawFromLinkedWallet', withdrawHash + ' ' + txHash + ' ' + walletAddress);
                    useRedis.markWithdrawed(withdrawHash, walletAddress, txHash);
                    //TODO PUSH MSG HERE.
                  }
                }
              });
            }
          });
        });
      });
    } else {
      client.quit();
      process.exit();
    }
  });
}

watchDepositedToLinkWallet();
