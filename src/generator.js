'use strict';
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const CodeGen = require('swagger-js-codegen').CodeGen;
const conf = require('../config/base.conf.js');

let doc = JSON.parse(fs.readFileSync(conf.doc));

/**
 * 获取domain
 * @param doc
 * @param conf
 * @returns {*}
 */
let getDomain = function (doc, conf) {
    let docHost = doc.host;
    let domain = `${conf.protocol}://${conf.host}${conf.basePath}`;
    if (!docHost) {
        console.warn(`Field [host] is not specified in swagger doc. Use ${domain} instead!`);
        return domain;
    }
    if (/^http(s)?:\/\//.test(docHost)) {
        domain = `${doc.host}${doc.basePath}`
    } else {
        console.warn(`The swagger doc didnt specify the protocol! Use ${conf.protocol} instead!`);
        domain = `${conf.protocol}://${doc.host}${doc.basePath}`;
    }
    console.log(domain);
    return domain;
};

/**
 * 任务 - 代码生成APIClient.js
 */
function task4CodeGen() {
    let code = CodeGen.getNodeCode({
        className: conf.className,
        swagger: doc,
        template: {
            class: fs.readFileSync(path.join(__dirname, 'template/node-class.mustache'), 'UTF-8'),
            method: fs.readFileSync(path.join(__dirname, 'template/method.mustache'), 'UTF-8')
        },
        mustache: {
            ca: conf.mustache.ca,
            domain: getDomain(doc, conf)
        }
    });

    // 输出到APIClient.js
    fs.writeFileSync(`${conf.dist}/${conf.className}.js`, code);
    console.log(`成功输出${conf.className}.js`);
}

/**
 * 任务 - 拷贝ca证书
 */
function task4CopyCA() {
    fs.writeFileSync(conf.ca.dest, fs.readFileSync(conf.ca.src));
    console.log(`成功拷贝CA证书`);
}

/**
 * 任务 - 生成index.js
 */
function task4IndexjsCodeGen() {
    let code = mustache.render(
        fs.readFileSync(path.join(__dirname, 'template/indexjs.mustache'), 'UTF-8'),
        conf.mustache.indexjs
    );

    // 输出到index.js
    fs.writeFileSync(`${conf.mustache.indexjs.dest}`, code);
    console.log('成功输出index.js');
}

/**
 * 构建
 */
function build() {
    task4CodeGen();
    task4IndexjsCodeGen();
    task4CopyCA();
    console.log('构建成功！');
}

build();
