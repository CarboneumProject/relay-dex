const mysql = require("./mysql");
const trade = {};

trade.getAvailableTrade = async function getAvailableTrade(token, owner) {
  return await mysql.query(`
    SELECT *
    FROM carboneum.trade
    WHERE  maker_token = ? AND follower = ? AND amount_left != '0'
  `, [token, owner]);
};


trade.save = async function save(values) {
  return await mysql.query(`
    INSERT INTO trade VALUES ?;
  `, values);
};

trade.find = async function find(txHash) {
  return await mysql.query(`
    SELECT * FROM trade WHERE tx_hash = ?
  `, [txHash]);
};

module.exports = trade;
