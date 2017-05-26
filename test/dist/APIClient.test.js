'use strict';
const assert = require('power-assert');
const APIClient = require('../../index.js');
const client = new APIClient();
let sessionToken = null;
const USER_INFO = {
    loginName: 'admin',
    password: 'admin',
    appToken: '59c33855-d089-487e-8c66-6e9e1121e0b1'
};

async function getSessionToken() {
    if (sessionToken) {
        return sessionToken;
    }
    let ret = await client.loginUsingGET(USER_INFO);
    sessionToken = ret.response.headers['session-token'];
    console.log('/v1.0/login 用户登录', sessionToken, ret.body);
    return sessionToken;
}

function processError(ret, msg) {
    let resp = ret.response;
    if (resp.statusCode == 200) {
        return;
    }
    return `Status:${resp.statusCode} | ${resp.statusText} | ${msg}`;
}

describe('dist/APIClient.js', function () {
    describe('用户相关API', function () {
        beforeEach(async function () {
            this.sessionToken = await getSessionToken();
        });
        it('/v1.0/users 查询用户列表', async function () {
            let ret = await client.getUsersUsingGET({
                sessionToken: this.sessionToken
            });
            assert.ok(ret.body, processError(ret, '查询用户列表失败'));
        });
    });
});
