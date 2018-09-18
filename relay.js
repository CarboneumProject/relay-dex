const Web3 = require('web3');
const abi = require('./abi.json');
const config = require('./config');

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.contract.provider),
);

const c8Contract = new web3.eth.Contract(
  abi,
  config.contract.address,
);

const follow = c8Contract.events
  .Follow((error, event) => {
    if (error) return console.error(error);
    console.log('Successfully followed!', event);
  })
  .on('data', event => {
    console.log(event); // same results as the optional callback above
  })
  .on('error', console.error);

const unfollow = c8Contract.events
  .UnFollow((error, event) => {
    if (error) return console.error(error, 'sad');
    console.log('Successfully unfollowed!', event);
  })
  .on('data', event => {
    console.log(event); // same results as the optional callback above
  })
  .on('error', console.error);
