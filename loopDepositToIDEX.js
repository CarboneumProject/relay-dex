const relayWallet = require('./models/relayWallet');
const idex = require('./models/idex');
const useRedis = require('./models/useRedis');
const erc20 = require('./models/erc20');
const BigNumber = require('bignumber.js');
const MAX_ALLOWANCE = new BigNumber(10).pow(55).toPrecision();
const logToFile = require('./models/logToFile');
const push = require('./models/push');

const config = require('./config');
const network = config.getNetwork();

const RESERVED_ETH = '2100000000000000';
const redis = require('redis');

const numeral = require('numeral');
const {promisify} = require('util');

function watchDepositedToLinkWallet() {
  let client = redis.createClient();
  client.select(network.redis_db);
  const hgetAsync = promisify(client.hget).bind(client);
  client.keys('txHash:new:*', function (err, txHash_dict) {
    if (txHash_dict !== null) {
      if (txHash_dict.length === 0) {
        client.quit();
        process.exit();
      }

      Object.keys(txHash_dict).forEach(function (row) {
        if (parseInt(row) === txHash_dict.length - 1) {
          client.quit();
        }
        let txHash = txHash_dict[row].split('txHash:new:')[1];
        idex.verifyTxHash(txHash).then((res) => {
          if (res) {
            let [walletAddress, wei_temp, tokenAddress] = res;
            let wei = new BigNumber(wei_temp).toFixed(0);
            useRedis.isValidHash(txHash, walletAddress.toLowerCase()).then((response) => {
              if (response === '1') {
                logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' have been deposited.');
              } else {
                useRedis.getAmount(txHash, walletAddress.toLowerCase()).then((amount) => {
                  useRedis.markDeposited(txHash, walletAddress);
                  console.log(txHash, ': is depositing.');
                  const mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
                  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                    let amountDeposited = new BigNumber(wei).sub(new BigNumber(RESERVED_ETH)).toFixed(0);
                    if (amount && amount !== '0') {
                      amountDeposited =  new BigNumber(amount).toFixed(0);
                    }

                    idex.depositEth(mappedAddressProvider, amountDeposited).then((respond) => {
                      if (typeof respond === 'object') {
                        let amountETH = numeral(amountDeposited / Math.pow(10, 18)).format(`0,0.[000000000000000000]`);
                        logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + amountDeposited + ' ' + amountETH + 'ETH Success.');
                        let msg = `Deposit ${amountETH} ETH successful`;
                        push.sendMsgToUser(walletAddress, `CarbonRadars`, msg);
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
                        if (allowance <= MAX_ALLOWANCE / 2) {
                          erc20.approve(mappedAddressProvider, tokenAddress, network.IDEX_exchange, MAX_ALLOWANCE).then((respond) => {
                            if (typeof respond === 'object') {
                              idex.depositToken(mappedAddressProvider, tokenAddress, wei).then(async (respond) => {
                                if (typeof respond === 'object') {
                                  let tokenName = await hgetAsync('tokenMap:' + tokenAddress, 'token');
                                  let tokenDecimals = await hgetAsync('tokenMap:' + tokenAddress, 'decimals');
                                  let repeatDecimal = '0'.repeat(tokenDecimals);
                                  let amountToken = numeral(wei / Math.pow(10, 18)).format(`0,0.[${repeatDecimal}]`);
                                  let msg = `Deposit ${amountToken} ${tokenName} successful`;
                                  logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' ' + amountToken + tokenName + ' Success.');
                                  push.sendMsgToUser(walletAddress, `CarbonRadars`, msg);
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
                            if (typeof respond === 'object') {
                              let tokenName = await hgetAsync('tokenMap:' + tokenAddress, 'token');
                              let tokenDecimals = await hgetAsync('tokenMap:' + tokenAddress, 'decimals');
                              let repeatDecimal = '0'.repeat(tokenDecimals);
                              let amountToken = numeral(wei / Math.pow(10, 18)).format(`0,0.[${repeatDecimal}]`);
                              let msg = `Deposit ${amountToken} ${tokenName} successful`;
                              logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' +  tokenAddress + ' ' + amountToken + tokenName + ' Success.');
                              push.sendMsgToUser(walletAddress, `CarbonRadars`, msg);
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
