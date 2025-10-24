/* eslint-disable */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = __importDefault(require("http"));
var url_1 = require("url");
var next_1 = __importDefault(require("next"));
// socket.io is imported dynamically so the project can still typecheck if the package
// isn't installed yet. Install with: npm install socket.io
var IOServer;
var dev = process.env.NODE_ENV !== 'production';
var app = (0, next_1.default)({ dev: dev });
var handle = app.getRequestHandler();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var server, io, getToken_1, NEXTAUTH_SECRET_1, port;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, app.prepare()];
                case 1:
                    _a.sent();
                    server = http_1.default.createServer(function (req, res) {
                        try {
                            var parsedUrl = (0, url_1.parse)(req.url || '', true);
                            handle(req, res, parsedUrl);
                        }
                        catch (err) {
                            console.error('Request handler error', err);
                            res.statusCode = 500;
                            res.end('internal server error');
                        }
                    });
                    try {
                        IOServer = require('socket.io').Server;
                    }
                    catch (e) {
                        console.warn('socket.io not installed. Real-time features will be disabled.');
                    }
                    io = IOServer ? new IOServer(server, {
                        cors: {
                            origin: '*',
                            methods: ['GET', 'POST']
                        }
                    }) : null;
                    if (io) {
                        // expose globally so other server modules (scheduler, routes) can emit events
                        try {
                            globalThis.__io = io;
                        }
                        catch (e) {
                            console.warn('Could not attach io to globalThis', e);
                        }
                        getToken_1 = require('next-auth/jwt').getToken;
                        NEXTAUTH_SECRET_1 = process.env.NEXTAUTH_SECRET;
                        io.use(function (socket, nextAuth) { return __awaiter(_this, void 0, void 0, function () {
                            var cookie, token, e_1;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 2, , 3]);
                                        cookie = (_b = (_a = socket.request.headers) === null || _a === void 0 ? void 0 : _a.cookie) !== null && _b !== void 0 ? _b : '';
                                        return [4 /*yield*/, getToken_1({ req: { headers: { cookie: cookie } }, secret: NEXTAUTH_SECRET_1, raw: false })];
                                    case 1:
                                        token = _c.sent();
                                        if (!token) {
                                            // allow connection but unauthenticated
                                            socket.data.user = null;
                                            return [2 /*return*/, nextAuth()];
                                        }
                                        socket.data.user = token;
                                        return [2 /*return*/, nextAuth()];
                                    case 2:
                                        e_1 = _c.sent();
                                        console.warn('Socket auth error', e_1);
                                        return [2 /*return*/, nextAuth()];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        io.on('connection', function (socket) {
                            var _a, _b, _c;
                            console.log('Socket connected:', socket.id, 'user=', (_c = (_b = (_a = socket.data) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.email) !== null && _c !== void 0 ? _c : 'anon');
                            socket.on('join', function (room) {
                                socket.join(room);
                                socket.to(room).emit('system', "".concat(socket.id, " joined ").concat(room));
                            });
                            socket.on('scoreboard:update', function (payload) {
                                var _a, _b, _c, _d;
                                var user = (_a = socket.data) === null || _a === void 0 ? void 0 : _a.user;
                                var role = (_b = user === null || user === void 0 ? void 0 : user.role) !== null && _b !== void 0 ? _b : ((_c = user === null || user === void 0 ? void 0 : user.role) === null || _c === void 0 ? void 0 : _c.name);
                                var perms = (_d = user === null || user === void 0 ? void 0 : user.permissions) !== null && _d !== void 0 ? _d : [];
                                if (!user || (role !== 'Admin' && !perms.includes('manage_scoreboard'))) {
                                    socket.emit('error', 'not-authorized');
                                    return;
                                }
                                io.to('displays').emit('scoreboard:update', payload);
                            });
                            socket.on('music:update', function (payload) {
                                var _a, _b, _c, _d;
                                var user = (_a = socket.data) === null || _a === void 0 ? void 0 : _a.user;
                                var role = (_b = user === null || user === void 0 ? void 0 : user.role) !== null && _b !== void 0 ? _b : ((_c = user === null || user === void 0 ? void 0 : user.role) === null || _c === void 0 ? void 0 : _c.name);
                                var perms = (_d = user === null || user === void 0 ? void 0 : user.permissions) !== null && _d !== void 0 ? _d : [];
                                if (!user || (role !== 'Admin' && !perms.includes('manage_music'))) {
                                    socket.emit('error', 'not-authorized');
                                    return;
                                }
                                io.to('displays').emit('music:update', payload);
                            });
                            socket.on('message', function (payload) {
                                var _a = payload || {}, room = _a.room, message = _a.message;
                                if (room) {
                                    io.to(room).emit('message', { from: socket.id, message: message });
                                }
                                else {
                                    socket.broadcast.emit('message', { from: socket.id, message: message });
                                }
                            });
                            socket.on('disconnect', function (reason) {
                                console.log('Socket disconnected', socket.id, reason);
                            });
                        });
                    }
                    port = parseInt(process.env.PORT || '3000', 10);
                    server.listen(port, function () {
                        console.log("> Ready on http://localhost:".concat(port, " - custom server with Socket.io"));
                        try {
                            var scheduler = require('./src/lib/icalScheduler');
                            if (scheduler && scheduler.restoreScheduledFromDB) {
                                scheduler.restoreScheduledFromDB().then(function (n) { return console.log('Restored', n, 'scheduled events from DB'); });
                            }
                        }
                        catch (e) {
                            console.warn('Unable to restore scheduled events at startup', e);
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
