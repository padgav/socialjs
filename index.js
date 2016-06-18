var util = require('util');
var express = require('express');
var http = require('http');
var fs = require('fs');
var async = require('async');
var events = require('events');
var swig  = require('swig');
var webshot = require('webshot');
var PDFImage = require("pdf-image").PDFImage;
var moment = require('moment');
 
var ldap = require('ldapjs');

var MongoClient = require('mongodb').MongoClient;
ObjectID = require('mongodb').ObjectID;
var WebSocketServer = require('websocket').server;

var config = require('./config');


// var session = require("./js_session.js");
// var user = require("./js_user.js");
// var space = require("./js_space.js");
// var post = require("./js_post.js");

var modules = new Array();

//
// modules.push(session);
// modules.push(user);
// modules.push(space);
// modules.push(post);
//
//
var modulesType = [];
modules.map(function(item){modulesType[item.init(item)] = item;});

var listeners = new Array();


var app = express();

app.use(express.static('.'));


app.server = http.createServer(app);
app.server.listen(config.port, function () {
  console.log('Listening on port ' + config.port + '!');
});


var myswig = new swig.Swig({ 
    cache: false,
    autoescape: false,
    locals: {}           
    });
	

// Mongo functions

var mongodb;

MongoClient.connect('mongodb://127.0.0.1:27017/' + config.mongodb, function(err, db) {
	mongodb = db;	
});



var apifunctions = new Array();

var wsServer = new WebSocketServer({
       httpServer: app.server,
       autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function(request) {
            if (!originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
            return;
            }
            
            var connection = request.accept('echo-protocol', request.origin);
            console.log((new Date()) + ' Connection accepted.');
            
            connection.on('message', function(data) {
				var message = JSON.parse(data["utf8Data"]);	
				if(message.method !== 'login')
					console.log("<<<<", message);
				
	if(( (connection.js_user === undefined) && (message.method==='login' || message.method==='relogin')) || (connection.js_user !== undefined)){
					if(message.method != undefined){
						if(apifunctions[message.method] !== undefined)   apifunctions[message.method](connection, message);
						else {
							var module = modulesType[message.type];
							var method = message.method;
							module[method](module, message, mongodb, connection, myswig);
						}
						
					}
				}
				else{
					console.log("NOT LOGGED!")
				}

			});
			
			connection.on('close', function(reasonCode, description) {
			        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected' + connection.js_user);
					var usr = mongodb.collection("user");
					usr.update({_id: connection.js_user}, {$set:{active: false}});
					var response = {method:"changeStatus", controller:"userlistCtrl", data:{ uid: connection.js_user, active:false}};
					notifyAll(response);
			});
	
});
      
	  
	  
 apifunctions["login"] = function(connection, message){
 	console.log(message)
 	var client = ldap.createClient({
 	  url: 'ldap://ldapcluster.crs4.it'
 	});

 	var opts = {
 		scope: 'sub',
 	    attributes: ['givenName', 'sn']
 	};

 			var coll = mongodb.collection("user");
 			coll.findOne({username:message.username, password:message.password},function(err, user){
 				if(user == null){
 					client.bind('uid=' + message.username + ',ou=People,dc=crs4', message.password, function(err) {
 					  console.log(err);
 					  var coll = mongodb.collection("user");
 					  if(err == null){
 				  		var coll = mongodb.collection("user");
 				  		coll.findOne({username:message.username},function(err, user){
 							if(user == null){
 								// search in ldpa e save
 								opts.filter = 'uid=' + message.username,
 								client.search('ou=People,dc=crs4', opts, function(err, res) {
 									console.log("ldap: ", res)

 									res.on('searchEntry', function(entry) {
 										if(entry.attributes[0]!= undefined)
 											var firstname = entry.attributes[0].vals[0];
 											var lastname = entry.attributes[1].vals[0];
 								   	   	 // console.log('Name: ' + entry.attributes[0].vals[0]);
 				 // 				   		 console.log('Name: ' + entry.attributes[1].vals[0]);

 										user = {username: message.username, firstname: firstname, lastname:lastname, active: false, image:"uploads/user/" + message.username + ".jpg"}
 										coll.save(user);
 						   				var sessionId = new ObjectID();
 						   				coll.update({_id: user._id}, {$set:{active: true, session: sessionId}}, {upsert:false});
 						   				var response = {method:"login", controller:"loginFormCtrl", data: { error: 0, message: "OK", session: sessionId, userid: user._id,  username: user.username}};
 						   				connection.send(JSON.stringify(response));
 						   				connection.js_user = user._id;
 						   				connection.js_session = sessionId;
 						   				listeners[connection.js_user] = {connection: connection};
 						   				var not = {method:"changeStatus", controller:"userlistCtrl", data:{ uid: user._id, active:true}};
 						   				notifyAll(not);

 									  });

 								})


 							}
 				  			else{

 				  				var sessionId = new ObjectID();
 				  				coll.update({_id: user._id}, {$set:{active: true, session: sessionId}}, {upsert:false});
 				  				var response = {method:"login", controller:"loginFormCtrl", data: { error: 0, message: "OK", session: sessionId, userid: user._id,  username: user.username}};
 				  				connection.send(JSON.stringify(response));
 				  				connection.js_user = user._id;
 				  				connection.js_session = sessionId;
 				  				listeners[connection.js_user] = {connection: connection};
 				  				var not = {method:"changeStatus", controller:"userlistCtrl", data:{ uid: user._id, active:true}};
 				  				notifyAll(not);
 				  			}
 				  		});


 					  }
 					  else{

 								var response = {method:"login", controller:"loginFormCtrl", data: {error: 1, message: "Invalid User or Password"}};
 								connection.send(JSON.stringify(response));

 					  }


 					});
 				}
 				else{
 					var coll = mongodb.collection("user");
 					var sessionId = new ObjectID();
 					coll.update({_id: user._id}, {$set:{active: true, session: sessionId}}, {upsert:false});
 					var response = {method:"login", controller:"loginFormCtrl", data: { error: 0, message: "OK", session: sessionId, userid: user._id,  username: user.username}};
 					connection.send(JSON.stringify(response));
 					connection.js_user = user._id;
 					connection.js_session = sessionId;
 					listeners[connection.js_user] = {connection: connection};
 					var not = {method:"changeStatus", controller:"userlistCtrl", data:{ uid: user._id, active:true}};
 					notifyAll(not);
 				}
 			});
 }
	  
	  

	  
	  
	  
//apifunctions["login"] = function(connection, message){
//	console.log(message);
//		var coll = mongodb.collection("user");
//		coll.findOne({username:message.username, password:message.password},function(err, user){
//			if(user === null){
//				var response = {method:"login", controller:"loginFormCtrl", data: {error: 1, message: "Invalid User or Password"}};
//				connection.send(JSON.stringify(response));
//			}
//			else{
//				var coll = mongodb.collection("user");
//				var sessionId = new ObjectID();
//				coll.update({_id: user._id}, {$set:{active: true, session: sessionId}}, {upsert:false});
//				var response = {method:"login", controller:"loginFormCtrl", data: { error: 0, message: "OK", session: sessionId, userid: user._id,  username: user.username}};
//				connection.send(JSON.stringify(response));
//				connection.js_user = user._id;
//				connection.js_session = sessionId;
//				listeners[connection.js_user] = {connection: connection};
//				var not = {method:"changeStatus", controller:"userlistCtrl", data:{ uid: user._id, active:true}};
//				notifyAll(not);
//			}
//		});
//}

apifunctions["relogin"] = function(connection, message){
	var coll = mongodb.collection("user");
	coll.findOne({session: ObjectID.createFromHexString(message.session)}, function(err, user){
		if(user != null){
			
			connection.js_user = user._id;
			connection.js_session = user.session;
			user.active = true;
			
			coll.update({_id: user._id}, {$set: {active:true}});
			var response = {method:"login", controller:"loginFormCtrl",  data:{ error: 0, message: "OK", session: user.session, userid: user._id, username: user.username}};
			connection.send(JSON.stringify(response));
			
			listeners[connection.js_user] = {connection: connection};
			var not = {method:"changeStatus", controller:"userlistCtrl", data:{ uid: user._id, active:true}};
			notifyAll(not);
		}
		else {
			var response = {method:"login", controller:"loginFormCtrl", data: {error: 2, message: "Invalid Session"}};
			connection.send(JSON.stringify(response));
		}	
	});
        
}

apifunctions["logout"] = function(connection, message){
	var coll = mongodb.collection("user");
	coll.update({_id: connection.is_user}, {active: false} );
	var response = {method:"changeStatus", controller:"userlistCtrl", data:{ uid: connection.js_user, active:false}};
	notifyAll(response);
	delete listeners[connection.js_user];
}

var mediaMap = [];
apifunctions["upload"] = function(connection, message){
	
	var id = message.name;
    if(mediaMap[id] == undefined) {
        mediaMap[id] = {};
        mediaMap[id].data = [];    
        mediaMap[id].count = 0;
    }
	mediaMap[id].data[message.packet] = message.data;
	mediaMap[id].count ++;
	if(mediaMap[id].count == message.numpackets){
		var data = mediaMap[id].data.join('');
        var d = data.split(",");
        //console.log(val)
		var filename = __dirname + "/uploads/" + message.dir + "/" + message.name + "." + message.ext;
		var preview  = "uploads/" + message.dir + "/" + message.name + "." + message.ext;
        fs.writeFileSync(filename, d[1], {encoding: 'base64'})
        delete mediaMap[id].data;
        delete mediaMap[id];
		
		
		
		var response = {}
		response.controller = message.controller;
		response.method = "webshotloaded";
		response.data = {}
		response.data.isImage = true;
		response.data.param = message.param;
		response.data.filename = "uploads/" + message.dir + "/" + message.name + "." + message.ext;;
		response.data.preview = preview;
		
		if(message.type == 'application/pdf'){
			response.data.preview = "uploads/" + message.dir + "/" + message.name +  "-0.png";
			var pdfImage = new PDFImage(filename);
			pdfImage.convertPage(0).then(function (imagePath) {
			  // 0-th page (first page) of the slide.pdf is available as slide-0.png 
			  connection.send(JSON.stringify(response));
			});
		}
		
		else{
			connection.send(JSON.stringify(response));
		}
	}
	
}





/**************************************
/*                                    *
/*        Users Section               *
/*                                    *
/**************************************/



apifunctions["loadusers"] = function(connection, message){
	console.log("loadusers");
	var coll = mongodb.collection("user");
	var query = {};
	coll.find({}, {password: false, session:false}).sort({lastname:1}).toArray(function(err, objects){
		var response = new Object();
		response.controller = "userlistCtrl";
		response.method = "add";
		response.data = objects;
		connection.send(JSON.stringify(response));
	});	
}



/**************************************
/*                                    *
/*        Spaces Section              *
/*                                    *
/**************************************/



apifunctions["loadspaces"] = function(connection, message){
	console.log("loadspaces");
	var coll = mongodb.collection("space");
	var query = {};
	coll.find(query).sort({name:1}).toArray(function(err, objects){
		var response = new Object();
		response.controller = "spacelistCtrl";
		response.method = "add";
		response.data = objects;
		connection.send(JSON.stringify(response));
	});
}



apifunctions["joinSpace"] = function(connection, message){
	var coll = mongodb.collection("space");
	coll.update({_id: ObjectID(message.sid), level:"public"}, {$addToSet:{ members:connection.js_user }});
        
//        var response = {};
//	response.controller = "spacelistCtrl";
//	response.method = "joinUpdated";
//	response.data = {sid:message.sid, id:message.owner};
//	notifyAll(response);
	
}
apifunctions["sendJoinRequest"] = function(connection, message){
	//send message to space owner
	var coll = mongodb.collection("message");
	var messageText = "Please, Join me to " + message.space;
	var msg = {from: ObjectID(message.id), to: ObjectID(message.owner), type: 'joinRequest', space: message.sid, text: messageText, read:false, date:new Date()};
	coll.save(msg);
	var response = {};
	response.method = "newMessage";
	response.controller = "userlistCtrl";
	response.data = msg;
	
	if(listeners[message.id] != undefined)
		listeners[message.id].connection.send(JSON.stringify(response));
	if(listeners[message.owner] != undefined)
		listeners[message.owner].connection.send(JSON.stringify(response));
	
}

apifunctions["approveJoin"] = function(connection, message){
        var coll = mongodb.collection("space");
	coll.update({_id: ObjectID(message.space), owner:connection.js_user}, {$addToSet:{ members:ObjectID(message.member) }});
        var coll = mongodb.collection("message");
	var messageText = "Your request was accepted: " ;
	var msg = {from: ObjectID(connection.js_user), to: ObjectID(message.member), space: message.space, text: messageText, read:false, date:new Date()};
	coll.save(msg);
	var response = {};
	response.method = "newMessage";
	response.controller = "userlistCtrl";
	response.data = msg;
	
	if(listeners[connection.js_user] != undefined)
		listeners[connection.js_user].connection.send(JSON.stringify(response));
	if(listeners[message.member] != undefined)
		listeners[message.member].connection.send(JSON.stringify(response));
            
        var response2 = {};
	response2.controller = "spacelistCtrl";
	response2.method = "joinUpdated";
	response2.data = {sid:message.space, id:message.member};
	notifyAll(response2);
        
}

apifunctions["declineJoin"] = function(connection, message){
    var coll = mongodb.collection("message");
	var messageText = "Your request has not been accepted: ";
	var msg = {from: ObjectID(connection.js_user), to: ObjectID(message.member), space: message.space, text: messageText, read:false, date:new Date()};
	coll.save(msg);
	var response = {};
	response.method = "newMessage";
	response.controller = "userlistCtrl";
	response.data = msg;
	
	if(listeners[connection.js_user] != undefined)
		listeners[connection.js_user].connection.send(JSON.stringify(response));
	if(listeners[message.member] != undefined)
		listeners[message.member].connection.send(JSON.stringify(response));
 
}

apifunctions["leaveSpace"] = function(connection, message){
	var coll = mongodb.collection("space");
	coll.update({_id: ObjectID(message.sid), owner: {$ne: connection.js_user} }, {$pull:{ members:  { $in: [connection.js_user]} }})
}

apifunctions["removeSpace"] = function(connection, message){
	var coll = mongodb.collection("space");
	coll.remove({_id: ObjectID(message.sid)});
	
	var response = {};
	response.controller = "spacelistCtrl";
	response.method = "spaceRemoved";
	response.data = message;
	notifyAll(response);
}


apifunctions["updateImage"] = function(connection, message){
	var coll = mongodb.collection("space");
	coll.update({_id: ObjectID(message.sid)}, {$set:{image: message.filename}});
	
	var response = {};
	response.controller = "spacelistCtrl";
	response.method = "imageUpdated";
	response.data = {sid:message.sid, filename: message.filename};
	notifyAll(response);
}


apifunctions["createNewSpace"] = function(connection, message){
	var coll = mongodb.collection("space");
	message.date = new Date();
	message.owner = connection.js_user;
	message.members = [connection.js_user];
        message.image = "uploads/space/default_space.png"
	coll.save(message, function(err) {console.log(err)});
	
	var response = {};
	response.controller = "spacelistCtrl";
	response.method = "newSpace";
	response.data = message;
	notifyAll(response);
}


apifunctions["updateSpaceTitle"] = function(connection, message){
	var coll = mongodb.collection("space");
	coll.update({_id: ObjectID(message.sid)}, {$set:{name: message.name}});
	
	var response = {};
	response.controller = "spacelistCtrl";
	response.method = "nameUpdated";
	response.data = {sid:message.sid, name: message.name};
	notifyAll(response);
}

apifunctions["changePrivate"] = function(connection, message){
	var coll = mongodb.collection("space");
	coll.update({_id: ObjectID(message.sid)}, {$set:{level: "private"}});
	
	var response = {};
	response.controller = "spacelistCtrl";
	response.method = "levelUpdated";
	response.data = {sid:message.sid, level: "private"};
	notifyAll(response);
}

apifunctions["changePublic"] = function(connection, message){
	var coll = mongodb.collection("space");
	coll.update({_id: ObjectID(message.sid)}, {$set:{level: "public"}});
	
	var response = {};
	response.controller = "spacelistCtrl";
	response.method = "levelUpdated";
	response.data = {sid:message.sid, level: "public"};
	notifyAll(response);
}




/**************************************
/*                                    *
/*        Search Section               *
/*                                    *
/**************************************/

apifunctions["search"] = function(connection, message){
	var coll = mongodb.collection("post");
	var space = mongodb.collection("space");
	var collComment = mongodb.collection("comment");
	
	var query = {members: ObjectID(connection.js_user)};
	space.find(query, {_id: 1}).toArray(function(err, objects){
		var spaces = [];
		objects.map(function(item){
			spaces.push(item._id);
		});
		
		coll.find({spaces: {$in:  spaces }, $text:    {$search :message.searchString}, date : {$lt :new Date(message.lastDate) }}).sort({date: -1}).limit(10).forEach(function(item){
			collComment.find({post: item._id}).sort({date: -1}).toArray(function(err, comments){
				var response = new Object();
				response.controller = "postlistCtrl";
				response.method = "add";
				response.data = item;
				item.comments = comments;
				connection.send(JSON.stringify(response));
			})
		})
	})
}

/**************************************
/*                                    *
/*        Post Section                *
/*                                    *
/**************************************/



apifunctions["loadposts"] = function(connection, message){
	console.log("loadposts");
	var space = mongodb.collection("space");
	var post  = mongodb.collection("post");
	var collComment = mongodb.collection("comment");
	var query = {members: ObjectID(connection.js_user)};
	space.find(query, {_id: 1}).toArray(function(err, objects){
		var spaces = [];
		objects.map(function(item){
			spaces.push(item._id);
		});
		
		post.find({spaces: {$in:  spaces }, date : {$lt :new Date(message.lastDate) }}).sort({date: -1}).limit(10).forEach(function(item){
			collComment.find({post: item._id}).sort({date: -1}).toArray(function(err, comments){
				var response = new Object();
				response.controller = "postlistCtrl";
				response.method = "add";
				response.data = item;
				item.comments = comments;
				connection.send(JSON.stringify(response));
			})
		})			
	})
}	



apifunctions["loadbookmark"] = function(connection, message){
	console.log("loadbookmark");
	var space = mongodb.collection("space");
	var post  = mongodb.collection("post");
	var collComment = mongodb.collection("comment");
	var query = {members: ObjectID(connection.js_user)};
	space.find(query, {_id: 1}).toArray(function(err, objects){
		var spaces = [];
		objects.map(function(item){
			spaces.push(item._id);
		});
		
		var d = new Date();
		d.setMonth(d.getMonth() - 1);
		//d.setHours(d.getHours() - 4);
		query = {spaces: {$in:  spaces }, bookmark:  ObjectID(connection.js_user), $or: [ {start : {$gte :new Date()}}, {date : {$gt: d} }       ]   };
		console.log(util.inspect(query, false, null));
		
		post.find(query).sort({date: -1}).limit(10).forEach(function(item){
			collComment.find({post: item._id}).sort({date: -1}).toArray(function(err, comments){
				var response = new Object();
				response.controller = "bookmarklistCtrl";
				response.method = "add";
				response.data = item;
				item.comments = comments;
				connection.send(JSON.stringify(response));
			})
		})			
	})
}	


apifunctions["loadEvents"] = function(connection, message){
	console.log("loadEvents");
	var space = mongodb.collection("space");
	var post  = mongodb.collection("post");
	var collComment = mongodb.collection("comment");
	var query = {members: ObjectID(connection.js_user)};
	space.find(query, {_id: 1}).toArray(function(err, objects){
		var spaces = [];
		objects.map(function(item){
			spaces.push(item._id);
		});
		var q = {spaces: {$in:  spaces }, $and: [ {start : {$gte :message.start }}, {end: {$lte: message.end}}]}
		console.log(q)
		post.find({spaces: {$in:  spaces }, $and: [ {start : {$gte :new Date(message.start) }}, {end: {$lte: new Date(message.end)}}]            }   ).forEach(function(item){
			
				var response = new Object();
				response.controller = "postFormCtrl";
				response.method = "addCalendarEvent";
				response.data = item;
				connection.send(JSON.stringify(response));
			
		})			
	})
}	
	

apifunctions["getPostSpace"] = function(connection, message){
	console.log("getPostSpace");
	var space = mongodb.collection("space");
	var post  = mongodb.collection("post");
	var collComment = mongodb.collection("comment");
	var query = {_id: ObjectID(message.space), members: ObjectID(connection.js_user)};
	space.findOne(query, {_id: 1}, function(err, item){
		if( item!= null){
			post.find({spaces: item._id, date : {$lt :new Date(message.lastDate) }}).sort({date: -1}).limit(10).forEach(function(item){
				collComment.find({post: item._id}).sort({date: -1}).toArray(function(err, comments){
					var response = new Object();
					response.controller = "postlistCtrl";
					response.method = "add";
					response.data = item;
					item.comments = comments;
					connection.send(JSON.stringify(response));
				})
			})			
		}
	})
}	


apifunctions["addpost"] = function(connection, message){
	console.log("ADD POST");
	
	//TODO check if user is really member of the spaces
	
	var coll = mongodb.collection("post");
	message.date = new Date();
	message.owner = connection.js_user;
	message.like = [];
	message.bookmark = [];
	message.comments = [];
	for(i = 0; i < message.spaces.length; i++){
		message.spaces[i] = ObjectID(message.spaces[i])
	}
	coll.save(message, function(err) {console.log(err)});
	
	
	var response = {}
	response.controller = "postlistCtrl";
	response.method = "new";
	response.data = message;
	notifyMembers(response, message.spaces);
	
	
	//TODO if post contains files check for pdf and do pdf-to-text
	
}


apifunctions["updatePost"] = function(connection, message){
	var post = mongodb.collection("post");	
	
	//TODO check if post owner is userid
	var obj = {_id: ObjectID(message.post)};
	var update = {$set: {text: message.text}};
	post.update(obj, update, function (err, param){
		 if(param.result.nModified == 1){
			var response = {};
			response.method = "updatePost";
			response.controller = "postlistCtrl"
			response.data = {post: message.post, text:message.text}
			notifyAll(response)
			//TODO notify only user visualize post
		}
	 });
}




apifunctions["likepost"] = function(connection, message){
	var post = mongodb.collection("post");	
	var obj = {_id: ObjectID(message.post)};
	var update = { $addToSet: { like: connection.js_user }};
	post.update(obj, update, function (err, param){
		if(param.result.nModified == 1){
			var response = {};
			response.method = "likepost";
			response.controller = "postlistCtrl"
			response.data = {post: message.post, user:connection.js_user}
			notifyAll(response)
			//TODO notify only user visualize post
		}
	});
}

apifunctions["bookmarkpost"] = function(connection, message){
	var post = mongodb.collection("post");	
	var obj = {_id: ObjectID(message.post)};
	var update = { $addToSet: { bookmark: connection.js_user }};
	post.update(obj, update, function (err, param){
		if(param.result.nModified == 1){
			var response = {};
			response.method = "bookmarkpost";
			response.controller = "postlistCtrl"
			response.data = {post: message.post, user:connection.js_user}
			notifyAll(response)
			//TODO notify only user visualize post
		}
	});
}



apifunctions["addcomment"] = function(connection, message){
	console.log("NEW COMMENT");
	var coll = mongodb.collection("comment");
	var comment = {owner: connection.js_user, text: message.text, type:"comment", post: ObjectID.createFromHexString(message.post) , date: new Date() };
	coll.save(comment);
	var response = {};
	response.method = "commentpost";
	response.controller = "postlistCtrl"
	response.data = comment;
	notifyAll(response)
	//TODO notify only user visualize post
}


apifunctions["loadwebshot"] = function(connection, message){
	var options = {
	  screenSize: {
	    width: 1024
	  , height: 768
	  }
	, shotSize: {
	    width: 'window'
	  , height: 'window'
	  }
	
	};
	webshot(message.url, __dirname  +  "/uploads/post/" + message.name, options, function(err) {
		console.log(err)
		if(err == null){
			var response = {}
			response.controller = "postFormCtrl";
			response.method = "webshotloaded";
			response.data = {};
                        response.data.isSite = true;
                        response.data.url = message.url;
			response.data.filename = "../uploads/post/" + message.name;
			response.data.preview = "../uploads/post/" + message.name;
			connection.send(JSON.stringify(response));
			
		}
	});

}



/**************************************
/*                                    *
/*        Messages Section            *
/*                                    *
/**************************************/

apifunctions["loadmessages"] = function(connection, message){
	console.log("loadmessages");
	var coll = mongodb.collection("message");
	var query = {date:{$lt: new Date(message.lastDate)}, $or: [ {to: ObjectID(connection.js_user), from: ObjectID(message.friend)} ,   {from: ObjectID(connection.js_user), to: ObjectID(message.friend)} ] };
	coll.find(query).sort({date:-1}).limit(10).toArray(function(err, objects){
		
		objects.map(function(item){
			
			coll.update({_id: item._id}, {$set:{read:true}})
			var response = new Object();
			response.controller = "userlistCtrl";
			response.method = "addMessage";
			response.data = item;
			connection.send(JSON.stringify(response));
		})
		
	});
	

}

apifunctions["sendMessage"] = function(connection, message){
	//send message to space owner
	var coll = mongodb.collection("message");
	var msg = {from: ObjectID(message.from), to: ObjectID(message.to), type: 'text', text: message.text, read: false, date: new Date()}
	coll.save(msg)
	
	var response = {};
	response.method = "newMessage";
	response.controller = "userlistCtrl";
	response.data = msg;
	
	if(listeners[message.from] != undefined)
		listeners[message.from].connection.send(JSON.stringify(response));
	if(listeners[message.to] != undefined)
		listeners[message.to].connection.send(JSON.stringify(response));
}



apifunctions["getUnreadMessages"] = function(connection, message){
	var coll = mongodb.collection("message");
	coll.find({to: connection.js_user, read:false}).toArray(function(err, objects){
		var response = new Object();
		
		response.controller = "userlistCtrl";
		response.method = "unreadMessages";
		response.data = objects;
		connection.send(JSON.stringify(response));
	});
}


apifunctions["createNewObject"] = function(connection, message){

	var coll = mongodb.collection(message.type);
	message.date = new Date();
	message.owner = connection.js_user;
	coll.save(message, function(err) {console.log(err)});
	if(message.function != undefined) apifunctions[message.function](connection, message);
	
	
	if(message.type == "user"){
		list = listeners["loadusers"];
		list.map(function(item){
			var response = new Object();
			response.data = message;
			response.method = "adduser";
				item.send(JSON.stringify(response));
			
		});
		
	}
	
	if(listeners[message.type] != undefined) {
		list = listeners[message.type];

		list.map(function(item){
			var original = item.message;
	        original.method = "addElement";
		    var templatefile = __dirname +  "/templates/" + original.type + "-" + original.mode + ".html";
			myswig.renderFile(templatefile, {arr:[message]},  function(err, html){
		                if(err) console.log(err, original.type + "-" + original.mode);
				        original.html = html;
						console.log(original)
				        item.connection.send(JSON.stringify(original));
		        });
		});
	}
}







function notifyAll(message){
		for (var key in listeners){	
			listeners[key].connection.send(JSON.stringify(message));
		}		
}

function notifyMembers(message, spaces){
	
	var coll = mongodb.collection("space");
	coll.find({_id: {$in: spaces}}).toArray(function(err, spaces){
		var notified = []
		spaces.map(function(space){
			space.members.map(function(item){
				if(listeners[item] != undefined   && notified[item]  == undefined) {
					listeners[item].connection.send(JSON.stringify(message));
					notified[item] = true;
				}
			})
		})
		
		
		
	})
}


apifunctions["getnewpost"] = function(connection, message){
	var coll = mongodb.collection("news");
	var query = {owner: connection.js_user, subjecttype:"post", view:false};
	coll.find(query).sort({date: -1}).toArray(function(err, news){
		var templatefile = __dirname +  "/templates/post-list.html";
		myswig.renderFile(templatefile, {arr:news},  function(err, html){
                    if(err) console.log(err);
                    message.method = "setObjects";
                    message.html = html;
					message.nitems = news.length;
                    message.news = news;
					connection.send(JSON.stringify(message));
					news.map(function(item){item.view = true; coll.save(item)});
        });
		
	});
	if(listeners["getnewpost"] === undefined) listeners["getnewpost"] = new Array();
	listeners["getnewpost"][ connection.js_session] =  {connection: connection, name: message.name};
		
}

apifunctions["getoldpost"] = function(connection, message){
	
	var coll = mongodb.collection("news");
	var query = {owner: connection.js_user, subjecttype:"post", view:true};
	coll.find(query).sort({date: -1}).limit(10).toArray(function(err, news){
		var templatefile = __dirname +  "/templates/post-list.html";
		myswig.renderFile(templatefile, {arr:news},  function(err, html){
                    if(err) console.log(err);
                    message.method = "setObjects";
                    message.html = html;
					message.nitems = news.length;
                    connection.send(JSON.stringify(message));
        });
	});	
}

apifunctions["countlike"] = function(connection, message){
	var coll = mongodb.collection(message.type);
	var query = {subject: ObjectID.createFromHexString(message.subject), like: true, subjecttype:"post"};
	coll.count(query, function(err, result){
		message.method = "setObject";
        message.html = result;
        connection.send(JSON.stringify(message));
        
	});	
}

apifunctions["countview"] = function(connection, message){
	var coll = mongodb.collection(message.type);
	var query = {subject: ObjectID.createFromHexString(message.subject), view: true, subjecttype:"post"};
	coll.count(query, function(err, result){
		message.method = "setObject";
        message.html = result;
        connection.send(JSON.stringify(message));
        
	});	
}

apifunctions["countuserlist"] = function(connection, message){
	var coll = mongodb.collection(message.type);
	var query = {subject: ObjectID.createFromHexString(message.subject), like: true , subjecttype:"post"};
	coll.find(query).toArray(function(err, objects){
        var templatefile = __dirname +  "/templates/post-userlike.html";
		myswig.renderFile(templatefile, {arr:objects},  function(err, html){
                    if(err) console.log(err, "setObjects");
                    message.method = "setObjects";
                    message.html = html;
					message.nitems = objects.length;
					connection.send(JSON.stringify(message));
            });
	});	
}

apifunctions["viewuserlist"] = function(connection, message){
	var coll = mongodb.collection(message.type);
	var query = {subject: ObjectID.createFromHexString(message.subject), view: true, subjecttype:"post"};
	coll.find(query).toArray(function(err, objects){
        var templatefile = __dirname +  "/templates/post-userlike.html";
		myswig.renderFile(templatefile, {arr:objects},  function(err, html){
                    if(err) console.log(err, "setObjects");
                    message.method = "setObjects";
                    message.html = html;
					message.nitems = objects.length;
					connection.send(JSON.stringify(message));
            });
	});	
}




apifunctions["getcomments"] = function(connection, message){
	var coll = mongodb.collection("comment");
	var query = {post: ObjectID.createFromHexString(message.post)};
	coll.find(query).toArray(function(err, objects){
	console.log("getcomments", objects)
	
        var templatefile = __dirname +  "/templates/comment-list.html";
		myswig.renderFile(templatefile, {arr:objects},  function(err, html){
                    if(err) console.log(err, "getcomments error");
                    message.method = "setObjects";
                    message.html = html;
					message.nitems = objects.length;
					connection.send(JSON.stringify(message));
            });
	});	
}


apifunctions["loadObject"] = function(connection, message){
	var original = JSON.parse(JSON.stringify(message));
	var coll = mongodb.collection(message.type);
	var filter = {_id: ObjectID.createFromHexString(message.id)};
	coll.findOne(filter, function(err, item){
        //console.log(objects);
        var templatefile = __dirname +  "/templates/" + message.type + "-" + message.mode + ".html";
		myswig.renderFile(templatefile, item,  function(err, html){
                    if(err) console.log(err, message.type + "-" + message.mode);
                    message.method = "setObject";
                    message.html = html;
                    connection.send(JSON.stringify(message));
            });
	 });
	if(listeners[message.id] === undefined) listeners[message.id] = new Array();
	listeners[message.id].push( {connection: connection, message: original, date: new Date()});
	
}


apifunctions["loadObjects"] = function(connection, message){
	console.log(message);
	var original = JSON.parse(JSON.stringify(message));
	var coll = mongodb.collection(message.type);
	var filter = {};
	if (message.filter != undefined) eval ('var filter = ' + message.filter);
	coll.find(filter).sort({date:-1}).toArray(function(err, objects){
        //console.log(objects);
        var templatefile = __dirname +  "/templates/" + message.type + "-" + message.mode + ".html";
		myswig.renderFile(templatefile, {arr:objects},  function(err, html){
                    if(err) console.log(err, "loadObjects");
                    message.method = "setObjects";
                    message.html = html;
					message.objects = objects;
					connection.send(JSON.stringify(message));
            });
   
	
		if(listeners[message.type] === undefined) listeners[message.type] = new Array();
		listeners[message.type].push( {connection: connection, message: original, date: new Date()});

	 });
	
}


apifunctions["loadArray"] = function(connection, message){
	var original = JSON.parse(JSON.stringify(message));
	var coll = mongodb.collection(message.type);
	var filter = {_id: ObjectID.createFromHexString(message.id)};
	coll.findOne(filter, function(err, item){
        var templatefile = __dirname +  "/templates/" + message.type + "-" + message.mode + ".html";
		//console.log("-----", item[message.array]);
		myswig.renderFile(templatefile, {arr: item[message.array], id: item._id},  function(err, html){
                    if(err) console.log(err);
                    message.method = "setArray";
                    message.html = html;
                    connection.send(JSON.stringify(message));
            });

			var idx = message.id + "_" + message.array;
			if(listeners[idx] === undefined) listeners[idx] = new Array();
			listeners[idx].push( {connection: connection, message: original, date: new Date()});
	
	 });
	
}


apifunctions["dropObject"] = function(connection, message) {
	  
	  var coll = mongodb.collection(message.type);
	  var obj = {};
	  obj[message.array]  = message.source;
	  coll.update({_id: ObjectID.createFromHexString(message.target)}, { $addToSet: obj  });
	  
	  var idx = message.target + "_" + message.array;
	  if(listeners[idx] != undefined) {
  		list = listeners[idx];
  		list.map(function(item){
  			var original = item.message;
  	        original.method = "addElement";
  		    var templatefile = __dirname +  "/templates/" + original.type + "-" + original.mode + ".html";
  			myswig.renderFile(templatefile, {arr:[message.source]},  function(err, html){
  		                if(err) console.log(err);
  				        original.html = html;
  						console.log(original)
  				        item.connection.send(JSON.stringify(original));
  		        });
  		});
  	}  
}


apifunctions["deleteObject"] = function(connection, message){
	var coll = mongodb.collection(message.type);
	coll.remove({_id: ObjectID.createFromHexString(message.id)}, function(err, doc){
		//console.log(err)
		
		if(listeners[message.type] != undefined) list = listeners[message.type];
		list.map(function(item){
			message.method = "objectRemoved";
			item.connection.send(JSON.stringify(message));
		});
		
	});
}


apifunctions["saveObject"] = function(connection, message){
	console.log(message);
	var coll = mongodb.collection(message.type);
	message._id = ObjectID.createFromHexString(message._id);
	coll.update({_id: message._id}, {$set:  message});
}







