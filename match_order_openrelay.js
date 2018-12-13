const Web3 = require('web3');
const abi = require('./abi/openrelay/relay_deployed.json');
const config = require('./config');

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.zxExchangeContractKovan.provider),
);


const RelayContract = new web3.eth.Contract(
  abi,
  '0xfa2de623035c7e068d4346857bb62ce98aa7b728',
);

// console.log(web3.utils.toBN(18));
var order = Object.freeze({ senderAddress: '0xfa2de623035c7e068d4346857bb62ce98aa7b728',
  makerAddress: '0xa250a55a282af49809b7be653631f12603c3797b',
  takerAddress: '0x0000000000000000000000000000000000000000',
  makerFee: 0,
  takerFee: "200000000000000000",
  makerAssetAmount: "9000000000000000",
  takerAssetAmount: "100000000000000000",
  takerAssetData: '0xf47261b00000000000000000000000006ff6c0ff1d68b964901f986d4c9fa3ac68346570',
  makerAssetData: '0xf47261b0000000000000000000000000d0a1e359811322d97991e03f863a0c30c2cf029c',
  salt: 1544678259340,
  exchangeAddress: '0x35dd2932454449b14cee11a94d3674a936d5d7b2',
  feeRecipientAddress: '0xfaec02c3474b1a1c553eddf3df27946643cc7122',
  expirationTimeSeconds: 1544681859,
  signature: '0x1b4ae58f685f263828ca9d9ba4b02cd6549e0b5cd471dd80e65f66c0d8608679684d15647f65dc96ffac471c4950b0563a37a0bf028c59b803f6b53ceb9b8e015d03' });

let orderSignature = "0x1c50fee0c71b67d76d041e02bd06ec395e1e076d67d39819fad59c6f34da331c42576f41d6f645406ecedbf8140e008b477bbea6d791d48cf30c8004f2ab96aa8203";

let takerAssetFillAmount = "9000000000000000";
let salt = 1544678421207;
let takerSignature = "0x1c50fee0c71b67d76d041e02bd06ec395e1e076d67d39819fad59c6f34da331c42576f41d6f645406ecedbf8140e008b477bbea6d791d48cf30c8004f2ab96aa8203";

async function func(){
  console.log(await RelayContract.methods.owner().call());
  console.log(await RelayContract.methods.balanceOf('0xd0a1e359811322d97991e03f863a0c30c2cf029c', '0xe4d924bf3db10312cab7b29679c95f18dc2006ad').call());
  console.log(await RelayContract.methods.fillOrder(order, takerAssetFillAmount, salt, orderSignature, takerSignature).call());

}

func();
