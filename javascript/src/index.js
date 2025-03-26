"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var Sheet = /** @class */ (function () {
    function Sheet(config) {
        if (!config.deploymentId) {
            throw "No DeploymentId provided";
        }
        var token = config.token, username = config.username, password = config.password, deploymentId = config.deploymentId;
        var auth = token ? { token: token } : { username: username, password: password };
        this.fetch = function (body) {
            return fetch("https://script.google.com/macros/s/".concat(deploymentId, "/exec"), {
                method: "POST",
                body: JSON.stringify(__assign(__assign({}, body), auth)),
            })
                .then(function (p) { return p.json(); })
                .then(function (_a) {
                var success = _a.success, message = _a.message;
                if (!success) {
                    throw message;
                }
                return message;
            });
        };
    }
    Sheet.prototype.fetch = function (body) { return new Promise(function (r) { return r(null); }); };
    ;
    Sheet.prototype.me = function () {
        return this.fetch({ action: "me" });
    };
    Sheet.prototype.get = function (table, query) {
        return this.fetch({ action: "get", table: table, query: query });
    };
    Sheet.prototype.set = function (table, items) {
        return this.fetch({ action: "set", table: table, items: items });
    };
    Sheet.prototype.rm = function (table, ids) {
        return this.fetch({ action: "rm", table: table, ids: ids });
    };
    Sheet.prototype.new = function (table, header) {
        return this.fetch({ action: "new", table: table, header: header });
    };
    return Sheet;
}());
exports.default = Sheet;
