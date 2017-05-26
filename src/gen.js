'use strict';
const fs = require('fs');
const path = require('path');
const CodeGen = require('swagger-js-codegen').CodeGen;
const conf = require('../config/base.conf.js');

let doc = JSON.parse(fs.readFileSync(conf.entry));

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

const code = CodeGen.getNodeCode({
    className: conf.className,
    swagger: doc,
    template: {
        class: fs.readFileSync(path.join(__dirname, 'template/node-class.mustache'), 'UTF-8'),
        method: fs.readFileSync(path.join(__dirname, 'template/method.mustache'), 'UTF-8')
    },
    mustache: {
        ca: conf.ca,
        domain: getDomain(doc, conf) // 将domain注入mustache
    }
});

fs.writeFile(`${conf.output}${conf.className}.js`, code, (err)=> {
    if (err) {
        throw err;
    }

    fs.writeFileSync(path.join(conf.output, 'baas-chinamobile.pem'), fs.readFileSync(conf.caPath));

    console.log('Build successfully!');
});
