const Web3 = require('web3');
const abi = require('./abi/socialtrading/SocialTrading.json');
const config = require('./config');
const network = config.getNetwork();

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(network.ws_url),
);

const c8Contract = new web3.eth.Contract(
  abi,
  network.socialtrading,
);

const follow = c8Contract.events.Follow({}, (error, event) => {
  const redis = require("redis"), client = redis.createClient();
  client.select(network.redis_db);
  if (error) return console.error(error);
  console.log('Successfully followed!', event);

  if (event.event === 'Follow' && event.removed === false) {
    let leader = event.returnValues.leader.toLowerCase();
    let follower = event.returnValues.follower.toLowerCase();
    let percentage = event.returnValues.percentage / 10 ** 18;
    client.hset('leader:' + leader, follower, percentage);
  }

}).on('error', function (error) {
  console.log('error: ', error);
  process.exit()
});


const unfollow = c8Contract.events.UnFollow({}, (error, event) => {
  const redis = require("redis"), client = redis.createClient();
  client.select(network.redis_db);
  if (error) return console.error(error, 'sad');
  console.log('Successfully unfollowed!', event);
  if (event.event === 'UnFollow' && event.removed === false) {
    let leader = event.returnValues.leader.toLowerCase();
    let follower = event.returnValues.follower.toLowerCase();
    client.hdel('leader:' + leader, follower);
  }
}).on('error', function (error) {
  console.log('error: ', error);
  process.exit()
});


