var casual = require('casual');
var WebSocketClient = require('websocket').client;




	var c = 4
	var timer = setInterval(function(){
		createClient(c++);
		if(c>99) clearInterval(timer)
	}, 10)
	



function createClient(count){
	var client = new WebSocketClient();
 
	client.on('connectFailed', function(error) {
	    console.log('Connect Error: ' + error.toString());
	});
 
	client.on('connect', function(connection) {
	    console.log('WebSocket Client Connected: ', count);
	    connection.on('error', function(error) {
	        console.log("Connection Error: " + error.toString());
	    });
	    connection.on('close', function() {
	        console.log('echo-protocol Connection Closed');
	    });
	    connection.on('message', function(data) {
	
			var message = JSON.parse(data["utf8Data"]);
			
			console.log(message)
			if(message.method =='login'){
				var message = {};
				message.method  = "joinSpace";
				message.sid = "507f191e810c19729de860ec";
				connection.send(JSON.stringify(message));	
				
				setInterval(function(){
					var message = {};
					message.method  = "addpost";
					message.text  = casual.sentences(casual.integer(1,10));
					message.spaces = ["507f191e810c19729de860ec"];
					connection.send(JSON.stringify(message));	
				}, casual.integer(60000,120000))
				
				
			}
			
			
			
			
			
	    });
    
	    function login() {
	        if (connection.connected) {
				var message = {};
				message.method  = "login";
				message.username = "user" + count;
				message.password = "pw" + count;
				connection.send(JSON.stringify(message));
	        }
	    }
	    login();
	});
 
	client.connect('ws://localhost:3000/', 'echo-protocol');
}
