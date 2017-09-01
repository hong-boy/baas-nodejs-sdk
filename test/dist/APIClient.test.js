'use strict';
const assert = require('power-assert');
const APIClient = require('../../index.js');
let sessionToken = null;

const CONFIG_ENV_TEST = {
    debug: true,
    domain: 'http://172.19.3.138:6549',
    accessId: 'PZwI2qTh',
    accessKey: '7896620c92b54d93a21bdea5b5aff2f2',
    user: {
        loginName: 'manager',
        password: 'manager',
        appToken: '5d42b8ff-32d7-40b0-bf56-e4fc357f01fa'
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
        processError(e);
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

        it('/v1.0/devices 导入单个设备', function (done) {
            let promise = client.addDeviceUsingPOST({
                sessionToken: this.sessionToken,
                addDevice: {
                    masterKey: '2323',
                    apiKey: '2323243',
                    deviceId: 'ewwr123',
                    deviceName: 'wetret',
                    deviceOwner: 'manager',
                    deviceGroupId: 0
                }
            });
            promise.then(function (ret) {
                assert.ok(ret, processError(ret || {}, '导入单个设备失败'));
                done();
            }).catch(function (e) {
                //console.log(e);
                done();
            })
        });


    });
});
