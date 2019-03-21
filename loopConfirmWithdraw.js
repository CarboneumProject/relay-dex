const Web3 = require('web3');
const relayWallet = require('./models/relayWallet');
const idex = require('./models/idex');
const useRedis = require('./models/useRedis');
const erc20_abi = require('./abi/ERC20/token.json');
const logToFile = require('./models/logToFile');
const push = require('./models/push');

const redis = require('redis');
const abi = require('./abi/IDEX/exchange.json');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(abi);

const numeral = require('numeral');

const config = require('./config');
const network = config.getNetwork();

function watchDepositedToLinkWallet() {
  let client = redis.createClient();
  client.select(network.redis_db);
  client.keys('withdrawEvent:new:*', function (err, txHash_dict) {

    if (txHash_dict !== null) {
      if (txHash_dict.length === 0) {
        client.quit();
        process.exit();
      }

      Object.keys(txHash_dict).forEach(function (row) {

        if (parseInt(row) === txHash_dict.length - 1) {
          client.quit();
        }
        let txHash = txHash_dict[row].split('withdrawEvent:new:')[1];
        useRedis.getAmountWithdrawNet(txHash).then(async (amountNet) => {

          idex.withdrawTxHash(txHash).then((res) => {
            if (res) {
              let [withdrawHash, tokenAddress] = res;
              useRedis.findWalletTarget(withdrawHash).then(async (walletAddress) => {
                if (walletAddress) {
                  console.log(walletAddress, txHash);
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

                    let amountETH = numeral(amountNet / Math.pow(10, 18)).format(`0,0.[000000000000000000]`);
                    let msg = `${amountETH} ETH: Withdraw successful`;

                    push.sendMsgToUser(walletAddress, `CarbonRadars`, msg);
                    w3.currentProvider.engine.stop();
                  } else {

                    const w3 = new Web3(mappedAddressProvider);
                    let erc20ContractSign = new w3.eth.Contract(
                      erc20_abi,
                      tokenAddress,
                    );
                    let gasPrice = await w3.eth.getGasPrice();
                    await erc20ContractSign.methods.transfer(walletAddress, amountNet).send({
                      from: mappedAddressProvider.addresses[0],
                      value: 0,
                      gasLimit: 210000,
                      gasPrice: gasPrice
                    }, function (err, transactionHash) {
                      if (!err) {
                        useRedis.markWithdrawed(withdrawHash, walletAddress, txHash, tokenAddress);
                        logToFile.writeLog('withdrawFromLinkedWallet', withdrawHash + ' ' + txHash + ' ' + walletAddress + ' ' + transactionHash);
                      }
                    });

                    let tokenName = await useRedis.getTokenMap(tokenAddress, 'token');
                    let tokenDecimals = await useRedis.getTokenMap(tokenAddress, 'decimals');
                    let repeatDecimal = '0'.repeat(tokenDecimals);
                    let amountToken = numeral(amountNet / Math.pow(10, tokenDecimals)).format(`0,0.[${repeatDecimal}]`);

                    let msg = `${amountToken} ${tokenName}: Withdraw successful`;
                    push.sendMsgToUser(walletAddress, `CarbonRadars`, msg);
                    w3.currentProvider.engine.stop();
                  }
                }
              });
            } else {
              console.log('not match', txHash);
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
