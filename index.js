'use strict';
let conf = require('./config/base.conf.js');
module.exports = require(`./dist/${conf.className}`).APIClient;
