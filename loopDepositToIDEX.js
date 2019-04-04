const mainnetProvider = require('./models/mainnetProvider');
const idex = require('./models/idex');
const useRedis = require('./models/useRedis');
const erc20 = require('./models/erc20');
const BigNumber = require('bignumber.js');
const MAX_ALLOWANCE = new BigNumber(10).pow(55).toPrecision();
const logToFile = require('./models/logToFile');
const push = require('./models/push');
const Web3 = require('web3');

const config = require('./config');
const network = config.getNetwork();

const RESERVED_ETH = '2100000000000000';
const redis = require('redis');

const utils = require('./models/utils');

function watchDepositedToLinkWallet() {
  let client = redis.createClient();
  client.select(network.redis_db);
  let addressInProcess = [];
  client.keys('txHash:new:*', function (err, txHash_dict) {
    if (txHash_dict !== null) {
      if (txHash_dict.length === 0) {
        client.quit();
        process.exit();
      }

      Object.keys(txHash_dict).forEach(function (row) {
        if (parseInt(row) === txHash_dict.length - 1) {
          const delay = ms => new Promise(res => setTimeout(res, ms));
          delay(1000 * 60 * 15).then(() => {
            process.exit()
          });
        }
        let txHash = txHash_dict[row].split('txHash:new:')[1];
        idex.verifyTxHash(txHash).then((res) => {
          if (res) {
            let [walletAddress, wei_temp, tokenAddress] = res;
            if (!addressInProcess.includes(walletAddress)) {
              addressInProcess.push(walletAddress);
              let wei = new BigNumber(wei_temp).toFixed(0);
              useRedis.isValidHash(txHash, walletAddress.toLowerCase()).then((response) => {
                if (response === '1') {
                  logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' have been deposited.');
                } else {
                  useRedis.getAmount(txHash, walletAddress.toLowerCase()).then((amount) => {
                    useRedis.markDeposited(txHash, walletAddress);
                    console.log(txHash, ': is depositing.');
                    const mappedAddressProvider = mainnetProvider.getUserWalletProvider(walletAddress);
                    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                      let amountDeposited = new BigNumber(wei).sub(new BigNumber(RESERVED_ETH)).toFixed(0);
                      if (amount && amount !== '0') {
                        amountDeposited = new BigNumber(amount).toFixed(0);
                      }

                      idex.depositEth(mappedAddressProvider, amountDeposited).then(async (respond) => {
                        if (respond) {
                          const web3 = new Web3(mappedAddressProvider);
                          await web3.eth.getTransactionReceipt(respond).then(async () => {

                            let amountETH = utils.decimalFormat(18, amountDeposited);
                            logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + amountDeposited + ' ' + amountETH + 'ETH Success.');
                            let msg = `${amountETH} ETH`;
                            let title = `Deposit successful`;
                            push.sendMsgToUser(walletAddress, title, msg);
                          });
                        } else {
                          useRedis.saveHash(txHash, walletAddress, amountDeposited);
                          logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + amountDeposited + ' ETH Failed.');
                        }
                      });
                    } else {
                      erc20.allowance(
                        mappedAddressProvider,
                        tokenAddress,
                        mappedAddressProvider.addresses[0],
                        network.IDEX_exchange //IDEX contract
                      ).then((allowance) => {
                        if (typeof allowance === 'object') {
                          useRedis.saveHash(txHash, walletAddress);
                          logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Failed.');
                        }
                        else {
                          if ((new BigNumber(allowance)).lte((new BigNumber(MAX_ALLOWANCE)).div(2))) {
                            erc20.approve(mappedAddressProvider, tokenAddress, network.IDEX_exchange, MAX_ALLOWANCE).then((respond) => {
                              if (typeof respond === 'object') {
                                idex.depositToken(mappedAddressProvider, tokenAddress, wei).then(async (respond) => {
                                  if (respond) {
                                    const web3 = new Web3(mappedAddressProvider);
                                    await web3.eth.getTransactionReceipt(respond).then(async () => {
                                      let tokenName = await useRedis.getTokenMap(tokenAddress, 'token');
                                      let tokenDecimals = await useRedis.getTokenMap(tokenAddress, 'decimals');
                                      let amountToken = utils.decimalFormat(tokenDecimals, wei);
                                      let msg = `${amountToken} ${tokenName}`;
                                      let title = `Deposit successful`;
                                      logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' ' + amountToken + tokenName + ' Success.');
                                      push.sendMsgToUser(walletAddress, title, msg);
                                    });
                                  } else {
                                    useRedis.saveHash(txHash, walletAddress);
                                    logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Failed.');
                                  }
                                });
                              } else {
                                useRedis.saveHash(txHash, walletAddress);
                                logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Failed.');
                              }
                            });
                          } else {
                            idex.depositToken(mappedAddressProvider, tokenAddress, wei).then(async (respond) => {
                              if (respond) {
                                const web3 = new Web3(mappedAddressProvider);
                                await web3.eth.getTransactionReceipt(respond).then(async () => {
                                  let tokenName = await useRedis.getTokenMap(tokenAddress, 'token');
                                  let tokenDecimals = await useRedis.getTokenMap(tokenAddress, 'decimals');
                                  let amountToken = utils.decimalFormat(tokenDecimals, wei);
                                  let msg = `${amountToken} ${tokenName}`;
                                  let title = `Deposit successful`;
                                  logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' ' + amountToken + tokenName + ' Success.');
                                  push.sendMsgToUser(walletAddress, title, msg);
                                });
                              } else {
                                useRedis.saveHash(txHash, walletAddress);
                                logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Failed.');
                              }
                            });
                          }
                        }
                      });
                    }
                  });
                }
              });
            }
          } else {
            logToFile.writeLog('loopDeposit', txHash + ' Invalid signature.');
          }
        });
      });
    }
    else {
      client.quit();
      process.exit();
    }
  });
}

watchDepositedToLinkWallet();
