'use strict';
const assert = require('power-assert');
const APIClient = require('../../index.js');
let sessionToken = null;

const CONFIG_ENV_TEST = {
    debug: false,
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
        });

        it('/v1.0/devices 查询设备', function (done) {
            let promise = client.getDevicesListUsingGET({
                // sessionToken: this.sessionToken,
                sessionToken: '93b771e7-7e8e-4cfb-8f09-105d1a1468e6',
                // deviceName: '',
                deviceOwner: '',
                pageNum: 1,
                pageSize: 10
            });
            promise.then(function (ret) {
                assert.ok(ret, processError(ret || {}, '查询设备失败'));
                console.log(ret);
                done();
            }).catch(function (e) {
                console.error(processError(e));
                done();
            });
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
