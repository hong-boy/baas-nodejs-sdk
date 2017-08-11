'use strict';
const path = require('path');
const rootdir = path.join(__dirname, '..');

let config4Dev = {
    protocol: 'https',
    host: '172.19.3.140:8765',
    basePath: '/rest',
};

let config = {
    protocol: 'https',
    host: 'baas.heclouds.com',
    basePath: '/api',
    className: 'APIClient',
    caName: 'baas-chinamobile.pem', // ca证书名
    doc: path.join(rootdir, 'config/swagger-baas-sdk.json'), // Swagger document
    dist: path.join(rootdir, 'dist/') // 默认输出路径
};

module.exports = Object.assign(config, config4Dev, {
    ca: {// ca证书配置
        src: path.join(rootdir, 'config', config.caName),
        dest: path.join(config.dist, config.caName) // ca证书输出路径
    },
    mustache: {// mustache变量
        ca: `./${config.caName}`,
        indexjs: {// indexjs.mustache变量
            className: config.className,
            requirePath: `./dist/${config.className}.js`,
            dest: path.join(config.dist, '../index.js') // index.js输出路径
        }
    }
});
