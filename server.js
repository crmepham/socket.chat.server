var fs = require('fs');
var ws = require('ws');
var m = require('mysql');
var WebSocketServer = ws.Server;
var configFile = 'config.json';
var clients = [];
var users = [];
var afkUsers = [];
var counter = 0;
var config = {};
var pool = null;

loadConfig(configFile);
fs.watchFile(configFile, {
	persistent : false
}, function() {
	loadConfig(configFile);
});

if (conf.db) {
	pool = m.createPool({
		connectionLimit : config.connection_limit,
		host : config.db_host,
		user : config.db_user,
		password : config.db_password,
		database : config.db_database,
		debug : config.db_debug
	});
}

var httpServ = (config.ssl) ? require('https') : require('http');

var app = null;

var processRequest = function(req, res) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.writeHead(403);
	res.end("Access only via WebSockets protocol\n");
};

if (config.ssl) {

	app = httpServ.createServer({

		key : fs.readFileSync(config.ssl_key),
		cert : fs.readFileSync(config.ssl_cert)

	}, processRequest).listen(config.port);

} else {

	app = httpServ.createServer(processRequest).listen(config.port);
}

var server = new WebSocketServer({
	server : app
});

server.on('connection', function connection(ws) {

	addUser(ws);
	send(ws, JSON.stringify({
		start : getUser(clients.indexOf(ws)).id
	}));

	ws.on('close', function(code, message) {
		var user = getUser(clients.indexOf(ws));
		broadcast(ws, user.room, JSON.stringify({
			userLeft : user.username
		}));
		deleteUser(ws);

	});

	ws.on('message', function incoming(message) {
		var args = JSON.parse(message);
		var command = args.cmd;
		var room = args.room;
		var id = args.sessionId;
		var tempt = clients[0];
		var user = getUser(clients.indexOf(ws));

		if (command && (message.length < config.message_limit)) {
			switch (command) {
			case 'ping':
				// do nothing
				break;
			case 'onlineUsers':
				getUser(clients.indexOf(ws)).room = room;
				var string = convertUsersToJsonArray(users, room);
				string = JSON.stringify({
					onlineUsers : convertUsersToJsonArray(users, room)
				})
				send(ws, string);
				break;
			case 'addUser':
				getUser(clients.indexOf(ws)).username = args.username;
				send(ws, JSON.stringify({
					rsp : 'welcome'
				}));
				if (conf.db) { recordConnection(); }
				break;
			case 'notifyOfNewUser':
				var json = JSON.stringify({
					notifyOfNewUser : user.username
				});
				broadcast(ws, user.room, json);
				break;
			case 'notifyOfAfkUser':
				updateAfkUsers('add', getUserByUsername(args.username));
				var json = JSON.stringify({
					notifyOfAfkUser : user.username
				});
				broadcast(ws, user.room, json);
				break;
			case 'notifyOfAfkReturnedUser':
				updateAfkUsers('remove', getUserByUsername(args.username));
				var json = JSON.stringify({
					notifyOfAfkReturnedUser : user.username
				});
				broadcast(ws, user.room, json);
				break;
			case 'message':
				var json = JSON.stringify({
					broadcast : args.body,
					username : user.username
				});
				broadcast(ws, user.room, json);
				send(ws, json);
				break;
			case 'messageUser':
				send(getUserByUsername(args.to).client, JSON.stringify({
					messageUser : args.pm,
					from : user.username
				}));
				break;
			}
		}

	});
});
function loadConfig(file) {
	try {
		config = JSON.parse(fs.readFileSync(file, 'utf8'));
		console.log("Loaded config '" + file + "'");
	} catch (e) {
		console.warn(e);
	}
}

function updateAfkUsers(action, user) {
	if (action === 'add') {
		afkUsers.push(user);
	} else if (action === 'remove') {
		var index = afkUsers.indexOf(user);
		afkUsers.splice(index, 1);

	}
}

function convertUsersToJsonArray(users, room) {
	var array = [];
	for (var i = 0; i < users.length; i++) {
		if (users[i].room === room) {
			var obj = {};
			obj.sessionId = users[i].id;
			obj.username = users[i].username;
			obj.room = users[i].room;
			array.push(obj);
		}
	}
	return array;
}

function send(client, json) {
	getUser(clients.indexOf(client)).client.send(json);
}

function broadcast(client, room, json) {
	for (var i = 0; i < users.length; i++) {
		if (users[i].room === room && users[i].client !== client) {
			users[i].client.send(json);
		}
	}
}

function addUser(client) {
	clients.push(client);
	var i = clients.indexOf(client);
	if (i > -1) {
		users.push({
			id : i,
			username : "",
			room : "",
			client : clients[i]
		});
	}
}

function getUser(id) {
	for (var i = 0; i < users.length; i++) {
		if (users[i].id === id) {
			return users[i];
		}
	}
}

function getUserByUsername(username) {
	for (var i = 0; i < users.length; i++) {
		if (users[i].username === username) {
			return users[i];
		}
	}
}

function deleteUser(client) {
	var i = clients.indexOf(client);
	if (i > -1) {

		var user = getUser(clients.indexOf(client));
		var index = users.indexOf(user);
		users.splice(index, 1);
		delete clients[user.id];
	}
}

function recordConnection() {
	pool.getConnection(function(err, connection) {
		connection.release();
		if (err) {
			console.log(err);
		} else {
			connection.query('insert into session set datetime = now()');
		}
	});
}