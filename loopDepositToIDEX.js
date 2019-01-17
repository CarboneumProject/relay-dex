const relayWallet = require('./models/relayWallet');
const idex = require("./models/idex");
const useRedis = require('./models/useRedis');
const erc20 = require("./models/erc20");
const BN = require('bignumber.js');
const MAX_ALLOWANCE = new BN(10).pow(55).toPrecision();
const RESERVED_ETH = '2100000000000000';
const RESERVED_ETH_WITH_APPROVE = '2000000000';
const RESERVED_Token_WO_APPROVE = '1000000000';

const config = require('./config');
const network = config.getNetwork();
const Web3 = require('web3');
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(network.ws_url),
);

let redis = require("redis"), client = redis.createClient();

async function watchDepositedToLinkWallet() {
  try {
    setTimeout(async () => {
      client.keys("txHash:*", function (err, txHash_dict) {
        if (txHash_dict !== null) {
          Object.keys(txHash_dict).forEach(function (row) {
            let txHash = txHash_dict[row].split("txHash:")[1];
            idex.verifyTxHash(txHash).then((res) => {
              if (res) {
                let [walletAddress, wei, tokenAddress] = res;
                console.log(res, walletAddress, wei, tokenAddress);
                useRedis.isValidHash(txHash, walletAddress.toLowerCase()).then((response) => {
                  if (response === '0') {
                    console.log(txHash, ': is depositing.');
                    useRedis.markDeposited(txHash, walletAddress);
                    const mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
                    if (tokenAddress === '0x0000000000000000000000000000000000000000') {

                      idex.depositEth(mappedAddressProvider, wei - RESERVED_ETH).then((respond) => {
                        if (typeof respond === 'object'){
                          console.log({'status': 'ok', 'message': 'success'});
                        } else {
                          useRedis.saveHash(txHash, walletAddress);
                          console.log({'status': 'no', 'message': 'Please contact admin.'});
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
                              if (typeof respond === 'object'){
                                console.log({'status': 'ok', 'message': 'success'});
                              } else {
                                useRedis.saveHash(txHash, walletAddress);
                                console.log({'status': 'no', 'message': 'Please contact admin.'});
                              }
                            });
                          });
                        }
                        else {
                          idex.depositToken(mappedAddressProvider, tokenAddress, wei).then((respond) => {
                            if (typeof respond === 'object'){
                              console.log({'status': 'ok', 'message': 'success'});
                            } else {
                              useRedis.saveHash(txHash, walletAddress);
                              console.log({'status': 'no', 'message': 'Please contact admin.'});
                            }
                          });
                        }
                      });
                    }
                  } else if (response === '1') {
                    console.log(txHash, ': have been deposited.');
                  } else {
                    console.log('Not found.');
                  }
                });

              } else {
                console.log(res, 'Invalid signature');
              }
            });
          });
        }
      });
      watchDepositedToLinkWallet();
    }, 30 * 1000)
  } catch (e) {
    console.log(e);
  }
}

_ = watchDepositedToLinkWallet();




