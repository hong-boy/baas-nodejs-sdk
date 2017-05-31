# 轻应用Baas API SDK

[![build status][travis-image]][travis-url]
[![codecov.io][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]

[travis-image]: https://img.shields.io/travis/cnodejs/nodeclub/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/cnodejs/nodeclub
[codecov-image]: https://img.shields.io/codecov/c/github/cnodejs/nodeclub/master.svg?style=flat-square
[codecov-url]: https://codecov.io/github/cnodejs/nodeclub?branch=master
[david-image]: https://img.shields.io/david/cnodejs/nodeclub.svg?style=flat-square
[david-url]: https://david-dm.org/cnodejs/nodeclub
[node-image]: https://img.shields.io/badge/node.js-%3E=_4.2-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/

* [如何使用](#user-content-如何使用)
* [JS API文档](https://hong-boy.github.io/baas-nodejs-sdk/index.html)
* [REST API接口文档](https://baas.heclouds.com/api/swagger-ui.html)

## 如何使用
### 安装
```  
npm install --save baas-nodejs-sdk
```
### Usage（ES6/Promise）
```js 
var APIClient = require('baas-nodejs-sdk');
var client = new APIClient();

// 用户登录
var promise = client.loginUsingGET({
    loginName: '',
    password: '',
    appToken: ''
});

promise.then(function(ret){
    // 登录成功
    let resp = ret.response;
    let body = ret.body;
    // 获取session-token
    console.log('session-token: ', resp.headers['session-token']);
    // 获取数据
    console.log('data: ', body);
}).catch(function(err){
    // 登录失败
    let resp = err.resp;
    console.log(resp.statusCode, resp.statusMessage);
});

```

### Usage（ES7/async-await）
```js 
var APIClient = require('baas-nodejs-sdk');
var client = new APIClient();

// 用户登录
async function login(user){
    try{
        // 登录成功
        let ret = await client.loginUsingGET(user);
        let resp = ret.response;
        let body = ret.body;
        // 获取session-token
        console.log('session-token: ', resp.headers['session-token']);
        // 获取数据
        console.log('data: ', body);
    }catch(err){
        // 登录失败
        let resp = err.resp;
        console.log(resp.statusCode, resp.statusMessage);
    }
}

// 调用
login();

```