const Web3 = require('web3');
const abi = require('./abi/contract/abi.json');
const config = require('./config');


var redis = require("redis"), client = redis.createClient();

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.contract.provider),
);

const c8Contract = new web3.eth.Contract(
  abi,
  config.contract.address,
);

c8Contract.getPastEvents({
  fromBlock:  8800000,
  toBlock: 'latest'
}, (error, eventResult) => {
  if (error) {
    console.log('Error in myEvent event handler: ' + error);
  }
  console.log(eventResult);
  eventResult.forEach(function (entry) {
    if (entry.event === 'Follow' && entry.removed === false) {
      let leader = entry.returnValues.leader;
      let follower = entry.returnValues.follower;
      let percentage = entry.returnValues.percentage;
      console.log(leader, follower, percentage);
      client.hset('leader:'+leader, follower, percentage);
    }
  });

  let lastBlockNumber = '0';
  for (let i=0; i<eventResult.length; i++) {
    lastBlockNumber = (++eventResult[i].blockNumber).toString();
  }

  console.log('lastBlockNumber', lastBlockNumber);

}).then();

const follow = c8Contract.events
  .Follow((error, event) => {
    if (error) return console.error(error);
    console.log('Successfully followed!', event);

    if (event.event === 'Follow' && event.removed === false) {
      let leader = event.returnValues.leader;
      let follower = event.returnValues.follower;
      let percentage = event.returnValues.percentage;
      console.log(leader, follower, percentage);
      client.hset('leader:'+leader, follower, percentage);
    }

  })
  .on('error', console.error);

const unfollow = c8Contract.events
  .UnFollow((error, event) => {
    if (error) return console.error(error, 'sad');
    console.log('Successfully unfollowed!', event);
    if (event.event === 'UnFollow' && event.removed === false) {
      let leader = event.returnValues.leader;
      let follower = event.returnValues.follower;
      client.hdel('leader:'+leader, follower);
    }
  })
  .on('error', console.error);
