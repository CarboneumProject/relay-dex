const utils = {};
const numeral = require('numeral');

const FLOATING_DECIMAL = 4;

utils.decimalFormat = function decimalFormat(decimal, amount) {
  let repeatFront = '0'.repeat(FLOATING_DECIMAL);
  if (decimal <= FLOATING_DECIMAL) {
    return numeral(amount / Math.pow(10, decimal)).format(`0,0.${repeatFront}`);
  } else {
    let repeatDecimal = '0'.repeat(decimal - FLOATING_DECIMAL);
    return numeral(amount / Math.pow(10, decimal)).format(`0,0.${repeatFront}[${repeatDecimal}]`);
  }
};

module.exports = utils;
