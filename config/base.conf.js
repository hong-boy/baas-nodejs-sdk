'use strict';
const path = require('path');
const rootdir = path.join(__dirname, '..');

module.exports = {
    protocol: 'https',
    host: 'baas.heclouds.com',
    basePath: '/api',
    caPath: path.join(rootdir, 'config/baas-chinamobile.pem'),
    ca: '.\\\\dist\\\\baas-chinamobile.pem', //相对于dist目录
    className: 'APIClient',
    entry: path.join(rootdir, 'config/swagger-baas-sdk.json'),
    output: path.join(rootdir, 'dist/')
};
