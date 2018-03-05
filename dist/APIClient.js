/*jshint -W069 */
/**
 * lightapp API documentation
 * @class APIClient
 * @param {(string|object)} [domainOrOptions] - The project domain or options object. If object, see the object's optional properties.
 * @param {string} [domainOrOptions.domain] - The project domain
 * @param {object} [domainOrOptions.token] - auth token - object with value property and optional headerOrQueryName and isQuery properties
 */
var APIClient = (function() {
    'use strict';

    var request = require('request');
    var Q = require('q');
    var fs = require('fs');
    var path = require('path');
    var lodash = require('lodash');
    var crypto = require('crypto');
    var CryptoJS = require('crypto-js');
    var uuid = require('uuid');

    /**
     * 构造函数
     * @param{string} options.accessId - 密钥ID
     * @param{string} options.accessKey - 由平台系统和accessId一起生成，签名的密钥，严格保密只有平台方和用户知道
     * @param{string} options.domain - BaaS API服务地址（可选）
     * @param{string} options.ca - https证书（可选）
     * @param{boolean} options.debug - 是否启用debug模式（可以打印出日志）（可选）
     */
    function APIClient(options) {
        if (!lodash.isPlainObject(options) || !options.accessKey || !options.accessId) {
            throw Error('Illegal parameters: All of options.accessKey and options.accessId is required!');
        }
        var domain = options.domain;
        var ca = options.ca;

        this.debug = options.debug;
        this.accessKey = options.accessKey;
        this.accessId = options.accessId;
        this.domain = domain ? domain : 'https://demo.heclouds.com/';
        this.rejectUnauthorized = options.rejectUnauthorized !== false;

        if (/^https:\/\//.test(this.domain)) {
            this.ca = ca || fs.readFileSync(path.join(__dirname, './baas-chinamobile.pem')); // For https
        }
        if (this.domain.length === 0) {
            throw new Error('Domain parameter must be specified as a string.');
        }
    }

    /**
     * 日志记录
     * @param msg
     */
    function logger(ctx, msg) {
        if (ctx.debug) {
            console.log.apply(console, Array.prototype.slice.call(arguments, 1));
        }
    }

    /**
     * 包装请求参数
     * @param method
     * @param params
     * @param accessKey
     * @param accessId
     * @param req
     */
    function wrap4SignatureKey(method, params, accessKey, accessId, req) {
        if (!Object.keys(params).length) {
            logger(this, 'No parameters given', params);
        }
        delete params['sessionToken'];
        var authCode = genAuthCode.call(this, method, accessKey, accessId, undefined, params, undefined);
        logger(this, 'authCode: ', authCode);
        req.headers['authCode'] = authCode;
    }

    /**
     * 生成authCode
     * @param{string} requestMethod
     * @param{string} ak accessKey
     * @param{string} accessId
     * @param{string} nonce 随机字符串
     * @param{object} params
     * @param{string} timestamp
     * @returns {string} authCode（形如：accessId=EUqV2yIU&nonce=B2d1a32w112a3ldkKDKNEN&timestamp=1501661974308&signature=gGORxQcvvKG%2B2kp8%2FwgnRM5nvlA%3D）
     */
    function genAuthCode(requestMethod, ak, accessId, nonce, params, timestamp) {
        // 1. 获得authPerfixString
        var arr = [];
        arr.push('accessId=' + accessId);
        arr.push('nonce=' + (!nonce ? uuid.v1() : nonce));
        arr.push('timestamp=' + (!timestamp ? Date.now() : timestamp));
        var authPerfixString = arr.join('&');
        logger(this, 'authPrefixString: ', authPerfixString);

        // 2. 获得signature
        var signingKey = CryptoJS.HmacSHA1(authPerfixString, ak).toString(CryptoJS.enc.Base64);
        logger(this, 'signingKey: ', signingKey);

        // 3. 获取signatureContent
        arr = [];

        var paramsKeyArr = Object.keys(params).sort();
        for (var i = 0, len = paramsKeyArr.length; i < len; i++) {
            var paramsKey = paramsKeyArr[i];
            var value = params[paramsKey];
            value = lodash.isArray(value) || lodash.isPlainObject(value) ? JSON.stringify(value) : value;
            if (value || lodash.isNumber(value)) {
                arr.push([paramsKey, encodeURIComponent(value)].join('='));
            }
        }

        var signatureContent = requestMethod.toUpperCase() + '-' + arr.join('&');
        logger(this, 'signatureContent: ', signatureContent);

        // 4. 获得signature
        var signature = CryptoJS.HmacSHA1(signatureContent, signingKey).toString(CryptoJS.enc.Base64);
        return (authPerfixString + '&signature=' + encodeURIComponent(signature));
    }

    function mergeQueryParams(parameters, queryParameters) {
        if (parameters.$queryParameters) {
            Object.keys(parameters.$queryParameters)
                .forEach(function(parameterName) {
                    var parameter = parameters.$queryParameters[parameterName];
                    queryParameters[parameterName] = parameter;
                });
        }
        return queryParameters;
    }

    /**
     * HTTP Request
     * @method
     * @name APIClient#request
     * @param {object} options
     * @param {string} options.method - http method
     * @param {string} options.url - url to do request
     * @param {object} options.parameters
     * @param {object} options.body - body parameters / object
     * @param {object} options.headers - header parameters
     * @param {object} options.queryParameters - querystring parameters
     * @param {object} options.form - form data object
     * @param {object} deferred - promise object
     */
    APIClient.prototype.request = function(options, deferred) {
        var method = options.method,
            url = options.url,
            parameters = options.parameters,
            pathParameter = options.pathParameters,
            body = options.body,
            headers = options.headers,
            queryParameters = options.queryParameters,
            form = options.form;
        var req = {
            method: method,
            uri: this.domain + url,
            qs: queryParameters,
            headers: headers,
            body: body,
            rejectUnauthorized: this.rejectUnauthorized
        };

        wrap4SignatureKey.call(this, method, lodash.assign({}, pathParameter, queryParameters), this.accessKey, this.accessId, req);

        if (this.ca) {
            req.ca = this.ca;
        }

        if (Object.keys(form).length > 0) {
            req.form = form;
        }
        if (typeof(body) === 'object' && !(body instanceof Buffer)) {
            req.json = true;
        }
        logger(this, 'Request: ', JSON.stringify(req));
        request(req, function(error, response, body) {
            if (error) {
                logger(this, 'error: ', error.message);
                deferred.reject(error);
                return;
            }
            logger(this, 'Response: statusCode=%s | statusMessage=%s | body=%s',
                response.statusCode, response.statusMessage, JSON.stringify(body));
            if (/^application\/(.*\\+)?json/.test(response.headers['content-type'])) {
                try {
                    body = JSON.parse(body);
                } catch (e) {}
            }
            if (response.statusCode >= 200 && response.statusCode <= 299) {
                deferred.resolve({
                    status: response.statusCode,
                    statusMessage: response.statusMessage,
                    response: response,
                    body: body
                });
            } else {
                deferred.reject({
                    status: response.statusCode,
                    statusMessage: response.statusMessage,
                    response: response,
                    body: body
                });
            }
        });
    };

    /**
     * 根据sql删除外部数据
     * @method
     * @name APIClient#deleteExternalDataBySQLUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.mongoDataRequest - mongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteExternalDataBySQLUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteExternalDataBySQLUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/deleteExternalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['mongoDataRequest'] !== undefined) {
            body = parameters['mongoDataRequest'];
        }

        if (parameters['mongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: mongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备列表
     * @method
     * @name APIClient#getDevicesListUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceName - 设备名
     * @param {string} parameters.status - 设备状态
     * @param {string} parameters.groupId - 设备分组
     * @param {string} parameters.deviceOwner - 设备所有者loginName
     * @param {string} parameters.beginTime - 起始时间限制
     * @param {string} parameters.endTime - 结束时间限制
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDevicesListUsingGET_1 = function(parameters) {
        logger(this, '-------------getDevicesListUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceName'] !== undefined) {
            queryParameters['deviceName'] = parameters['deviceName'];
        }

        if (parameters['status'] !== undefined) {
            queryParameters['status'] = parameters['status'];
        }

        if (parameters['groupId'] !== undefined) {
            queryParameters['groupId'] = parameters['groupId'];
        }

        if (parameters['deviceOwner'] !== undefined) {
            queryParameters['deviceOwner'] = parameters['deviceOwner'];
        }

        if (parameters['beginTime'] !== undefined) {
            queryParameters['beginTime'] = parameters['beginTime'];
        }

        if (parameters['endTime'] !== undefined) {
            queryParameters['endTime'] = parameters['endTime'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 导入单个设备
     * @method
     * @name APIClient#addDeviceUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addDevice - addDevice
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDeviceUsingPOST_1 = function(parameters) {
        logger(this, '-------------addDeviceUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['addDevice'] !== undefined) {
            body = parameters['addDevice'];
        }

        if (parameters['addDevice'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: addDevice'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询单个设备档案
     * @method
     * @name APIClient#findSingleArchiveUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.archiveName - 档案类型
     * @param {string} parameters.archiveId - 设备档案ID
     */
    APIClient.prototype.findSingleArchiveUsingGET_1 = function(parameters) {
        logger(this, '-------------findSingleArchiveUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['archiveName'] !== undefined) {
            queryParameters['archiveName'] = parameters['archiveName'];
        }

        if (parameters['archiveId'] !== undefined) {
            queryParameters['archiveId'] = parameters['archiveId'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 新增设备档案
     * @method
     * @name APIClient#addArchivesUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addArchive - addArchive
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addArchivesUsingPOST_1 = function(parameters) {
        logger(this, '-------------addArchivesUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['addArchive'] !== undefined) {
            body = parameters['addArchive'];
        }

        if (parameters['addArchive'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: addArchive'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 修改设备档案
     * @method
     * @name APIClient#updateArchiveByIdUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.updateArchive - updateArchive
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateArchiveByIdUsingPUT_1 = function(parameters) {
        logger(this, '-------------updateArchiveByIdUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['updateArchive'] !== undefined) {
            body = parameters['updateArchive'];
        }

        if (parameters['updateArchive'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: updateArchive'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 删除设备档案
     * @method
     * @name APIClient#deleteArchivesUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.archiveName - 档案类型
     * @param {string} parameters.archiveId - 设备档案ID
     */
    APIClient.prototype.deleteArchivesUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteArchivesUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['archiveName'] !== undefined) {
            queryParameters['archiveName'] = parameters['archiveName'];
        }

        if (parameters['archiveId'] !== undefined) {
            queryParameters['archiveId'] = parameters['archiveId'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 根据设备id查询设备档案
     * @method
     * @name APIClient#findSingleArchiveByDeviceIdUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.archiveName - 档案类型
     * @param {string} parameters.deviceId - 设备ID
     */
    APIClient.prototype.findSingleArchiveByDeviceIdUsingGET_1 = function(parameters) {
        logger(this, '-------------findSingleArchiveByDeviceIdUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archivesByDeviceId';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['archiveName'] !== undefined) {
            queryParameters['archiveName'] = parameters['archiveName'];
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 删除设备档案
     * @method
     * @name APIClient#deleteArchiveByDeviceIdUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.archiveName - 档案类型
     * @param {string} parameters.deviceId - 设备ID
     */
    APIClient.prototype.deleteArchiveByDeviceIdUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteArchiveByDeviceIdUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archivesByDeviceId';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['archiveName'] !== undefined) {
            queryParameters['archiveName'] = parameters['archiveName'];
        }

        if (parameters['archiveName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: archiveName'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['deviceId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceId'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 分配设备
     * @method
     * @name APIClient#assignDevicesUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.assignDevice - assignDevice
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.assignDevicesUsingPUT_1 = function(parameters) {
        logger(this, '-------------assignDevicesUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/assign';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['assignDevice'] !== undefined) {
            body = parameters['assignDevice'];
        }

        if (parameters['assignDevice'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: assignDevice'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询命令状态列表
     * @method
     * @name APIClient#getCommandStatusListUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.commandName - 命令名称
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.deviceName - 设备名称
     * @param {string} parameters.status - 命令状态
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getCommandStatusListUsingGET_1 = function(parameters) {
        logger(this, '-------------getCommandStatusListUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/commands/send';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['commandName'] !== undefined) {
            queryParameters['commandName'] = parameters['commandName'];
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['deviceName'] !== undefined) {
            queryParameters['deviceName'] = parameters['deviceName'];
        }

        if (parameters['status'] !== undefined) {
            queryParameters['status'] = parameters['status'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 发送命令
     * @method
     * @name APIClient#sendCommandsUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.sendCommandRequest - sendCommandRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.sendCommandsUsingPOST_1 = function(parameters) {
        logger(this, '-------------sendCommandsUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/commands/send';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sendCommandRequest'] !== undefined) {
            body = parameters['sendCommandRequest'];
        }

        if (parameters['sendCommandRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sendCommandRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询命令状态
     * @method
     * @name APIClient#getCommandStatusByCmdUuidUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.cmdUuid - cmdUuid
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getCommandStatusByCmdUuidUsingGET_1 = function(parameters) {
        logger(this, '-------------getCommandStatusByCmdUuidUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/commands/send/{cmdUuid}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{cmdUuid}', parameters['cmdUuid']);
        pathParameters['cmdUuid'] = parameters['cmdUuid'];

        if (parameters['cmdUuid'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: cmdUuid'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备转授列表(仅超管可用)
     * @method
     * @name APIClient#getDeviceDelegationsListUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.fromUser - 转授人
     * @param {string} parameters.toUser - 被转授人
     * @param {string} parameters.startDate - 开始日期
     * @param {string} parameters.endDate - 截止日期
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceDelegationsListUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceDelegationsListUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['fromUser'] !== undefined) {
            queryParameters['fromUser'] = parameters['fromUser'];
        }

        if (parameters['toUser'] !== undefined) {
            queryParameters['toUser'] = parameters['toUser'];
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 新增设备转授
     * @method
     * @name APIClient#addDeviceDelegationsUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.request - request
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDeviceDelegationsUsingPOST_1 = function(parameters) {
        logger(this, '-------------addDeviceDelegationsUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['request'] !== undefined) {
            body = parameters['request'];
        }

        if (parameters['request'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: request'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询转授出去的设备列表
     * @method
     * @name APIClient#getDeviceDelegateOthersUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.loginName - 被转授人loginName
     * @param {string} parameters.userName - 被转授人userName
     * @param {string} parameters.startDate - 开始日期
     * @param {string} parameters.endDate - 截止日期
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceDelegateOthersUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceDelegateOthersUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/delegateOthers';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['loginName'] !== undefined) {
            queryParameters['loginName'] = parameters['loginName'];
        }

        if (parameters['userName'] !== undefined) {
            queryParameters['userName'] = parameters['userName'];
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询转授给自己的设备列表
     * @method
     * @name APIClient#getDeviceDelegateSelfUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.loginName - 转授人loginName
     * @param {string} parameters.userName - 转授人userName
     * @param {string} parameters.startDate - 开始日期
     * @param {string} parameters.endDate - 截止日期
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceDelegateSelfUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceDelegateSelfUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/delegateSelf';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['loginName'] !== undefined) {
            queryParameters['loginName'] = parameters['loginName'];
        }

        if (parameters['userName'] !== undefined) {
            queryParameters['userName'] = parameters['userName'];
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备转授
     * @method
     * @name APIClient#getDeviceDelegationsByIdUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.delegateId - delegateId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getDeviceDelegationsByIdUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceDelegationsByIdUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/{delegateId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{delegateId}', parameters['delegateId']);
        pathParameters['delegateId'] = parameters['delegateId'];

        if (parameters['delegateId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: delegateId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 收回设备转授
     * @method
     * @name APIClient#deleteDeviceDelegationsUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.delegateId - delegateId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteDeviceDelegationsUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteDeviceDelegationsUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/{delegateId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{delegateId}', parameters['delegateId']);
        pathParameters['delegateId'] = parameters['delegateId'];

        if (parameters['delegateId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: delegateId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 根据sql删除设备档案
     * @method
     * @name APIClient#deleteArchivesBySQLUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.findMongoDataRequest - findMongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteArchivesBySQLUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteArchivesBySQLUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/deleteArchives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['findMongoDataRequest'] !== undefined) {
            body = parameters['findMongoDataRequest'];
        }

        if (parameters['findMongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: findMongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 停用设备
     * @method
     * @name APIClient#disableDevicesByIdUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.disableDevicesByIdUsingPUT_1 = function(parameters) {
        logger(this, '-------------disableDevicesByIdUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/disable/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);
        pathParameters['deviceId'] = parameters['deviceId'];

        if (parameters['deviceId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 启用设备
     * @method
     * @name APIClient#enableDevicesByIdUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.enableDevicesByIdUsingPUT_1 = function(parameters) {
        logger(this, '-------------enableDevicesByIdUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/enable/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);
        pathParameters['deviceId'] = parameters['deviceId'];

        if (parameters['deviceId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 批量导入设备
     * @method
     * @name APIClient#addDevicesUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.deviceImport - deviceImport
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDevicesUsingPOST_1 = function(parameters) {
        logger(this, '-------------addDevicesUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/import';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['deviceImport'] !== undefined) {
            body = parameters['deviceImport'];
        }

        if (parameters['deviceImport'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceImport'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备信息
     * @method
     * @name APIClient#getDevicesByIdUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getDevicesByIdUsingGET_1 = function(parameters) {
        logger(this, '-------------getDevicesByIdUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/info/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);
        pathParameters['deviceId'] = parameters['deviceId'];

        if (parameters['deviceId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 编辑设备
     * @method
     * @name APIClient#updateDevicesUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {} parameters.updateDevice - updateDevice
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateDevicesUsingPUT_1 = function(parameters) {
        logger(this, '-------------updateDevicesUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/info/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);
        pathParameters['deviceId'] = parameters['deviceId'];

        if (parameters['deviceId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceId'));
            return deferred.promise;
        }

        if (parameters['updateDevice'] !== undefined) {
            body = parameters['updateDevice'];
        }

        if (parameters['updateDevice'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: updateDevice'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备日志列表
     * @method
     * @name APIClient#getDeviceLogsListUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.deviceName - 设备名称
     * @param {string} parameters.logType - 日志类型
     * @param {string} parameters.beginDate - 开始日期
     * @param {string} parameters.endDate - 结束日期
     * @param {string} parameters.userName - 用户名
     * @param {string} parameters.operator - 操作人
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceLogsListUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceLogsListUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/logs';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['deviceName'] !== undefined) {
            queryParameters['deviceName'] = parameters['deviceName'];
        }

        if (parameters['logType'] !== undefined) {
            queryParameters['logType'] = parameters['logType'];
        }

        if (parameters['beginDate'] !== undefined) {
            queryParameters['beginDate'] = parameters['beginDate'];
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['userName'] !== undefined) {
            queryParameters['userName'] = parameters['userName'];
        }

        if (parameters['operator'] !== undefined) {
            queryParameters['operator'] = parameters['operator'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询告警数据
     * @method
     * @name APIClient#findDeviceAlarmUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.findMongoDataRequest - findMongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findDeviceAlarmUsingPOST_1 = function(parameters) {
        logger(this, '-------------findDeviceAlarmUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/queryAlarms';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['findMongoDataRequest'] !== undefined) {
            body = parameters['findMongoDataRequest'];
        }

        if (parameters['findMongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: findMongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备档案列表
     * @method
     * @name APIClient#findArchivesUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.mongoDataRequest - mongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findArchivesUsingPOST_1 = function(parameters) {
        logger(this, '-------------findArchivesUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/queryArchives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['mongoDataRequest'] !== undefined) {
            body = parameters['mongoDataRequest'];
        }

        if (parameters['mongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: mongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询全局设备数据
     * @method
     * @name APIClient#findDeviceDataUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.mongoDataRequest - mongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findDeviceDataUsingPOST_1 = function(parameters) {
        logger(this, '-------------findDeviceDataUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/queryData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['mongoDataRequest'] !== undefined) {
            body = parameters['mongoDataRequest'];
        }

        if (parameters['mongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: mongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询统计数据
     * @method
     * @name APIClient#findStatisticsDataUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.findMongoDataRequest - findMongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findStatisticsDataUsingPOST_1 = function(parameters) {
        logger(this, '-------------findStatisticsDataUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/queryStats';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['findMongoDataRequest'] !== undefined) {
            body = parameters['findMongoDataRequest'];
        }

        if (parameters['findMongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: findMongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备分享信息列表(仅超管可用)
     * @method
     * @name APIClient#getDeviceSharesListUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.fromUser - 分享人
     * @param {string} parameters.toUser - 被分享人
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceSharesListUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceSharesListUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['fromUser'] !== undefined) {
            queryParameters['fromUser'] = parameters['fromUser'];
        }

        if (parameters['toUser'] !== undefined) {
            queryParameters['toUser'] = parameters['toUser'];
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 新增设备分享信息
     * @method
     * @name APIClient#addDeviceSharesUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.request - request
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDeviceSharesUsingPOST_1 = function(parameters) {
        logger(this, '-------------addDeviceSharesUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['request'] !== undefined) {
            body = parameters['request'];
        }

        if (parameters['request'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: request'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询分享出去的设备列表
     * @method
     * @name APIClient#getDeviceShareOthersUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceId - 设备id
     * @param {string} parameters.loginName - 被分享者登录名
     * @param {string} parameters.userName - 被分享者用户名
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceShareOthersUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceShareOthersUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/shareOthers';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['loginName'] !== undefined) {
            queryParameters['loginName'] = parameters['loginName'];
        }

        if (parameters['userName'] !== undefined) {
            queryParameters['userName'] = parameters['userName'];
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询分享给自己的设备列表
     * @method
     * @name APIClient#getDeviceShareSelfUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceId - 设备id
     * @param {string} parameters.loginName - 分享者登录名
     * @param {string} parameters.userName - 分享者用户名
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceShareSelfUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceShareSelfUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/shareSelf';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceId'] !== undefined) {
            queryParameters['deviceId'] = parameters['deviceId'];
        }

        if (parameters['loginName'] !== undefined) {
            queryParameters['loginName'] = parameters['loginName'];
        }

        if (parameters['userName'] !== undefined) {
            queryParameters['userName'] = parameters['userName'];
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备分享信息
     * @method
     * @name APIClient#getDeviceSharesByIdUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.shareId - shareId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getDeviceSharesByIdUsingGET_1 = function(parameters) {
        logger(this, '-------------getDeviceSharesByIdUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/{shareId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{shareId}', parameters['shareId']);
        pathParameters['shareId'] = parameters['shareId'];

        if (parameters['shareId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: shareId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 收回设备分享
     * @method
     * @name APIClient#deleteDeviceSharesUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.shareId - shareId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteDeviceSharesUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteDeviceSharesUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/{shareId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{shareId}', parameters['shareId']);
        pathParameters['shareId'] = parameters['shareId'];

        if (parameters['shareId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: shareId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 根据SQL语句修改设备档案
     * @method
     * @name APIClient#updateArchivesUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.findMongoDataRequest - findMongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateArchivesUsingPUT_1 = function(parameters) {
        logger(this, '-------------updateArchivesUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/updateArchives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['findMongoDataRequest'] !== undefined) {
            body = parameters['findMongoDataRequest'];
        }

        if (parameters['findMongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: findMongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 删除设备
     * @method
     * @name APIClient#deleteDevicesUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteDevicesUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteDevicesUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);
        pathParameters['deviceId'] = parameters['deviceId'];

        if (parameters['deviceId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 根据id查询某一条外部数据
     * @method
     * @name APIClient#findExternalDataByIdUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.id - 外部数据id
     * @param {string} parameters.externalDataName - 外部数据名
     */
    APIClient.prototype.findExternalDataByIdUsingGET_1 = function(parameters) {
        logger(this, '-------------findExternalDataByIdUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['id'] !== undefined) {
            queryParameters['id'] = parameters['id'];
        }

        if (parameters['id'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: id'));
            return deferred.promise;
        }

        if (parameters['externalDataName'] !== undefined) {
            queryParameters['externalDataName'] = parameters['externalDataName'];
        }

        if (parameters['externalDataName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: externalDataName'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 添加外部数据
     * @method
     * @name APIClient#addExternalDataUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addExternalData - addExternalData
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addExternalDataUsingPOST_1 = function(parameters) {
        logger(this, '-------------addExternalDataUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['addExternalData'] !== undefined) {
            body = parameters['addExternalData'];
        }

        if (parameters['addExternalData'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: addExternalData'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 修改外部数据
     * @method
     * @name APIClient#updateExternalDataByIdUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.updateExternalData - updateExternalData
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateExternalDataByIdUsingPUT_1 = function(parameters) {
        logger(this, '-------------updateExternalDataByIdUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['updateExternalData'] !== undefined) {
            body = parameters['updateExternalData'];
        }

        if (parameters['updateExternalData'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: updateExternalData'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 删除外部数据
     * @method
     * @name APIClient#deleteExternalDataUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.externalDataName - 外部数据名
     * @param {string} parameters.recordId - 外部数据id
     */
    APIClient.prototype.deleteExternalDataUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteExternalDataUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['externalDataName'] !== undefined) {
            queryParameters['externalDataName'] = parameters['externalDataName'];
        }

        if (parameters['externalDataName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: externalDataName'));
            return deferred.promise;
        }

        if (parameters['recordId'] !== undefined) {
            queryParameters['recordId'] = parameters['recordId'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询自定义权限
     * @method
     * @name APIClient#findCustomPermissionUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.customPermissionId - 自定义权限的id（不支持模糊查询）
     * @param {string} parameters.permissionName - 自定义权限名
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.findCustomPermissionUsingGET_1 = function(parameters) {
        logger(this, '-------------findCustomPermissionUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/extraPermissions';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['customPermissionId'] !== undefined) {
            queryParameters['customPermissionId'] = parameters['customPermissionId'];
        }

        if (parameters['permissionName'] !== undefined) {
            queryParameters['permissionName'] = parameters['permissionName'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询当前用户拥有的自定义权限
     * @method
     * @name APIClient#findCustomPermissionByUserUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findCustomPermissionByUserUsingGET_1 = function(parameters) {
        logger(this, '-------------findCustomPermissionByUserUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/extraPermissions/user';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 用户登录
     * @method
     * @name APIClient#loginUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     * @param {string} parameters.loginName - loginName
     * @param {string} parameters.password - password
     */
    APIClient.prototype.loginUsingPOST_1 = function(parameters) {
        logger(this, '-------------loginUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/login';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json,application/x-www-form-urlencoded'];

        if (parameters['appToken'] !== undefined) {
            form['appToken'] = parameters['appToken'];
        }

        if (parameters['appToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: appToken'));
            return deferred.promise;
        }

        if (parameters['loginName'] !== undefined) {
            form['loginName'] = parameters['loginName'];
        }

        if (parameters['loginName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: loginName'));
            return deferred.promise;
        }

        if (parameters['password'] !== undefined) {
            form['password'] = parameters['password'];
        }

        if (parameters['password'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: password'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 发送邮箱验证码
     * @method
     * @name APIClient#sendEmailVerificationUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     * @param {string} parameters.address - 邮箱地址
     * @param {string} parameters.invalid - 失效时间
     */
    APIClient.prototype.sendEmailVerificationUsingPOST_1 = function(parameters) {
        logger(this, '-------------sendEmailVerificationUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/mails/sendVerification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['appToken'] !== undefined) {
            queryParameters['appToken'] = parameters['appToken'];
        }

        if (parameters['appToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: appToken'));
            return deferred.promise;
        }

        if (parameters['address'] !== undefined) {
            queryParameters['address'] = parameters['address'];
        }

        if (parameters['address'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: address'));
            return deferred.promise;
        }

        if (parameters['invalid'] !== undefined) {
            queryParameters['invalid'] = parameters['invalid'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 验证邮箱验证码
     * @method
     * @name APIClient#emailVerificationUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.emailVerificationRequest - emailVerificationRequest
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.emailVerificationUsingPOST_1 = function(parameters) {
        logger(this, '-------------emailVerificationUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/mails/verification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['emailVerificationRequest'] !== undefined) {
            body = parameters['emailVerificationRequest'];
        }

        if (parameters['emailVerificationRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: emailVerificationRequest'));
            return deferred.promise;
        }

        if (parameters['appToken'] !== undefined) {
            queryParameters['appToken'] = parameters['appToken'];
        }

        if (parameters['appToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: appToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询外部数据
     * @method
     * @name APIClient#findExternalDataUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.findMongoDataRequest - findMongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findExternalDataUsingPOST_1 = function(parameters) {
        logger(this, '-------------findExternalDataUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/queryExternalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['findMongoDataRequest'] !== undefined) {
            body = parameters['findMongoDataRequest'];
        }

        if (parameters['findMongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: findMongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询离线统计数据
     * @method
     * @name APIClient#findStatTaskDataUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.findMongoDataRequest - findMongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findStatTaskDataUsingPOST_1 = function(parameters) {
        logger(this, '-------------findStatTaskDataUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/queryStatTaskData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['findMongoDataRequest'] !== undefined) {
            body = parameters['findMongoDataRequest'];
        }

        if (parameters['findMongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: findMongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
    * 查询表配置信息，返回格式：{
      "tableName": [
        {
          "field_desc": "求均值",
          "field_type": "6",
          "field_name": "avgZ"
           ......    }
       ......  ]
    }其中field_type，1：String；2：int；3：Float；4：Boolean；5：Long；6：Double；7：Date
    * @method
    * @name APIClient#findTableConfigUsingGET_1
    * @param {object} parameters - method options and parameters
         * @param {string} parameters.sessionToken - session-token
         * @param {integer} parameters.tableType - 表类型,2：转换数据；3：实时统计数据；4：告警数据；5：离线统计数据；6：外部数据；7：档案数据；
         * @param {string} parameters.tableName - 表名
    */
    APIClient.prototype.findTableConfigUsingGET_1 = function(parameters) {
        logger(this, '-------------findTableConfigUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/queryTableConfig';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['tableType'] !== undefined) {
            queryParameters['tableType'] = parameters['tableType'];
        }

        if (parameters['tableType'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: tableType'));
            return deferred.promise;
        }

        if (parameters['tableName'] !== undefined) {
            queryParameters['tableName'] = parameters['tableName'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 注册用户
     * @method
     * @name APIClient#registerUserUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.registerUserRequest - registerUserRequest
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.registerUserUsingPOST_1 = function(parameters) {
        logger(this, '-------------registerUserUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/register';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['registerUserRequest'] !== undefined) {
            body = parameters['registerUserRequest'];
        }

        if (parameters['registerUserRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: registerUserRequest'));
            return deferred.promise;
        }

        if (parameters['appToken'] !== undefined) {
            queryParameters['appToken'] = parameters['appToken'];
        }

        if (parameters['appToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: appToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询允许注册的角色
     * @method
     * @name APIClient#findRoleAllowRegUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.findRoleAllowRegUsingGET_1 = function(parameters) {
        logger(this, '-------------findRoleAllowRegUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/roles/allowReg';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['appToken'] !== undefined) {
            queryParameters['appToken'] = parameters['appToken'];
        }

        if (parameters['appToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: appToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询当前用户所能创建的角色
     * @method
     * @name APIClient#findRoleNameListUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findRoleNameListUsingGET_1 = function(parameters) {
        logger(this, '-------------findRoleNameListUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/roles/offSpringRole';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 发送短信验证码
     * @method
     * @name APIClient#sendSmsVerificationUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     * @param {string} parameters.mobile - 手机号码
     * @param {string} parameters.invalid - 失效时间
     */
    APIClient.prototype.sendSmsVerificationUsingPOST_1 = function(parameters) {
        logger(this, '-------------sendSmsVerificationUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/sms/sendVerification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['appToken'] !== undefined) {
            queryParameters['appToken'] = parameters['appToken'];
        }

        if (parameters['appToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: appToken'));
            return deferred.promise;
        }

        if (parameters['mobile'] !== undefined) {
            queryParameters['mobile'] = parameters['mobile'];
        }

        if (parameters['mobile'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: mobile'));
            return deferred.promise;
        }

        if (parameters['invalid'] !== undefined) {
            queryParameters['invalid'] = parameters['invalid'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 验证短信验证码
     * @method
     * @name APIClient#checkCommandScriptUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.smsVerificationRequest - smsVerificationRequest
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.checkCommandScriptUsingPOST_1 = function(parameters) {
        logger(this, '-------------checkCommandScriptUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/sms/verification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['smsVerificationRequest'] !== undefined) {
            body = parameters['smsVerificationRequest'];
        }

        if (parameters['smsVerificationRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: smsVerificationRequest'));
            return deferred.promise;
        }

        if (parameters['appToken'] !== undefined) {
            queryParameters['appToken'] = parameters['appToken'];
        }

        if (parameters['appToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: appToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询sql模版列表
     * @method
     * @name APIClient#getTemplatesUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.sqlTemplateName - sql模板名
     * @param {string} parameters.sqlType - 模板sql类型:（0：查询；1：新增；2：修改；3：删除）
     * @param {string} parameters.sqlTemplateType - 模板类型（1：默认模板；2：自定义模板）
     * @param {string} parameters.sqlTemplateName - 模板名（模糊查询）
     * @param {string} parameters.sqlDataTypes - 模板数据类型，多个用逗号隔开(2：转换数据；3：实时统计数据；4：告警数据；5：离线统计数据；6：外部数据；7：档案数据；8：档案和转换数据；9：统计数据、告警数据和外部数据)
     * @param {string} parameters.pageNum - 当前页
     * @param {string} parameters.pageSize - 每页多少条
     */
    APIClient.prototype.getTemplatesUsingGET_1 = function(parameters) {
        logger(this, '-------------getTemplatesUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/sqlTemplates';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['sqlTemplateName'] !== undefined) {
            queryParameters['sqlTemplateName'] = parameters['sqlTemplateName'];
        }

        if (parameters['sqlType'] !== undefined) {
            queryParameters['sqlType'] = parameters['sqlType'];
        }

        if (parameters['sqlTemplateType'] !== undefined) {
            queryParameters['sqlTemplateType'] = parameters['sqlTemplateType'];
        }

        if (parameters['sqlTemplateName'] !== undefined) {
            queryParameters['sqlTemplateName'] = parameters['sqlTemplateName'];
        }

        if (parameters['sqlDataTypes'] !== undefined) {
            queryParameters['sqlDataTypes'] = parameters['sqlDataTypes'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询指定sql模版
     * @method
     * @name APIClient#findTemplateByIdUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.sqlTemplateId - sqlTemplateId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findTemplateByIdUsingGET_1 = function(parameters) {
        logger(this, '-------------findTemplateByIdUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/sqlTemplates/{sqlTemplateId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{sqlTemplateId}', parameters['sqlTemplateId']);
        pathParameters['sqlTemplateId'] = parameters['sqlTemplateId'];

        if (parameters['sqlTemplateId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sqlTemplateId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 根据sql修改外部数据
     * @method
     * @name APIClient#updateExternalDataUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.mongoDataRequest - mongoDataRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateExternalDataUsingPUT_1 = function(parameters) {
        logger(this, '-------------updateExternalDataUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/updateExternalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['mongoDataRequest'] !== undefined) {
            body = parameters['mongoDataRequest'];
        }

        if (parameters['mongoDataRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: mongoDataRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询用户列表
     * @method
     * @name APIClient#getUsersUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.loginName - 登录名
     * @param {string} parameters.status - 状态
     * @param {string} parameters.email - 邮箱
     * @param {string} parameters.mobile - 手机
     * @param {string} parameters.roleId - 角色Id
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getUsersUsingGET_1 = function(parameters) {
        logger(this, '-------------getUsersUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['loginName'] !== undefined) {
            queryParameters['loginName'] = parameters['loginName'];
        }

        if (parameters['status'] !== undefined) {
            queryParameters['status'] = parameters['status'];
        }

        if (parameters['email'] !== undefined) {
            queryParameters['email'] = parameters['email'];
        }

        if (parameters['mobile'] !== undefined) {
            queryParameters['mobile'] = parameters['mobile'];
        }

        if (parameters['roleId'] !== undefined) {
            queryParameters['roleId'] = parameters['roleId'];
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 增加用户
     * @method
     * @name APIClient#insertUserUsingPOST_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addUserRequest - addUserRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.insertUserUsingPOST_1 = function(parameters) {
        logger(this, '-------------insertUserUsingPOST_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['addUserRequest'] !== undefined) {
            body = parameters['addUserRequest'];
        }

        if (parameters['addUserRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: addUserRequest'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'POST',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 编辑子用户
     * @method
     * @name APIClient#updateUserUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.updateUserRequest - updateUserRequest
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateUserUsingPUT_1 = function(parameters) {
        logger(this, '-------------updateUserUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/child/{userId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['updateUserRequest'] !== undefined) {
            body = parameters['updateUserRequest'];
        }

        if (parameters['updateUserRequest'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: updateUserRequest'));
            return deferred.promise;
        }

        path = path.replace('{userId}', parameters['userId']);
        pathParameters['userId'] = parameters['userId'];

        if (parameters['userId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: userId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 删除子用户
     * @method
     * @name APIClient#deleteUserByUserIdUsingDELETE_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteUserByUserIdUsingDELETE_1 = function(parameters) {
        logger(this, '-------------deleteUserByUserIdUsingDELETE_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/child/{userId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);
        pathParameters['userId'] = parameters['userId'];

        if (parameters['userId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: userId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'DELETE',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 修改密码
     * @method
     * @name APIClient#updatePasswordUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {} parameters.password - password
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updatePasswordUsingPUT_1 = function(parameters) {
        logger(this, '-------------updatePasswordUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/updatePassword';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['password'] !== undefined) {
            body = parameters['password'];
        }

        if (parameters['password'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: password'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询单个用户
     * @method
     * @name APIClient#getUserByUserIdUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getUserByUserIdUsingGET_1 = function(parameters) {
        logger(this, '-------------getUserByUserIdUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);
        pathParameters['userId'] = parameters['userId'];

        if (parameters['userId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: userId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 查询子用户列表
     * @method
     * @name APIClient#queryChildInfoUsingGET_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.queryChildInfoUsingGET_1 = function(parameters) {
        logger(this, '-------------queryChildInfoUsingGET_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/childQuery';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);
        pathParameters['userId'] = parameters['userId'];

        if (parameters['userId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: userId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['pageNum'] !== undefined) {
            queryParameters['pageNum'] = parameters['pageNum'];
        }

        if (parameters['pageSize'] !== undefined) {
            queryParameters['pageSize'] = parameters['pageSize'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'GET',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 停用子用户
     * @method
     * @name APIClient#disableUserUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.disableUserUsingPUT_1 = function(parameters) {
        logger(this, '-------------disableUserUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/disable';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);
        pathParameters['userId'] = parameters['userId'];

        if (parameters['userId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: userId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 启用子用户
     * @method
     * @name APIClient#enableUserUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.enableUserUsingPUT_1 = function(parameters) {
        logger(this, '-------------enableUserUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/enable';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);
        pathParameters['userId'] = parameters['userId'];

        if (parameters['userId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: userId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };
    /**
     * 重置子用户密码
     * @method
     * @name APIClient#resetPasswordUsingPUT_1
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.resetPasswordUsingPUT_1 = function(parameters) {
        logger(this, '-------------resetPasswordUsingPUT_1---------------');
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/resetPassword';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {},
            pathParameters = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);
        pathParameters['userId'] = parameters['userId'];

        if (parameters['userId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: userId'));
            return deferred.promise;
        }

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);
        logger(this, 'Parameter.pathParameters: ', pathParameters);
        logger(this, 'Parameter.queryParamters: ', queryParameters);
        this.request({
            method: 'PUT',
            url: path,
            pathParameters: pathParameters,
            parameters: parameters,
            body: body,
            headers: headers,
            queryParameters: queryParameters,
            form: form
        }, deferred);

        return deferred.promise;
    };

    return APIClient;
})();

module.exports = APIClient;