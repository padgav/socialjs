//javascript: (function () {  var jsCode = document.createElement('script'); jsCode.setAttribute('src', 'clipper.js');  document.body.appendChild(jsCode); }());



var remoteAddress = 'ws://localhost:3000';
var connection = new WebSocket(remoteAddress, 'echo-protocol');
console.log("sdasd")
 connection.onopen = function() {
    console.log('WebSocket client connected');
	var data = {}
	var session = localStorage.js_session;
	console.log("Session", session)
	if(session != undefined){
		data.method = "relogin";
		data.session = session;
  	  	connection.send(JSON.stringify(data));
	}
};