const BigNumber = require('bignumber.js');
const web3 = require('web3');
const feeProcessor = require('../feeProcessor');

require('chai')
  .use(require('chai-as-promised'))
  .should();

function ether (n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}

describe('watchIDEXTransfers', async function () {
  it('should able to calculate fee for 1 order with same amount and price and no fee will paid', async function () {
    let openTrades = [
      {
        'id': 1,
        'order_time': '2019-03-04T14:38:33.000Z',
        'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
        'follower': '0xfb38e6973c2d6b33ca0d8d2d10107fa13def920a',
        'maker_token': '0xd42debe4edc92bd5a3fbb4243e1eccf6d63a4a5d',
        'taker_token': '0x0000000000000000000000000000000000000000',
        'amount_maker': new BigNumber('8000000000000000000'),
        'amount_taker': new BigNumber('1000000000000000000'),
        'amount_left': new BigNumber('3000060000000000000'),
        'order_hash': '0x13b235e5414050634675fb2a907463ccb04239825b90d23af61bce8031007b60',
        'tx_hash': '0x68b3d877397e70620fbdfc36b059e18349479156eaefe3142e927966ef32e592',
        'leader_tx_hash': '0x09749c8dbf35fd6f6614dd7a4c11afe63dbe3d960599781c91811316f5be0d4c',
      },
      {
        'id': 2,
        'order_time': '2019-03-04T15:01:48.000Z',
        'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
        'follower': '0xfb38e6973c2d6b33ca0d8d2d10107fa13def920a',
        'maker_token': '0xd42debe4edc92bd5a3fbb4243e1eccf6d63a4a5d',
        'taker_token': '0x0000000000000000000000000000000000000000',
        'amount_maker': new BigNumber('8000000000000000000'),
        'amount_taker': new BigNumber('1000000000000000000'),
        'amount_left': new BigNumber('8000000000000000000'),
        'order_hash': '0xfc173075c7a76b2ede3f16125c4b3e333f4cc9d4685f878120928e5bad38b986',
        'tx_hash': '0xc80d84b158d8c422d448603e31bb8d597f741fc068020e5671822a042b58ff23',
        'leader_tx_hash': '0xee3969e6d3e8cc4a9b66aa3d4db5b18408a47064ac8a9ee53d2334ef1ec559f9',
      },
      {
        'id': 3,
        'order_time': '2019-03-05T05:23:48.000Z',
        'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
        'follower': '0xfb38e6973c2d6b33ca0d8d2d10107fa13def920a',
        'maker_token': '0xd42debe4edc92bd5a3fbb4243e1eccf6d63a4a5d',
        'taker_token': '0x0000000000000000000000000000000000000000',
        'amount_maker': new BigNumber('4000000000000000000'),
        'amount_taker': new BigNumber('1000000000000000000'),
        'amount_left': new BigNumber('4000000000000000000'),
        'order_hash': '0x479440288e1daff47b9e3ac56ef7747e5f6b2ffc8d8291a16ab12378f3c6808c',
        'tx_hash': '0xa8217a3c3401a76e879449d48a289a75bd8c924a21094ba2885670de4d1798cc',
        'leader_tx_hash': '0xd58a18fc2d446c73bb36a602dd2f26bdbf112c96a9f8c0ebfc2b2f3dc6a60e72',
      },
    ];

    let closeTrade = {
      'tokenBuyDecimals': '18',
      'tokenSellDecimals': '18',
      'amount_taker': new BigNumber('2000000000000000000'),
      'amount_maker': new BigNumber('1000000000000000000'),
      'txHash': '0xb940a2fd1617351ff3bc5678b6af3c8cb553c516d40381978a455fe16287eaa5',
      'tokenSellLastPrice':  new BigNumber('0.5'),
      'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
    };

    let copyTrade = {
      'id': 16,
      'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
      'follower': '0xfb38e6973c2d6b33ca0d8d2d10107fa13def920a',
      'leader_tx_hash': '0xedb497dd39fae2ba2b13f07179ac6a8f1ac212076725beabbd96bc961cc13b50',
      'order_hash': '0x3676332dd7de1670e3f3fd086431bdfa9b06defb246e93b4196c620324964fc9',
    };

    let rewardAndFees = await feeProcessor.processPercentageFee(openTrades, copyTrade, closeTrade);
    console.log(rewardAndFees);
  });
});
