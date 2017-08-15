'use strict';
const assert = require('power-assert');
const APIClient = require('../../index.js');
let sessionToken = null;

const CONFIG_ENV_TEST = {
    //domain: 'https://172.19.3.140:8765/rest',
    domain: 'http://172.19.3.138:6549',
    accessId: 'EUqV2yIU',
    accessKey: '3d41e13190eb42569cf2068e842c23fc',
    user: {
        loginName: 'admin',
        password: '123456',
        appToken: '862cc132-f764-4dd7-8a94-db303c454b43'
        //password: 'admin',
        //appToken: '59c33855-d089-487e-8c66-6e9e1121e0b1'
    }
};

const client = new APIClient(CONFIG_ENV_TEST);

async function getSessionToken() {
    if (sessionToken) {
        return sessionToken;
    }
    try {
        let ret = await client.loginUsingGET(CONFIG_ENV_TEST.user);
        sessionToken = ret.response.headers['session-token'];
        console.log('/v1.0/login 用户登录', sessionToken, ret.body);
        return sessionToken;
    } catch (e) {
        processError(ret);
    }
}

function processError(ret, msg) {
    let resp = ret.response;
    if (resp.statusCode == 200) {
        return;
    }
    return `Status:${resp.statusCode} | ${resp.statusMessage} | ${msg}`;
}

describe('dist/APIClient.js', function () {
    describe('用户相关API', function () {
        beforeEach(async function () {
            this.sessionToken = await getSessionToken();
        });
        //it('/v1.0/users 查询用户列表', async function () {
        //    debugger;
        //    let ret = await client.getUsersUsingGET({
        //        sessionToken: this.sessionToken
        //    });
        //    debugger;
        //    assert.ok(ret.body, processError(ret, '查询用户列表失败'));
        //});
        it('/v1.0/users 查询用户列表', function (done) {
            debugger;
            let promise = client.getUsersUsingGET({
                sessionToken: this.sessionToken,
                //email: '1232@qq.com'
            });
            promise.then(function (ret) {
                assert.ok(ret, processError(ret, '查询用户列表失败'));
                done();
            }).catch(function (e) {
                console.log(e);
                done();
            })

        });
    });
});
