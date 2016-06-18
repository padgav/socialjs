
var sourceElement;
//var connector;
var userid

var app = angular.module('myApp', ['ui.calendar', 'ui.bootstrap', 'ui.map', 'ngTagsInput', 'ngTouch', 'anguvideo', '720kb.socialshare']);


	
//
// app.animation('.fade', function() {
//   return {
//     enter: function(element, done) {
//       element.css('opacity', '0');
//       $(element).fadeIn(1000, function() {
//         done();
//       });
//     },
//     leave: function(element, done) {
//       $(element).fadeOut(1000, function() {
//         done();
//       });
//     },
//     move: function(element, done) {
//       element.css('display', 'none');
//       $(element).slideDown(500, function() {
//         done();
//       });
//     }
//   }
// })




app.service('GlobalService', function($rootScope){
	var factory = {};
    factory.users = {};
	
	factory.setUsers  = function(users){
		factory.users = users;
		
	}
	
	factory.getUser  = function(uid){
		return(factory.users[uid]);
	}	
	
	
    factory.spaces = [];
	factory.setSpaces  = function(spaces){
		$rootScope.$emit("spacesUpdated", spaces)
		spaces.map(function(item){
			factory.spaces[item._id] = item;
		})
	}
	
	factory.getSpace  = function(sid){
		return(factory.spaces[sid]);
	}	
	
	
	
	factory.subscribe = function(ev, callback){
		$rootScope.$on(ev, callback)
	}
	
	
	factory.emit = function(ev, param){
		$rootScope.$emit(ev, param)
	}
	
	
	return factory;
	
});



app.service('ConnectionService', function($rootScope){
	var factory = {};


	factory.init = function(){
		factory.connector()
		factory.scrolling();
	}

	factory.scrolling = function(){
  	  $(window).scroll(function() {
          if ($(document).scrollTop() + $(window).height() >= $(document).height()) {
			  $rootScope.$emit('scroll', {})
          }
  	 })
		
	}



	factory.connector = function(){
	    var remoteAddress = 'ws://' + location.host;
		factory.connection = new WebSocket(remoteAddress, 'echo-protocol');
	    factory.connection.onopen = function() {
	        console.log('WebSocket client connected');
			var data = {}
			var session = localStorage.js_session;
			if(session != undefined){
				data.method = "relogin";
				data.session = session;
		  	  	factory.connection.send(JSON.stringify(data));
			}
	    };

	    factory.connection.onclose = function (error) {
			console.error('There was an un-identified Web Socket error');
	    };

	    factory.connection.onmessage =  function(buffer) {

	        var message = JSON.parse(buffer.data);
			console.log("<<<<", message);
			
			// if(message.method == 'add' && message.controller == 'postlistCtrl'){
// 					$rootScope.$emit(message.method, message.data)
// 			}
// 			else {
			 var el = angular.element($("[ng-controller = " + message['controller'] + "]")).scope();
			 el[message.method](message.data);
			//el.$emit(message.method, message.data)
			el.$apply();
			// }
			
		
		}
	}	
	
	// factory.subscribe = function(ev, callback){
	// 	$rootScope.$on(ev, callback)
	// }
	
	
	factory.sendFile = function(descriptor, data){
		var message = {}
		message.method = "upload";
		message.name = descriptor.name;
		message.ext = descriptor.ext;
		message.type = descriptor.type;
		message.controller = descriptor.ngcontroller;
		message.param = descriptor.param;
		message.dir = descriptor.dir;
		//message.filename = escape(theFile.name);
		  var numpackets = Math.floor(data.length / 1024);
		  message.numpackets = numpackets;
		  message.len = data.length;
		  var rem = data.length % 1024;
		  if(rem > 0 ) message.numpackets = numpackets + 1;
		  var i;
		  for(i = 0; i< numpackets; i++){
		      message.packet = i;
		      message.data = data.substr(i * 1024, 1024);
		      factory.connection.send(JSON.stringify(message));
		  }
		  if(rem > 0){
		      message.packet = i;
		      message.data = data.substr(i * 1024, rem);
		      factory.connection.send(JSON.stringify(message));
		   }
	  }
	  
	  return factory;
});






app.controller('searchCtrl', function($scope, GlobalService, ConnectionService) {
	$scope.searchString = "";
	
	$scope.search = function(){
		GlobalService.emit("searchPerformed", $scope.searchString);
	}
	
	
})



app.directive('calendar', function() {
	
	
  return {
	  scope: {},
      restrict: 'AE',
      replace: 'true',
      templateUrl: 'mycalendar.html',
	  link: function(scope, elem, attrs) {
		  scope.calendar = [];
		  var a =moment().startOf('week')
		  for(i=0; i<300; i+=7){
			  var week = []
			  for(j=0; j<7; j++){
			    var d = moment(a).add(i+j, 'days');
				week.push(d);
				console.log(d.toString())
			  }
			scope.calendar.push(week)
		}
	
		elem.bind('scroll', function() {
			
		})
		  	
	  }
  };
});

app.controller('bookmarklistCtrl', function($scope, GlobalService, ConnectionService) {
	$scope.posts  = [];
	$scope.postsIdx  = [];
	$scope.userid = "";
	
	
	$scope.getUser = function(userid){
		return GlobalService.getUser(userid)
	}
	
	$scope.init = function () {
		$scope.message = {}
		$scope.message.controller = "bookmarklistCtrl";
		$scope.message.method  = "loadbookmark";
		$scope.message.lastDate = new Date();
		ConnectionService.connection.send(JSON.stringify($scope.message));
	}
	
	$scope.add = function (data) {
		var p = data;
		$scope.posts.push(p);
		$scope.postsIdx[p._id] = p;

	}
	
});

app.controller('postlistCtrl', function($scope, GlobalService, ConnectionService) {
	$scope.posts  = [];
	$scope.postsIdx  = [];
	$scope.userid = "";
	$scope.lastDate = new Date();
	
	$scope.space =""
	$scope.mode = 'timeline';
	$scope.message = {}
	
	$scope.editorEnabled = "";
	
	$scope.getUser = function(uid){
		return GlobalService.getUser(uid)
	}
	
	$scope.getSpace = function(sid){
		return GlobalService.getSpace(sid)
	}

	
	$scope.init = function () {
		$scope.userid = userid;
		$scope.mode = 'timeline';
		$scope.posts  = [];
		$scope.postsIdx  = [];
		$scope.message.controller = "postlistCtrl";
		$scope.message.method  = "loadposts";
		$scope.message.lastDate = new Date();
		ConnectionService.connection.send(JSON.stringify($scope.message));
		
		GlobalService.subscribe('scroll', function(){
			var m ={'timeline': "loadposts", 'space': "getPostSpace", 'search': 'search'}
			$scope.message.lastDate = $scope.lastDate;
			$scope.message.mode = $scope.mode;
			$scope.message.method = m[$scope.message.mode];
			ConnectionService.connection.send(JSON.stringify($scope.message));
		})
		
		
		GlobalService.subscribe('spaceSelected', function(ev, sid){
			$scope.mode = "space"
			$scope.posts  = [];
			$scope.postsIdx  = [];
			
			$scope.message.method  = "getPostSpace";
			$scope.space = $scope.message.space = sid;
			$scope.message.mode = $scope.mode;
			$scope.message.lastDate = new Date();
			ConnectionService.connection.send(JSON.stringify($scope.message));
		})
		
		GlobalService.subscribe('searchPerformed', function(ev, searchString){
			$scope.posts  = [];
			$scope.postsIdx  = [];
			$scope.mode = "search";
			
			$scope.message.method = "search";
			$scope.message.lastDate = new Date();;
			$scope.message.searchString = searchString
			ConnectionService.connection.send(JSON.stringify($scope.message));	
		})
		
	}

	console.log(ConnectionService)

   // $scope.$on('add', function (event, data) {
// 		$scope.posts = data;
// 		$scope.posts.map(function (p){
// 			$scope.postsIdx[p._id] = p;
// 		})
// 	})

	$scope.add = function (data) {
		var p = data;
		$scope.posts.push(p);
		$scope.postsIdx[p._id] = p;
		if(new Date(p.date) <$scope.lastDate) $scope.lastDate = new Date(p.date);
		$scope.addCalendarEvent(data);
	}
	
	$scope.new = function (data) {
		if($scope.mode == 'timeline'){
			var p = data;
			$scope.posts.push(p);
			$scope.postsIdx[p._id] = p;
		}
		$scope.addCalendarEvent(data);
	}
	
	$scope.addCalendarEvent = function(data){
  		data.title = data.text.substring(0,10);
  		data.editable = data.owner == userid;
  		data.color = $scope.getSpace(data.spaces[0]).color;
		$('#calendar').fullCalendar('addEventSource',  [data]);
	}
	
	
	$scope.enableEditor = function(id){
		$scope.editorEnabled = id;
	}
	
	$scope.save = function(postid){
		$scope.editorEnabled = "";
		var message = {};
		message.method  = "updatePost";
		message.post = postid;
		message.text = $scope.postsIdx[postid].text;
		ConnectionService.connection.send(JSON.stringify(message));
		
	}
	
	$scope.updatePost = function(data){
		$scope.postsIdx[data.post].text = data.text;
		$scope.$apply();
	}
	
	$scope.dateDiff = function(date){
		var msg = moment(date).fromNow()
		return  msg;
	}
	
	$scope.addComment = function(postId){
		var c = $("#comment_" + postId).val();
		$("#comment_" + postId).val("");
		var message = {};
		message.method  = "addcomment";
		message.post = postId;
		message.text = c;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.commentpost = function(data){
		$scope.postsIdx[data.post].comments.push(data);
		console.log($scope.posts);
		$scope.$apply();
	}
	
	
	$scope.like = function (postid){
		var message = {};
		message.method  = "likepost";
		message.id = userid;
		message.post = postid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.likepost = function (data){
		$scope.postsIdx[data.post].like.push(data.user)
		$scope.$apply();
	}
	
	
	$scope.bookmark = function (postid){
		var message = {};
		message.method  = "bookmarkpost";
		message.id = userid;
		message.post = postid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.bookmarkpost = function (data){
		$scope.postsIdx[data.post].bookmark.push(data.user)
		$scope.$apply();
	}
	
		
	
	
});



app.controller('spacelistCtrl', function($scope, GlobalService, ConnectionService) {
	$scope.editorEnabled = 0;
	$scope.spaces = new Array()
	$scope.spacesIdx = [];
	
	$scope.init = function () {
		var message = {};
		message.controller = "spacelistCtrl";
		message.method  = "loadspaces";
		message.type = "space";
		ConnectionService.connection.send(JSON.stringify(message));
	}
	

	$scope.add = function (data) {
		GlobalService.setSpaces(data)
		$scope.userid = userid;
		$scope.spaces = data;
		data.map(function(item){
			$scope.spacesIdx[item._id] = item;
			if(item.members.includes(userid))
				item.ismember = true;
			else
				item.ismember = false;
		});
 		$scope.$apply();
		
	}
	
	$scope.newSpace = function (data) {
		$scope.spaces.push(data);
		$scope.spacesIdx[data._id] = data;
			if(data.members.includes(userid))
				data.ismember = true;
			else 
				data.ismember = false;
		$scope.$apply();
	}
	
	
	$scope.selectSpace = function(sid){
		GlobalService.emit("spaceSelected", sid)
	}
	
	$scope.joinSpace = function (sid){
		$scope.spaces.map(function(item){
			if(item._id== sid)
				item.ismember = true;
		})
		
		var message = {};
		message.controller = "spacelistCtrl";
		message.method  = "joinSpace";
		message.sid = sid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.sendJoinRequest = function (sid, space, owner){
		var message = {};
		message.controller = "spacelistCtrl";
		message.method  = "sendJoinRequest";
		message.id = userid;
		message.sid = sid;
		message.owner = owner;
		message.space = space;
		ConnectionService.connection.send(JSON.stringify(message));
	}
        
	$scope.leaveSpace = function (sid){
		
		$scope.spaces.map(function(item){
			if(item._id== sid)
				item.ismember = false;
		})
		
		var message = {};
		message.controller = "spacelistCtrl";
		message.method  = "leaveSpace";
		message.sid = sid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
        $scope.joinUpdated = function (data){
            $scope.spacesIdx[data.sid].members.push(data.id);
            $scope.spacesIdx[data.sid].ismember = true;
        }
        
        
	$scope.removeSpace = function(sid){
		var message = {};
		message.controller = "spacelistCtrl";
		message.method  = "removeSpace";
		message.sid = sid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.spaceRemoved = function (data) {
		var idx = 0;
		var fidx = 0;
		$scope.spaces.map(function(item){
			if(item._id == data.sid)
				fidx=idx
			idx ++
		});
		$scope.spaces.splice(fidx, 1);
		$scope.spacesIdx[data.sid] = undefined;
		$scope.$apply();
	}
	
	$scope.webshotloaded = function(data){
		$scope.spaces.map(function(item){
			if(item._id== data.param)
				item.image = data.filename;
		})
		
		var message = {};
		message.method  = "updateImage";
		message.sid = data.param;
		message.filename = data.filename;
		ConnectionService.connection.send(JSON.stringify(message));
		
	}
	
	$scope.imageUpdated = function(data){
		$scope.spaces.map(function(item){
			if(item._id== data.sid)
				item.image = data.filename;
		})
	}
	
	
	$scope.setUser = function (data) {
		data.map(function(item){
			$scope.users[item._id] = item;
		})
		
	}
	
	$scope.updateTitle = function(sid){
		//$scope.editorEnabled = 0;
		message = {}
		message.method  = "updateSpaceTitle";
		message.name = $scope.spacesIdx[sid].name;
		message.sid = sid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.nameUpdated = function(data){
		$scope.spacesIdx[data.sid].name = data.name;
	}
	
        $scope.levelUpdated = function(data){
		$scope.spacesIdx[data.sid].level = data.level;
	}
	
	$scope.changePrivate = function(sid){
		message = {}
		message.method  = "changePrivate";
		message.sid = sid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.changePublic = function(sid){
		message = {}
		message.method  = "changePublic";
		message.sid = sid;
		ConnectionService.connection.send(JSON.stringify(message));
	}
	
	$scope.createNewSpace = function(){
		message = {}
	    message.name = "New Space (" + GlobalService.getUser(userid).firstname + " " + GlobalService.getUser(userid).lastname + ")";
		message.level = "private";
		message.color = getRandomColor()
		message.method  = "createNewSpace";
		message.members = [];
		ConnectionService.connection.send(JSON.stringify(message));
 	}
	
	$scope.users  = [];
	$scope.spaces  = [];
});




app.controller('userlistCtrl', function($scope, GlobalService, ConnectionService) {
	
	$scope.chatwindow = 0;
	$scope.users = []
	$scope.usersIdx = {}
	
	$scope.init = function () {
		var message = {};
		message.method  = "loadusers";
		message.type = "user";
		ConnectionService.connection.send(JSON.stringify(message));
		
    	  $('#chatmain').scroll(function() {
            if ($('#chatmain').scrollTop() ==0) {
				var message = {};
				message.method  = "loadmessages";		
				message.lastDate = $scope.users[$scope.chatwindow].lastDateMessage;
				message.friend = $scope.chatwindow;
				ConnectionService.connection.send(JSON.stringify(message));
            }
    	 })
	
	}
	
	// $scope.adduser = function (data) {
// 		$scope.users.push(data);
// 		angular.element($("#loadspaces")).scope().setUser(data);
//
// 	}
	
	$scope.changeStatus = function(data){
		$scope.usersIdx[data.uid].active = data.active;
	}
	
	$scope.add = function (data) {
		data.map(function(item){
			$scope.users.push(item)
			$scope.usersIdx[item._id] = item;
			item.unreadMsgCnt = 0;
			item.messages = [];
			item.lastDateMessage = new Date();
		});
		GlobalService.setUsers($scope.usersIdx);
		
		//and now we get the unread messages
		var message = {};
		message.method  = "getUnreadMessages";
		ConnectionService.connection.send(JSON.stringify(message));
		
	}
	
	$scope.unreadMessages = function(data){
		data.map(function(item){
			if(item.read == false)
				$scope.usersIdx[item.from].unreadMsgCnt++;
		})
	}
	
	$scope.addMessage = function(data){
		$scope.usersIdx[data.from].messages.unshift(data);
		$scope.usersIdx[data.to].messages.unshift(data);  //my messages send to my friend
		if(moment(data.date) <= moment($scope.usersIdx[data.from].lastDateMessage))  $scope.usersIdx[data.from].lastDateMessage = data.date;
		if((data.from == $scope.chatwindow)  || (data.to == $scope.chatwindow) ){
				
		}
		else{
			if(data.read == false && data.from != $scope.chatwindow)
				$scope.usersIdx[data.from].unreadMsgCnt++;
		}
	}
	
	$scope.newMessage = function(data){
		$scope.usersIdx[data.from].messages.push(data);
		$scope.usersIdx[data.to].messages.push(data);  //my messages send to my friend
		
		if((data.from == $scope.chatwindow)  || (data.to == $scope.chatwindow) ){
			$scope.$apply();
			var objDiv = document.getElementById("chatmain");
			objDiv.scrollTop =  objDiv.scrollHeight;
			
		}
		else{
			if(data.read == false || data.from != $scope.chatwindow)
				$scope.usersIdx[data.from].unreadMsgCnt++;
		}
	}
	
	
	
	$scope.showMessages = function(friend){
		$('.chat-window').show();
		$scope.chatwindow = friend;
		
		$scope.usersIdx[friend].lastDateMessage = new Date();
		$scope.messages = $scope.usersIdx[friend].messages = [];
		$scope.friend = GlobalService.getUser(friend);
		$scope.my = GlobalService.getUser(userid);
		
		$scope.usersIdx[friend].unreadMsgCnt = 0;
			
		var message = {};
		message.method  = "loadmessages";
		message.lastDate = new Date();
		message.friend = friend;
		ConnectionService.connection.send(JSON.stringify(message));
	}

 	$scope.lineInView = function($index, $inview, $inviewpart){
		console.log($scope.messages[$index].text)
 	}

//messages

	$scope.messages = [];
	$scope.friend  = {};
	$scope.my = {}
	$scope.text = "";
	


	$scope.closeChatWindow = function(){
		$scope.chatwindow = 0;
	}

	
	$scope.sendMessage = function(){
		var message = {};
		message.method  = "sendMessage";
		message.from = userid;
		message.to = $scope.friend._id;
		message.text = $scope.text;
		ConnectionService.connection.send(JSON.stringify(message));
		$scope.text = "";
	}
	
	$scope.sendMessageKey = function(ev){
		if(ev.charCode == 13)
			$scope.sendMessage();
	}
	
	
	$scope.dateDiff = function(date){
		var msg = moment(date).fromNow()
		return  msg;
	}
        
        $scope.approve = function(member, space){
            var message = {};
		message.method  = "approveJoin";
		message.member = member;
		message.space = space;
		ConnectionService.connection.send(JSON.stringify(message));
        }
        $scope.decline = function(member, space){
            var message = {};
		message.method  = "declineJoin";
		message.member = member;
		message.space = space;
		ConnectionService.connection.send(JSON.stringify(message));
        }
	
})


app.controller('menuCtrl', function($scope, ConnectionService, GlobalService) {
	
	$scope.getUser = function(){
		return GlobalService.getUser(userid)
	}
	
	
	$scope.logout = function(){
		localStorage.removeItem("js_session");
		$("#login").show();
		$("#wrapper").hide();
		var message = {};
		message.method = "logout";
		ConnectionService.connection.send(JSON.stringify(message));
	}
});

app.controller('userFormCtrl', function($scope, ConnectionService) {
	$scope.user = {}
    $scope.user.username = "John";
	$scope.user.password = "password";
	$scope.submit = function() {
		$scope.user.type = "user";
		$scope.user.method  = "createNewObject";
		ConnectionService.connection.send(JSON.stringify($scope.user));
	 }
});


app.controller('spaceFormCtrl', function($scope, ConnectionService) {
	$scope.space = {}
    $scope.space.name = "";
	$scope.space.level = "private";
	$scope.submit = function() {
		$scope.space.type = "space";
		$scope.space.method  = "createNewSpace";
		$scope.space.members = [];
		ConnectionService.connection.send(JSON.stringify($scope.space));
	 }
});


app.controller('loginFormCtrl', function($scope, ConnectionService) {
	$scope.user = {}
    $scope.user.username = "";
	$scope.user.password = "";
	
	
	
	$scope.init = function(){
		ConnectionService.init();
	}
	
	//$scope.$on('login', function(event, data){
	$scope.login = function(data){
		if(data.error == 0){
			$("#login").hide();
			$("#wrapper").show();
			localStorage.setItem("js_session", data.session);
			userid = data.userid;
			angular.element($("#loadposts")).scope().init();
			angular.element($("#loadusers")).scope().init();
			angular.element($("#loadspaces")).scope().init();
			angular.element($("#bookmarklist")).scope().init();
			
			angular.element($("#postFormCtrl")).scope().init();
			
		}
		else{
				alert(data.message)
		}
	}
	
	
	$scope.submit = function() {
		$scope.user.type = "session";
		$scope.user.method  = "login";
		ConnectionService.connection.send(JSON.stringify($scope.user));
	 }
});



app.controller('postFormCtrl', function($scope, GlobalService, ConnectionService, $compile, uiCalendarConfig) {
	
	
	$scope.post = {}
        $scope.post.text = "";
	$scope.post.files = [];
	$scope.post.spaces = []
	
	$scope.filesContent = [];
	$scope.userid = userid;
	$scope.spaces = [];
        
        $scope.loading = false;
	
	$scope.start = ""
	$scope.end = ""
	$scope.event = false;
	$scope.facebook = false;
	
	$scope.spacesTags = [];
	
	$scope.calendarEvent ={
		title: '',
		color: '#aaa',
		allDay: true,
		stick : true, 
		editable: true
	}
	
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
	
    
    /* event source that pulls from google.com */
    $scope.eventSource = {
            url: "http://www.google.com/calendar/feeds/usa__en%40holiday.calendar.google.com/public/basic",
            className: 'gcal-event',           // an option!
            currentTimezone: 'America/Chicago' // an option!
    };
	
	$('#calendar').fullCalendar({
		minTime: "07:00:00",
		maxTime: "22:00:00",
		slotDuration: "00:30:00",
		header:{
		    center:   'title',
		    left: 'month agendaWeek',
		    right:  'today prev,next'
		},
		dayClick: function(date, jsEvent, view) {
			var evs = $('#calendar').fullCalendar( 'clientEvents', ["mob" ] );
			if(evs.length == 0){
				var data = {id: "mob", title: $scope.post.text, color:'#aaa', stick: true, editable:true, allDay:true};
				data.start = date.get()
				$('#calendar').fullCalendar('addEventSource',  [data]);
			  	$scope.postEvent = true
			}
			else{
				evs[0].start = date.get()
				$('#calendar').fullCalendar( 'updateEvent', evs[0]);
			}
		},
		
		//eventSources: [$scope.events],
	    events: function(start, end, timezone, callback) {
	        var s = new Date(start)
	        var e = new Date(end);
			$scope.events.length = 0;
	  //       var m = new Date(start).getMonth();
	  		$scope.events.length = 0
	  		var message = {};
	  		message.method = 'loadEvents';
	  		message.start = s;
	  		message.end = e;
	  		ConnectionService.connection.send(JSON.stringify(message));
			$('#calendar').fullCalendar( 'removeEvents');
	        callback([]);
	      }
	  });
	
  	$scope.addCalendarEvent = function(data){
  		data.title = data.text.substring(0,10);
  		data.editable = data.owner == userid;
		data.color = GlobalService.getSpace(data.spaces[0]).color;
		$('#calendar').fullCalendar('addEventSource',  [data]);
  	}
	
    $scope.$watch('post.text', function() {
		var evs = $('#calendar').fullCalendar( 'clientEvents', ["mob" ] );
		if(evs.length >0 ){
        	evs[0].title =  $scope.post.text;
			$('#calendar').fullCalendar( 'updateEvent', evs[0]);
		}
    });
	
    /* event source that contains custom events on the scope */
    $scope.events = [
      // {title: 'All Day Event',start: new Date(y, m, 1)},
//       {title: 'Long Event',start: new Date(y, m, d - 5),end: new Date(y, m, d - 2)},
//       {id: 999,title: 'Repeating Event',start: new Date(y, m, d - 3, 16, 0),allDay: false},
//       {id: 999,title: 'Repeating Event',start: new Date(y, m, d + 4, 16, 0),allDay: false},
//       {title: 'Birthday Party',start: new Date(y, m, d + 1, 19, 0),end: new Date(y, m, d + 1, 22, 30),allDay: false},
//       {title: 'Click for Google',start: new Date(y, m, 28),end: new Date(y, m, 29),url: 'http://google.com/'}
    ];
    /* event source that calls a function on every view switch */
    $scope.eventsF = function (start, end, timezone, callback) {
      var s = new Date(start)
      var e = new Date(end);
//       var m = new Date(start).getMonth();
		$scope.events.length = 0
		var message = {};
		message.method = 'loadEvents';
		message.start = s;
		message.end = e;
		ConnectionService.connection.send(JSON.stringify(message));
        callback($scope.events);
    };
	
	
	
	

    $scope.calEventsExt = {
       color: '#f00',
       textColor: 'yellow',
       events: [
          // {type:'party',title: 'Lunch',start: new Date(y, m, d, 12, 0),end: new Date(y, m, d, 14, 0),allDay: false},
//           {type:'party',title: 'Lunch 2',start: new Date(y, m, d, 12, 0),end: new Date(y, m, d, 14, 0),allDay: false},
//           {type:'party',title: 'Click for Google',start: new Date(y, m, 28),end: new Date(y, m, 29),url: 'http://google.com/'}
        ]
    };
	
	
	
    /* alert on eventClick */
    $scope.alertOnEventClick = function( date, jsEvent, view){
        console.log (' was clicked ', date.title );
    };
    /* alert on Drop */
     $scope.alertOnDrop = function(event, delta, revertFunc, jsEvent, ui, view){
		 
		 console.log($scope.events)
	  
    };
    /* alert on Resize */
    $scope.alertOnResize = function(event, delta, revertFunc, jsEvent, ui, view ){
	 if(event.start.hasTime) {
 		 $scope.events[0].allDay = false;
 	 }
 	 else {
 		 $scope.events[0].allDay = true;
 	 }
 	   $scope.events[0].end = event.end;
  	   console.log("resize", $scope.events[0])
		
    };
   
	
	$scope.postEvent = false;
	
  
	
    /* add custom event*/
    $scope.addEvent = function(d) {
		console.log($scope.events)
		if(!$scope.postEvent){
	
	      $scope.events.push({title: $scope.post.text, color:'#aaa', stick: true, allDay:true})
		  $scope.postEvent = true
		}
		console.log(d.format('L'));
		$scope.events[0].start = d.get()
		
      
		$(".fc-week-number").click(function(){alert(1)})
    };
	
    /* remove event */
    $scope.remove = function(index) {
      $scope.events.splice(index,1);
    };
   
	
    
        

    
    
	//POST 
	
	$scope.post = {}
        $scope.post.text = "";
	$scope.post.files = [];
	$scope.post.spaces = []
	
	$scope.filesContent = [];
	$scope.userid = userid;
	$scope.spaces = [];
	
	$scope.start = ""
	$scope.end = ""
	$scope.event = false;
	
	$scope.spacesTags = []
	
	$scope.loadItems = function($query){
		var res = [];
		for(i = 0; i < $scope.spaces.length; i++ ){
			var item = $scope.spaces[i];
			var re = RegExp($query, 'ig')
			if(item.ismember && (item.name.match(re))) res.push({name: item.name, id:item._id})
		}
		return res;
	}
	

	$scope.spaces = GlobalService.subscribe("spacesUpdated", function (ev, data){
		$scope.spaces = data;
	})


	$scope.init = function(){
	}
	
	
	$scope.loadwebshot = function(){
            $scope.loading = true;
		var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	    var res = $scope.url.match(exp);
		if(res!=null){
			var message = {}
			message.method = "loadwebshot";
			message.url = $scope.url;
			message.name = randString(20) + ".png"
			ConnectionService.connection.send(JSON.stringify(message));
		}
	}
	
	$scope.webshotloaded = function(data){
                        $scope.loading = false;
			$scope.post.files.push(data)
	}
	
	$scope.imageDropped = function(item){
                        $scope.loading = true;
			ConnectionService.sendFile(item.descriptor, item.content);
	}
	
	

	$scope.submit = function() {
		$scope.post.controller = "postFormCtrl";
		$scope.post.type = "post";
		$scope.post.method  = "addpost";


		if($scope.facebook){
			$scope.post.facebook = $scope.facebook;
		}
		
		if($scope.video){
			$scope.post.video = $scope.video;
		}
                


		//calendar fields
		var evs = $('#calendar').fullCalendar( 'clientEvents', ["mob" ] );
		if(evs.length > 0){
			$scope.post.start = evs[0].start;
			$scope.post.end = evs[0].end;
			$('#calendar').fullCalendar( 'removeEvents', ["mob" ] );
		}
				
	    //geo fields
		$scope.post.location = {}
		
		$scope.myMarkers.map(function(item){
			$scope.post.location.lat = item.position.lat();
			$scope.post.location.lng = item.position.lng();
			$scope.post.location.zoom = $scope.myMap.getZoom();
			item.setMap(null);
		})
		
		$scope.spacesTags.map(function(item){
			$scope.post.spaces.push(item.id)
		})
		
		
		ConnectionService.connection.send(angular.toJson($scope.post));
		
		
		$scope.url = "";
		$scope.event = $scope.link = $scope.showmap = false;
		$scope.post.location = {}
		$scope.myMarkers = []
		$scope.spacesTags = []
		
	    $scope.post.text = "";
 		$scope.post.files = [];
		$scope.post.spaces = [];
                $scope.post.video = undefined;
 		$scope.filesContent = [];
		$scope.facebook = false;
		$scope.video = undefined;
                $scope.loading = false;
	 }
	 
	 //google map
	 
     $scope.mapOptions = {
       center: new google.maps.LatLng(39.222, 9.129),
       zoom: 15,
       mapTypeId: google.maps.MapTypeId.ROADMAP
     };
	 $scope.myMarkers = []
 	 $scope.addMarker = function(a,b){
 		if($scope.myMarkers[0] ==undefined){
 		$scope.myMarkers[0] = new google.maps.Marker({
 					draggable:true,
 		            map: $scope.myMap,
 		            position: new google.maps.LatLng(b[0].latLng.lat(), b[0].latLng.lng()),
 		        });
 		}
 	}
	
 
	//datepicker
	
		//
	// $scope.dt = new Date();
	//
	//
	//
	// $scope.dateOptions = {
	//     formatYear: 'yy',
	//     maxDate: new Date(2020, 5, 22),
	//     minDate: new Date(),
	//     startingDay: 1,
	// 	templateUrl: ../../uib/template/datepicker/datepicker.html
	//   };
	//
	//   $scope.open1 = function() {
	//      $scope.popup1.opened = true;
	//    };
	 
});


function handleFileSelect(evt) {
	$(".droparea").removeClass('droparea-active');
	$(".droparea").removeClass('droparea-active-hover');
    evt.stopPropagation();
    evt.preventDefault();
    var files = evt.originalEvent.dataTransfer.files; // FileList object.
	
	// files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
		var descriptor = {}
		descriptor.ext = f.name.split('.').pop();
		descriptor.name = randString(20);
		descriptor.originalName = f.name;
		descriptor.lastModified = f.lastModified;
		descriptor.size = f.size;
		descriptor.type = f.type;
		descriptor.isImage = (f.type.match('image.*')!=null);  //true or false
		descriptor.isPdf = (f.type.match('application/pdf')!=null);  //true or false
		descriptor.ngcontroller = $(this).data("ngcontroller")
		descriptor.param = $(this).data("param");
		descriptor.dir = $(this).data("dir")
		
		f.descriptor = descriptor;
		//angular.element($("[ng-controller = postFormCtrl]")).scope().post.files.push(descriptor)
		  		
			
  	      var reader = new FileReader();
   		   reader.readAsDataURL(f);
  	      // Closure to capture the file information.
  	      reader.onloadend = (function(theFile) {
  	        return function(e) {
				angular.element($("[ng-controller = postFormCtrl]")).scope().imageDropped({descriptor: theFile.descriptor, content: e.target.result});
  	        };
  	      })(f);		
	}    
  }

  function handleDragOver(evt) {
	 // console.log(evt.originalEvent.dataTransfer.items[0].type)
	$(this).addClass('droparea-active-hover');
    evt.stopPropagation();
    evt.preventDefault();
    evt.originalEvent.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }
  
  function handleDragExit(evt) {
	 $(this).removeClass('droparea-active-hover');
  }
  // Setup the dnd listeners.
	body = $("body")
	body.on('dragenter', handleDragEnterBody);
	body.on('dragleave', handleDragExitBody);
	
  function handleDragEnterBody(evt) {
	var dropZone = $(".droparea");
	$(".droparea").addClass('droparea-active');
	
    dropZone.unbind('dragover', handleDragOver)
    dropZone.unbind('drop', handleFileSelect)
	dropZone.unbind('dragleave', handleDragExit);
	
    dropZone.on('dragover', handleDragOver)
    dropZone.on('drop', handleFileSelect)
	dropZone.on('dragleave', handleDragExit);

  }
  
  function handleDragExitBody(evt) {
      evt.stopPropagation();
      evt.preventDefault();
	  if(evt.originalEvent.pageX == "0"){
	  		$(".droparea").removeClass('droparea-active');
			$(".droparea").removeClass('droparea-active-hover');
	}
  }

  function onGoogleReady() {
    angular.bootstrap(document.getElementById("map"), ['myApp']);
  }
  




//JS DRAG & DROP


(function ( $ ) {
    $.fn.jsdraggable = function( ) {      
        return this.each(function() {
			$(this).draggable({
				helper: "clone",
                start: function (event, ui) {
                    sourceElement = $(this);
                },
			});
        });
    };
}( jQuery ));


(function ( $ ) {
    $.fn.jsdroppable = function( ) {      
        return this.each(function() {
			$(this).droppable({
      drop: function( event, ui ) {
		  $("body").trigger("dropped", {target: $(this).data(), source: sourceElement.data()});
      }
    });
        });
    };
}( jQuery ));



function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';        
    color += letters[Math.round(Math.random() * 5)];
  
    for (var i = 0; i < 2; i++) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
} 



function randString(x){
    var s = "";
    while(s.length<x&&x>0){
        var r = Math.random();
        s+= (r<0.1?Math.floor(r*100):String.fromCharCode(Math.floor(r*26) + (r>0.5?97:65)));
    }
    return s;
}

    
