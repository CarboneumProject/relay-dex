const BigNumber = require('bignumber.js');
const feeProcessor = require('../feeProcessor');
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const c8LastPrice = new BigNumber(0.001);
const c8Decimals = new BigNumber(18);

describe('feeProcessor', function () {
  it('should able to calculate fee for 1 order with same amount and price and no fee will paid', async function () {
    let openTrades = [
      {
        'id': 1,
        'order_time': '2019-03-05T06:59:18.000Z',
        'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
        'follower': '0xfb38e6973c2d6b33ca0d8d2d10107fa13def920a',
        'maker_token': '0xd42debe4edc92bd5a3fbb4243e1eccf6d63a4a5d',
        'taker_token': '0x0000000000000000000000000000000000000000',
        'amount_maker': new BigNumber('8000000000000000000'),
        'amount_taker': new BigNumber('1000000000000000000'),
        'amount_left': new BigNumber('8000000000000000000'),
        'order_hash': '0x2ae1c63636d950958069ad244e297be3e5a41211eb9eb6f80d304aa74b2172a6',
        'tx_hash': '0xe31c54436285089e75749c59b2c0b365c340f575af464a63c2f7b4f42e35f156',
        'leader_tx_hash': '0xa533ee10a57f9def52fc664ee1c00e37d5780eb31b371dd00d28719efed16eb8',
      },
    ];

    let closeTrade = {
      'tokenBuyDecimals': '18',
      'tokenSellDecimals': '18',
      'amount_taker': new BigNumber('8000000000000000000'),
      'amount_maker': new BigNumber('1000000000000000000'),
      'txHash': '0xaea9d878d8cd293421292a1c2c89fb41052607e6d21b00a50697f1ac5f583a33',
      'tokenSellLastPrice': new BigNumber('0.125'),
      'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
    };

    let copyTrade = {
      'id': 2,
      'leader': '0x2d3119024507f18e6327e4b59868a899c37d2ec8',
      'follower': '0xfb38e6973c2d6b33ca0d8d2d10107fa13def920a',
      'leader_tx_hash': '0x2958b1617c02445606972b64159ae891a5e8496517fda74ac9ffd0f1d5841f0d',
      'order_hash': '0x3d236e9f45bffc69c3db9ff8a9bc553d2639cd187dee7c868caca0f9e6aaa404',
    };

    let rewardAndFees = await feeProcessor.processPercentageFee(openTrades, copyTrade, closeTrade, c8LastPrice, c8Decimals);
    rewardAndFees['sumC8FEE'].should.be.bignumber.equal(new BigNumber(0));
  });
});
