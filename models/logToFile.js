const logToFile = {};
const fs = require('fs');


logToFile.writeLog = function writeLog(filename, data) {
  fs.appendFileSync(filename, '[' + new Date().toISOString() + ']: ' + data + '\n');
};

module.exports = logToFile;
