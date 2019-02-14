const relayWallet = require('./models/relayWallet');
const idex = require("./models/idex");
const useRedis = require('./models/useRedis');
const erc20 = require("./models/erc20");
const BigNumber = require('bignumber.js');
const MAX_ALLOWANCE = new BigNumber(10).pow(55).toPrecision();
const logToFile = require("./models/logToFile");

const config = require('./config');
const network = config.getNetwork();

const RESERVED_ETH = '2100000000000000';
const redis = require("redis");


function watchDepositedToLinkWallet() {
  let client = redis.createClient();
  client.keys("txHash:new:*", function (err, txHash_dict) {
    if (txHash_dict !== null) {
      if (txHash_dict.length === 0) {
        client.quit();
      }

      Object.keys(txHash_dict).forEach(function (row) {
        if (parseInt(row) === txHash_dict.length - 1) {
          client.quit();
        }
        let txHash = txHash_dict[row].split("txHash:new:")[1];
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
                        logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + amountDeposited + ' ETH Success.');
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
                      if (allowance <= MAX_ALLOWANCE / 2) {
                        erc20.approve(mappedAddressProvider, tokenAddress, network.IDEX_exchange, MAX_ALLOWANCE).then(() => {
                          idex.depositToken(mappedAddressProvider, tokenAddress, wei).then((respond) => {
                            if (typeof respond === 'object') {
                              logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Success.');
                            } else {
                              useRedis.saveHash(txHash, walletAddress);
                              logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Failed.');
                            }
                          });
                        });
                      } else {
                        idex.depositToken(mappedAddressProvider, tokenAddress, wei).then((respond) => {
                          if (typeof respond === 'object') {
                            logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Success.');
                          } else {
                            useRedis.saveHash(txHash, walletAddress);
                            logToFile.writeLog('loopDeposit', txHash + ' ' + walletAddress + ' ' + wei + ' ' + tokenAddress + ' Failed.');
                          }
                        });
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
    }
  });
}

watchDepositedToLinkWallet();
