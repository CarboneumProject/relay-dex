const Web3 = require('web3');
const abi = require('./abi/socialtrading/SocialTrading.json');
const config = require('./config');
const Provider = config.getProvider();

var redis = require("redis"), client = redis.createClient();

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(Provider.ws_url),
);

const c8Contract = new web3.eth.Contract(
  abi,
  Provider.socialtrading,
);

c8Contract.getPastEvents({
  fromBlock:  3527027,  //block number when contract created.
  toBlock: 'latest'
}, (error, eventResult) => {
  if (error) {
    console.log('Error in myEvent event handler: ' + error);
  }
  eventResult.forEach(function (event) {
    if (event.event === 'Follow' && event.removed === false) {
      let leader = event.returnValues.leader.toLowerCase();
      let follower = event.returnValues.follower.toLowerCase();
      let percentage = event.returnValues.percentage;
      client.hset('leader:'+leader, follower, percentage);
    } else if (event.event === 'UnFollow' && event.removed === false) {
      let leader = event.returnValues.leader.toLowerCase();
      let follower = event.returnValues.follower.toLowerCase();
      client.hdel('leader:' + leader, follower);
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
      let leader = event.returnValues.leader.toLowerCase();
      let follower = event.returnValues.follower.toLowerCase();
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
      let leader = event.returnValues.leader.toLowerCase();
      let follower = event.returnValues.follower.toLowerCase();
      client.hdel('leader:'+leader, follower);
    }
  })
  .on('error', console.error);
