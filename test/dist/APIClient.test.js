'use strict';
const assert = require('power-assert');
const APIClient = require('../../index.js');
let sessionToken = null;

const CONFIG_ENV_TEST = {
    debug: false,
    domain: 'http://demo.heclouds.com/baasapi/',
    accessId: 'PZwI2qTh',
    accessKey: '7896620c92b54d93a21bdea5b5aff2f2',
    user: {
        loginName: 'root',
        password: 'abcd1234',
        appToken: 'f8effd1a-17e3-4ed9-a893-1c002e8c78d2'
    }
};

const client = new APIClient(CONFIG_ENV_TEST);

async function getSessionToken() {
    if (sessionToken) {
        return sessionToken;
    }
    try {
        let ret = await client.loginUsingPOST(CONFIG_ENV_TEST.user);
        sessionToken = ret.response.headers['session-token'];
        console.log('用户登录', sessionToken, ret.body);
        return sessionToken;
    } catch (e) {
        processError(e);
    }
}

function processError(ret, msg) {
    if (ret.status) {
        return `Status:${ret.status} | ${ret.statusMessage} | ${msg}`;
    } else {
        return `Error:${ret} | ${msg}`
    }
}

describe('dist/APIClient.js', function () {
    describe('设备相关API', function () {
        beforeEach(async function () {
            this.sessionToken = await getSessionToken();
            console.log(this.sessionToken);
        });

        it('/v1.0/devices 查询设备', async function () {
            let sessionToken = await getSessionToken();
            try {
                let ret = await client.getDevicesListUsingGET({
                    sessionToken,
                    deviceOwner: '',
                    pageNum: 1,
                    pageSize: 10
                });
                assert.ok(ret, processError(ret || {}, '查询设备失败'));
                console.log(ret);
            } catch (e) {
                console.error(processError(e));
            }
        });

        //it('/v1.0/devices 导入单个设备', function (done) {
        //    let promise = client.addDeviceUsingPOST({
        //        sessionToken: this.sessionToken,
        //        addDevice: {
        //            masterKey: '2323',
        //            apiKey: '2323243',
        //            deviceId: 'ewwr123',
        //            deviceName: 'wetret',
        //            deviceOwner: 'manager',
        //            deviceGroupId: 0
        //        }
        //    });
        //    promise.then(function (ret) {
        //        assert.ok(ret, processError(ret || {}, '导入单个设备失败'));
        //        done();
        //    }).catch(function (e) {
        //        //console.log(e);
        //        done();
        //    })
        //});
    });
});
