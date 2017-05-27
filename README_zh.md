# 轻应用Baas API SDK

## 序
* [如何使用](#usage)
* [在线API接口文档](https://baas.heclouds.com/api/swagger-ui.html)

## [如何使用](usage)
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
## [在线API接口文档]()
[https://baas.heclouds.com/api/swagger-ui.html](https://baas.heclouds.com/api/swagger-ui.html)