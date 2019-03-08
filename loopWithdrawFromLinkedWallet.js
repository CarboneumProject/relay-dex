require('babel-core/register');
require('babel-polyfill');
const Web3 = require('web3');
const idex = require('./models/idex');
const config = require('./config');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet = require('./models/relayWallet');
const redis = require('redis'), client = redis.createClient();
const { promisify } = require('util');
const hgetAsync = promisify(client.hget).bind(client);
const BigNumber = require('bignumber.js');
const abiDecoder = require('abi-decoder');

const useRedis = require('./models/useRedis');
const erc20 = require("../models/erc20");
const transfer = require("../models/transfer");
const IDEX_FEE = 0.95;  // MAX IDEX WITHDRAW FEE = 5%

abiDecoder.addABI(IDEX_abi);

const network = config.getNetwork();

let contractAddress_IDEX_1 = network.IDEX_exchange;

async function watchIDEXWithdraw (blockNumber) {
  try {
    const web3 = new Web3(
      new Web3.providers.WebsocketProvider(network.ws_url),
    );

    if (blockNumber === 0) {
      let lastBlock = await hgetAsync('lastBlock', 'IDEXWithdraw');
      console.log('start @ #', lastBlock);
      if (lastBlock) {
        blockNumber = lastBlock;
      } else {
        blockNumber = (await web3.eth.getBlock('latest')).number;
      }
    }
    setTimeout(async () => {
      while (true) {
        let block = await web3.eth.getBlock(blockNumber);
        if (block == null) {
          return watchIDEXWithdraw(blockNumber);
        }

        block.transactions.forEach(async function (txHash) {
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
                  let walletAddress = (params[2].value).toLowerCase();
                  let nonce = params[3].value;
                  let v = params[4].value;
                  let r = params[5].value;
                  let s = params[6].value;
                  // let feeWithdrawal = params[7].value;

                  let withdrawHash = idex.withdrawHash(tokenAddress, amount, walletAddress, nonce, v, r, s);
                  let mappedAddressProvider = relayWallet.getUserWalletProvider(user);

                  useRedis.findWithdraw(withdrawHash, walletAddress.toLowerCase()).then((amount) => {
                    if (amount && amount !== '0'){
                      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                        transfer.sendEth(
                          mappedAddressProvider,
                          mappedAddressProvider.addresses[0],
                          walletAddress,
                          new BigNumber(amount).mul(IDEX_FEE).toFixed(0)
                        );
                        useRedis.markWithdrawed(withdrawHash, walletAddress);
                      } else {
                        erc20.transfer(
                          mappedAddressProvider,
                          tokenAddress,
                          walletAddress,
                          new BigNumber(amount).mul(IDEX_FEE).toFixed(0)
                        );
                        useRedis.markWithdrawed(withdrawHash, walletAddress);
                      }
                    }
                  });
                }
              }
            }
          }
        });
        console.log(blockNumber);
        client.hset('lastBlock', 'IDEXWithdraw', blockNumber);
        blockNumber++;
      }
    }, 15 * 1000);
  } catch (e) {
    console.log(e, ' error');
    process.exit();
  }
}

_ = watchIDEXWithdraw(0);


