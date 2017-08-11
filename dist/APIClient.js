/*jshint -W069 */
/**
 * lightapp API documentation
 * @class APIClient
 * @param {(string|object)} [domainOrOptions] - The project domain or options object. If object, see the object's optional properties.
 * @param {string} [domainOrOptions.domain] - The project domain
 * @param {object} [domainOrOptions.token] - auth token - object with value property and optional headerOrQueryName and isQuery properties
 */
var APIClient = (function () {
    'use strict';

    var request = require('request');
    var Q = require('q');
    var fs = require('fs');
    var path = require('path');

    function APIClient(options) {
        var domain = (typeof options === 'object') ? options.domain : options;
        var ca = (typeof options === 'object') ? options.ca : null;
        this.domain = domain ? domain : 'https://baas.heclouds.com/api';
        if (/^https:\/\//.test(this.domain)) {
            this.ca = ca || fs.readFileSync(path.join(__dirname, './baas-chinamobile.pem')); // For https
        }
        if (this.domain.length === 0) {
            throw new Error('Domain parameter must be specified as a string.');
        }
    }

    function mergeQueryParams(parameters, queryParameters) {
        if (parameters.$queryParameters) {
            Object.keys(parameters.$queryParameters)
                .forEach(function (parameterName) {
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
     * @param {string} method - http method
     * @param {string} url - url to do request
     * @param {object} parameters
     * @param {object} body - body parameters / object
     * @param {object} headers - header parameters
     * @param {object} queryParameters - querystring parameters
     * @param {object} form - form data object
     * @param {object} deferred - promise object
     */
    APIClient.prototype.request = function (method, url, parameters, body, headers, queryParameters, form, deferred) {
        var req = {
            method: method,
            uri: this.domain + url,
            qs: queryParameters,
            headers: headers,
            body: body
        };

        if (this.ca) {
            req.ca = this.ca;
        }

        if (Object.keys(form).length > 0) {
            req.form = form;
        }
        if (typeof(body) === 'object' && !(body instanceof Buffer)) {
            req.json = true;
        }
        request(req, function (error, response, body) {
            if (error) {
                deferred.reject(error);
            } else {
                if (/^application\/(.*\\+)?json/.test(response.headers['content-type'])) {
                    try {
                        body = JSON.parse(body);
                    } catch (e) {
                    }
                }
                if (response.statusCode === 204) {
                    deferred.resolve({
                        response: response
                    });
                } else if (response.statusCode >= 200 && response.statusCode <= 299) {
                    deferred.resolve({
                        response: response,
                        body: body
                    });
                } else {
                    deferred.reject({
                        response: response,
                        body: body
                    });
                }
            }
        });
    };

    /**
     * 查询设备列表
     * @method
     * @name APIClient#getDevicesListUsingGET
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
    APIClient.prototype.getDevicesListUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 导入单个设备
     * @method
     * @name APIClient#addDeviceUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addDevice - addDevice
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDeviceUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询告警数据
     * @method
     * @name APIClient#findDeviceAlarmUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.alarmName - 告警数据名
     * @param {string} parameters.deviceIds - 设备id
     * @param {string} parameters.filters - 过滤条件
     * @param {string} parameters.limit - 数量限制
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     */
    APIClient.prototype.findDeviceAlarmUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/alarms';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['alarmName'] !== undefined) {
            queryParameters['alarmName'] = parameters['alarmName'];
        }

        if (parameters['alarmName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: alarmName'));
            return deferred.promise;
        }

        if (parameters['deviceIds'] !== undefined) {
            queryParameters['deviceIds'] = parameters['deviceIds'];
        }

        if (parameters['filters'] !== undefined) {
            queryParameters['filters'] = parameters['filters'];
        }

        if (parameters['limit'] !== undefined) {
            queryParameters['limit'] = parameters['limit'];
        }

        if (parameters['limit'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: limit'));
            return deferred.promise;
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['startDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: startDate'));
            return deferred.promise;
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['endDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: endDate'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备档案列表
     * @method
     * @name APIClient#findArchivesUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.archiveName - 设备档案类型
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.deviceOwner - 设备拥有人loginName
     * @param {string} parameters.limit - 最大查询数据量
     */
    APIClient.prototype.findArchivesUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        if (parameters['deviceOwner'] !== undefined) {
            queryParameters['deviceOwner'] = parameters['deviceOwner'];
        }

        if (parameters['limit'] !== undefined) {
            queryParameters['limit'] = parameters['limit'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 新增设备档案
     * @method
     * @name APIClient#addArchivesUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addArchive - addArchive
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addArchivesUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 修改设备档案
     * @method
     * @name APIClient#updateArchivesUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {} parameters.updateArchive - updateArchive
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateArchivesUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 删除设备档案
     * @method
     * @name APIClient#deleteArchivesUsingDELETE
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.archiveName - 档案类型
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.archiveId - 设备档案ID
     */
    APIClient.prototype.deleteArchivesUsingDELETE = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        if (parameters['archiveId'] !== undefined) {
            queryParameters['archiveId'] = parameters['archiveId'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('DELETE', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备档案
     * @method
     * @name APIClient#findSingleArchiveUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.archiveId - archiveId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findSingleArchiveUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/archives/{archiveId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{archiveId}', parameters['archiveId']);

        if (parameters['archiveId'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: archiveId'));
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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询命令状态列表
     * @method
     * @name APIClient#getCommandStatusListUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.commandName - 命令名称
     * @param {string} parameters.deviceId - 设备ID
     * @param {string} parameters.deviceName - 设备名称
     * @param {string} parameters.status - 命令状态
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getCommandStatusListUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/commands/sendings';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 发送命令
     * @method
     * @name APIClient#sendCommandsUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.sendCommandRequest - sendCommandRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.sendCommandsUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/commands/sendings';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询命令状态
     * @method
     * @name APIClient#getCommandStatusByCmdUuidUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.cmdUuid - cmd_uuid
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getCommandStatusByCmdUuidUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/commands/sendings/{cmd_uuid}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{cmd_uuid}', parameters['cmdUuid']);

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询全局设备数据
     * @method
     * @name APIClient#findDeviceDatasUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceDataName - 设备数据名
     * @param {string} parameters.deviceIds - 设备id
     * @param {string} parameters.filters - 过滤条件
     * @param {string} parameters.limit - 数量限制
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     */
    APIClient.prototype.findDeviceDatasUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/datas';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['deviceDataName'] !== undefined) {
            queryParameters['deviceDataName'] = parameters['deviceDataName'];
        }

        if (parameters['deviceDataName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceDataName'));
            return deferred.promise;
        }

        if (parameters['deviceIds'] !== undefined) {
            queryParameters['deviceIds'] = parameters['deviceIds'];
        }

        if (parameters['filters'] !== undefined) {
            queryParameters['filters'] = parameters['filters'];
        }

        if (parameters['limit'] !== undefined) {
            queryParameters['limit'] = parameters['limit'];
        }

        if (parameters['limit'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: limit'));
            return deferred.promise;
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['startDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: startDate'));
            return deferred.promise;
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['endDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: endDate'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询单个设备数据
     * @method
     * @name APIClient#findSingleDeviceDatasUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.deviceDataName - 设备数据名
     * @param {string} parameters.filters - 过滤条件
     * @param {string} parameters.limit - 数量限制
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     */
    APIClient.prototype.findSingleDeviceDatasUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/datas/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);

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

        if (parameters['deviceDataName'] !== undefined) {
            queryParameters['deviceDataName'] = parameters['deviceDataName'];
        }

        if (parameters['deviceDataName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: deviceDataName'));
            return deferred.promise;
        }

        if (parameters['filters'] !== undefined) {
            queryParameters['filters'] = parameters['filters'];
        }

        if (parameters['limit'] !== undefined) {
            queryParameters['limit'] = parameters['limit'];
        }

        if (parameters['limit'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: limit'));
            return deferred.promise;
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['startDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: startDate'));
            return deferred.promise;
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['endDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: endDate'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备转授列表
     * @method
     * @name APIClient#getDeviceDelegationsListUsingGET
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
    APIClient.prototype.getDeviceDelegationsListUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 新增设备转授
     * @method
     * @name APIClient#addDeviceDelegationsUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.request - request
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDeviceDelegationsUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询转授出去的设备列表
     * @method
     * @name APIClient#getDeviceDelegateOthersUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.loginName - 被转授人loginName
     * @param {string} parameters.userName - 被转授人userName
     * @param {string} parameters.startDate - 开始日期
     * @param {string} parameters.endDate - 截止日期
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceDelegateOthersUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/delegateOthers';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询转授自己的设备列表
     * @method
     * @name APIClient#getDeviceDelegateSelfUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.loginName - 转授人loginName
     * @param {string} parameters.userName - 转授人userName
     * @param {string} parameters.startDate - 开始日期
     * @param {string} parameters.endDate - 截止日期
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceDelegateSelfUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/delegateSelf';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备转授
     * @method
     * @name APIClient#getDeviceDelegationsByIdUsingGET
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.delegateId - delegateId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getDeviceDelegationsByIdUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/{delegateId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{delegateId}', parameters['delegateId']);

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 收回设备转授
     * @method
     * @name APIClient#deleteDeviceDelegationsUsingDELETE
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.delegateId - delegateId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteDeviceDelegationsUsingDELETE = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/delegations/{delegateId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{delegateId}', parameters['delegateId']);

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

        this.request('DELETE', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 停用设备
     * @method
     * @name APIClient#disableDevicesByIdUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.disableDevicesByIdUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/disable/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 启用设备
     * @method
     * @name APIClient#enableDevicesByIdUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.enableDevicesByIdUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/enable/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 批量导入设备
     * @method
     * @name APIClient#addDevicesUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.deviceImport - deviceImport
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDevicesUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/import';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备信息
     * @method
     * @name APIClient#getDevicesByIdUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getDevicesByIdUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/info/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);

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

        let signatureParam = Object.assign({}, queryParameters, form, body, parameters);
        delete signatureParam['sessionToken'];
        let accessId = 'EUqV2yIU';
        let nonce = 'B2d1a32w112a3ldkKDKNEN';
        let timestamp = '123456';
        headers['authCode'] = genAuthCode('GET', this.accessKey, accessId, nonce, signatureParam, timestamp);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 编辑设备
     * @method
     * @name APIClient#updateDevicesUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {} parameters.updateDevice - updateDevice
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateDevicesUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/info/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备日志列表
     * @method
     * @name APIClient#getDeviceLogsListUsingGET
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
    APIClient.prototype.getDeviceLogsListUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/logs';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备分享信息列表
     * @method
     * @name APIClient#getDeviceSharesListUsingGET
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
    APIClient.prototype.getDeviceSharesListUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 新增设备分享信息
     * @method
     * @name APIClient#addDeviceSharesUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.request - request
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addDeviceSharesUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询当前分享出去的设备列表
     * @method
     * @name APIClient#getDeviceShareOthersUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.loginName - 被分享者登录名
     * @param {string} parameters.userName - 被分享者用户名
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceShareOthersUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/shareOthers';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询分享给自己的设备列表
     * @method
     * @name APIClient#getDeviceShareSelfUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.loginName - 分享者登录名
     * @param {string} parameters.userName - 分享者用户名
     * @param {string} parameters.startDate - 开始时间
     * @param {string} parameters.endDate - 结束时间
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getDeviceShareSelfUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/shareSelf';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询设备分享信息
     * @method
     * @name APIClient#getDeviceSharesByIdUsingGET
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.shareId - shareId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getDeviceSharesByIdUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/{shareId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{shareId}', parameters['shareId']);

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 收回设备分享
     * @method
     * @name APIClient#deleteDeviceSharesUsingDELETE
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.shareId - shareId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteDeviceSharesUsingDELETE = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/shares/{shareId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{shareId}', parameters['shareId']);

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

        this.request('DELETE', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询统计数据
     * @method
     * @name APIClient#findStatisticsDatasUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.statDataName - 统计数据名
     * @param {string} parameters.filters - 条件限制
     * @param {string} parameters.limit - 数量限制
     * @param {string} parameters.startDate - 开始时间限制
     * @param {string} parameters.endDate - 结束时间限制
     */
    APIClient.prototype.findStatisticsDatasUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/stats';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['statDataName'] !== undefined) {
            queryParameters['statDataName'] = parameters['statDataName'];
        }

        if (parameters['statDataName'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: statDataName'));
            return deferred.promise;
        }

        if (parameters['filters'] !== undefined) {
            queryParameters['filters'] = parameters['filters'];
        }

        if (parameters['limit'] !== undefined) {
            queryParameters['limit'] = parameters['limit'];
        }

        if (parameters['limit'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: limit'));
            return deferred.promise;
        }

        if (parameters['startDate'] !== undefined) {
            queryParameters['startDate'] = parameters['startDate'];
        }

        if (parameters['startDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: startDate'));
            return deferred.promise;
        }

        if (parameters['endDate'] !== undefined) {
            queryParameters['endDate'] = parameters['endDate'];
        }

        if (parameters['endDate'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: endDate'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 删除设备
     * @method
     * @name APIClient#deleteDevicesUsingDELETE
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.deviceId - deviceId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteDevicesUsingDELETE = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/devices/{deviceId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{deviceId}', parameters['deviceId']);

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

        this.request('DELETE', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询外部数据
     * @method
     * @name APIClient#findExternalDataUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.key - 外部数据key
     */
    APIClient.prototype.findExternalDataUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
        }

        if (parameters['key'] !== undefined) {
            queryParameters['key'] = parameters['key'];
        }

        if (parameters['key'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: key'));
            return deferred.promise;
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 添加外部数据
     * @method
     * @name APIClient#addExternalDataUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addExternalData - addExternalData
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.addExternalDataUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 修改外部数据
     * @method
     * @name APIClient#updateExternalDataUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {} parameters.updateExternalData - updateExternalData
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateExternalDataUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 删除外部数据
     * @method
     * @name APIClient#deleteExternalDataUsingDELETE
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.externalDataName - 外部数据名
     * @param {string} parameters.recordId - 外部数据id
     */
    APIClient.prototype.deleteExternalDataUsingDELETE = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/externalData';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('DELETE', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询自定义权限
     * @method
     * @name APIClient#findCustomPermissionUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.customPermissionId - 自定义权限的id（不支持模糊查询）
     * @param {string} parameters.permissionName - 自定义权限名
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.findCustomPermissionUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/extraPermissions';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询当前用户拥有的自定义权限
     * @method
     * @name APIClient#findCustomPermissionByUserUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findCustomPermissionByUserUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/extraPermissions/user';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 用户登录
     * @method
     * @name APIClient#loginUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     * @param {string} parameters.loginName - 用户名
     * @param {string} parameters.password - 密码
     */
    APIClient.prototype.loginUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/login';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['appToken'] !== undefined) {
            queryParameters['appToken'] = parameters['appToken'];
        }

        if (parameters['loginName'] !== undefined) {
            queryParameters['loginName'] = parameters['loginName'];
        }

        if (parameters['password'] !== undefined) {
            queryParameters['password'] = parameters['password'];
        }

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 发送邮箱验证码
     * @method
     * @name APIClient#sendEmailVerificationUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     * @param {string} parameters.address - 邮箱地址
     * @param {string} parameters.invalid - 失效时间
     */
    APIClient.prototype.sendEmailVerificationUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/mails/sendVerification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 验证邮箱验证码
     * @method
     * @name APIClient#emailVerificationUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.emailVerificationRequest - emailVerificationRequest
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.emailVerificationUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/mails/verification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 注册用户
     * @method
     * @name APIClient#registerUserUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.registerUserRequest - registerUserRequest
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.registerUserUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/register';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询允许注册的角色
     * @method
     * @name APIClient#findRoleAllowRegUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.findRoleAllowRegUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/roles/allowReg';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询当前用户所能创建的角色
     * @method
     * @name APIClient#findRoleNameListUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.findRoleNameListUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/roles/offSpringRole';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 发送短信验证码
     * @method
     * @name APIClient#sendSmsVerificationUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.appToken - appToken
     * @param {string} parameters.mobile - 手机号码
     * @param {string} parameters.invalid - 失效时间
     */
    APIClient.prototype.sendSmsVerificationUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/sms/sendVerification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 验证短信验证码
     * @method
     * @name APIClient#checkCommandScriptUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.smsVerificationRequest - smsVerificationRequest
     * @param {string} parameters.appToken - appToken
     */
    APIClient.prototype.checkCommandScriptUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/sms/verification';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询用户列表
     * @method
     * @name APIClient#getUsersUsingGET
     * @param {object} parameters - method options and parameters
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.email - 邮箱
     * @param {string} parameters.mobile - 手机
     * @param {string} parameters.roleId - 角色Id
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.getUsersUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        if (parameters['sessionToken'] !== undefined) {
            headers['session-token'] = parameters['sessionToken'];
        }

        if (parameters['sessionToken'] === undefined) {
            deferred.reject(new Error('Missing required  parameter: sessionToken'));
            return deferred.promise;
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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 增加用户
     * @method
     * @name APIClient#insertUserUsingPOST
     * @param {object} parameters - method options and parameters
     * @param {} parameters.addUserRequest - addUserRequest
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.insertUserUsingPOST = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('POST', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 编辑子用户
     * @method
     * @name APIClient#updateUserUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {} parameters.updateUserRequest - updateUserRequest
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updateUserUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/child/{userId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 删除子用户
     * @method
     * @name APIClient#deleteUserByUserIdUsingDELETE
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.deleteUserByUserIdUsingDELETE = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/child/{userId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);

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

        this.request('DELETE', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 修改密码
     * @method
     * @name APIClient#updatePasswordUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {} parameters.password - password
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.updatePasswordUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/updatePassword';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询单个用户
     * @method
     * @name APIClient#getUserByUserIdUsingGET
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.getUserByUserIdUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 查询子用户列表
     * @method
     * @name APIClient#queryChildInfoUsingGET
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     * @param {string} parameters.pageNum - 页数
     * @param {string} parameters.pageSize - 每页条数
     */
    APIClient.prototype.queryChildInfoUsingGET = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/childQuery';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);

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

        this.request('GET', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 停用子用户
     * @method
     * @name APIClient#disableUserUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.disableUserUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/disable';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 启用子用户
     * @method
     * @name APIClient#enableUserUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.enableUserUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/enable';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     * 重置子用户密码
     * @method
     * @name APIClient#resetPasswordUsingPUT
     * @param {object} parameters - method options and parameters
     * @param {integer} parameters.userId - userId
     * @param {string} parameters.sessionToken - session-token
     */
    APIClient.prototype.resetPasswordUsingPUT = function (parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var path = '/v1.0/users/{userId}/reSetPassword';
        var body = {},
            queryParameters = {},
            headers = {},
            form = {};

        headers['Accept'] = ['*/*'];
        headers['Content-Type'] = ['application/json'];

        path = path.replace('{userId}', parameters['userId']);

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

        this.request('PUT', path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };

    return APIClient;
})();

module.exports = APIClient;
