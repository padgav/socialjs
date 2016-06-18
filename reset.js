var casual = require('casual');
var Flickr = require("flickrapi");
var webshot = require('webshot');

var fs = require('fs');



var people = JSON.parse(fs.readFileSync('crs4foto/people.json', 'utf8'));


// var client = ldap.createClient({
//   url: 'ldap://ldapcluster.crs4.it'
// });
//
// var opts = {
// 	scope: 'sub',
//
//     attrs: '*'
//
// };
//
// client.search('dc=crs4', opts, function(err, res) {
// 	console.log("ldap: ", res)
//
// 	res.on('searchEntry', function(entry) {
// 	    console.log('entry: ' + entry);
// 	  });
// 	  res.on('searchReference', function(referral) {
// 	    console.log('referral: ' + referral);
// 	  });
// 	  res.on('error', function(err) {
// 	    console.error('error: ' + err.message);
// 	  });
// 	  res.on('end', function(result) {
// 	    console.log('status: ' + result.status);
// 	  });
//
// })


// webshot('http://www.entulas.org/', 'google.png', function(err) {
//   // screenshot now saved to google.png
// });

var count = 0;
var photos = []
    flickrOptions = {
      api_key: "712ff1ab8e60cd19c41f593126255910"
      //secret: "689daa952660fd1a"
    };
 
	Flickr.tokenOnly(flickrOptions, function(error, flickr) {
	  // we can now use "flickr" as our API object,
	  // but we can only call public methods and access public data
		
		flickr.photos.search({
		  text: "landscape",
		  has_geo: 1,
			
		}, function(err, result) {
		  if(err) { console.log(err); throw new Error(err); }
		  // do something with result
		 // console.log(result.photos.photo)
		  result.photos.photo.map(function(item){
			  
			  flickr.photos.geo.getLocation({photo_id: item.id}, function(err, result){
				  item.location = result.photo.location;
				  count++;
				  photos.push(item);
				  
				  if(count == 20) startdb();
			  })

		  })
		  
		})
		
		
	});
	
	
	function startdb(){

var MongoClient = require('mongodb').MongoClient;
ObjectID = require('mongodb').ObjectID

var mongodb;

MongoClient.connect('mongodb://127.0.0.1:27017/' + 'socialcrs4', function(err, db) {
	mongodb = db;
	var user = mongodb.collection("user");
	var space = mongodb.collection("space");
	var post = mongodb.collection("post");
	var news = mongodb.collection("news");
	var comment = mongodb.collection("comment");
	var message = mongodb.collection("message");
	
	post.createIndex({ text: "text" });
	
	
	
	user.remove({}, function(err){console.log("user remove done", err)});
	space.remove({}, function(err){console.log("space remove done", err)});
	post.remove({}, function(err){console.log("post remove done", err)});
	news.remove({}, function(err){console.log("news remove done", err)});
	message.remove({}, function(err){console.log("message remove done", err)});
	comment.remove({}, function(err){console.log("comment remove done", err)});
	
	
	
	var users = [ObjectID("507f191e810c19729de860ea"), ObjectID("507f191e810c19729de860eb"),  ObjectID("607f191e810c19729de860eb"), ObjectID("607f191e810c19769de860eb")]
	
	for(i=0; i<200; i++)
		users.push(new ObjectID());
	
	user.save({_id: users[0], username: 'gavino', password: 'gavino', firstname:'Gavino', lastname:'Paddeu', active: false, image:"uploads/user/gavino.jpg"});
	user.save({_id: users[1], username: 'paolo', password: 'paolo', firstname:'Paolo', lastname:'Sirigu', active:true, image:"uploads/user/paolo.jpg"});
	user.save({_id: users[2], username: 'mameli', password: 'mameli', firstname:'Andrea', lastname:'Mameli',active:false, image:"uploads/user/mameli.jpg"});
	user.save({_id: users[3], username: 'ivan', password: 'ivan', firstname:'Ivan', lastname:'Marcialis',active:false, image:"uploads/user/ivan.jpg"});

	for(var u=0; u<people.length; u++){
		var name = people[u].name.split(" ");
		name[0] = name[0].substr(1);
		var firstname = name[0];
		var lastname = name[1]
		if(name.length > 3){
			if( name[1].length>3) { 
				firstname = name[0] + " " + name[1] ;
				lastname = name[2] 
			}
			else{
				firstname = name[0]  ;
				lastname =  name[1] + " " + name[2] 
			}
		}
		console.log(firstname)
		console.log(lastname)
		console.log(people[u])
		
		user.save({_id: users[u+4], username: 'user' + (u+4), password: 'pw' + u, firstname:firstname, lastname:lastname, image: people[u].filename, active: false});
	}
	
	var cnt=0
	var timer = setInterval(function(){
		message.save({to: ObjectID("507f191e810c19729de860ea"), from: ObjectID("507f191e810c19729de860eb"), text: "ciao" + i, type:"text", date: new Date(), read:false});
	    console.log("message:", cnt)
		if(cnt++ >100) clearInterval(timer);
	}, 100)

	// for(i=0;i<10000; i++)
// 	user.save({username: 'mameli', password: 'mameli', firstname:'Andrea', lastname:'Mameli',type:"user"});
//
	space.save({_id: ObjectID("507f191e810c19729de860ec"), owner: ObjectID("507f191e810c19729de860ea"), level: "public",  color: "#3dd", name: 'CRS4', desc:'General CRS4 Space', members: [ObjectID("507f191e810c19729de860ea"), ObjectID("507f191e810c19729de860eb"), ObjectID("607f191e810c19769de860eb")], image: "uploads/space/likes-1.png"});
	space.save({_id: ObjectID("507f191e810c19729de860ed"), owner: ObjectID("507f191e810c19729de860ea"), level: "private", color: "#d4a", name: 'ISOC', desc:'Information Society Space', members: [ObjectID("507f191e810c19729de860ea"), ObjectID("507f191e810c19729de860eb")], image:"uploads/space/likes-2.png"});
	space.save({_id: ObjectID("607f191e810c19729de860ed"), owner: ObjectID("507f191f810c19729de860ea"), level: "private", color: "#de4", name: 'VIC', desc:'VIC Space', members: [], image:"uploads/space/likes-3.png"});
	
	post.save({_id: ObjectID("507f191e810c19729de860ef"), text: "Ciao a tutti questo è un post", owner: ObjectID("507f191e810c19729de860ea"), type:"post", spaces: [ObjectID("507f191e810c19729de860ec"), ObjectID("507f191e810c19729de860ed")], date: new Date(),
	like: [ObjectID("507f191e810c19729de860ea"), ObjectID("507f191e810c19729de860eb")],
	view: [ObjectID("507f191e810c19729de860ea"), ObjectID("507f191e810c19729de860eb")]});
	post.save({_id: ObjectID("507f191e810c19729de862ef"), text: "Un altro post", owner: ObjectID("507f191e810c19729de860ea"), type:"post", spaces: [ObjectID("507f191e810c19729de860ec")], date: new Date(),
	like: [],bookmark: []});
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
	
		var i = 0;
		setInterval(function(){
			i++; 
			var p = casual.integer(0,20);
			var photo = photos[p]
			var filename = "https://farm"+photo.farm+".staticflickr.com/"+photo.server+"/"+photo.id+"_"+photo.secret+"_b.jpg"
			
			
			var obj = { 
				text: casual.sentences(casual.integer(1,10)) + " " + i, 
				owner: users[casual.integer(0,3)], 
				files: [{filename:filename, preview:filename, isImage: true}],
				location: {
					lat :photo.location.latitude,
					lng: photo.location.longitude,
					zoom: 5
				},
				type:"post", 
				spaces: [ObjectID("507f191e810c19729de860ec")], 
				date: new Date(),
				like: [],
				bookmark: [],
				
			}; 
			if(casual.coin_flip && casual.coin_flip){
				var start = d + casual.integer(-30, 30);
				obj.start = new Date(y, m, start, 16, 0);
				obj.end =  new Date(y, m, start + casual.integer(0, 2), 0, 0);
			}
			post.save(obj);
			console.log("insert post " + i)
		} , 100);
	
	
	
	// news.save({_id: ObjectID("507f191e810c19729de860f0"), space: ObjectID("507f191e810c19729de860ec"), subject: ObjectID("507f191e810c19729de860ef"), owner: ObjectID("507f191e810c19729de860ea"), view:false, like:true, type:"news", subjecttype:"post"});
// 	news.save({_id: ObjectID("507f191e810c19729de860f1"), space: ObjectID("507f191e810c19729de860ec"), subject: ObjectID("507f191e810c19729de860ef"), owner: ObjectID("507f191e810c19729de860eb"), view:false, like:true, type:"news", subjecttype:"post"});
	
	
	comment.save({_id: ObjectID("507f191e810c19729de860f2"),  owner: ObjectID("507f191e810c19729de860eb"), text: 'questo è un commento n. 1', type:"comment", post:  ObjectID("507f191e810c19729de860ef"), date: new Date()});
	// news.save({_id: ObjectID("507f191e810c19729de860f3"), subject: ObjectID("507f191e810c19729de860f1"), owner: ObjectID("507f191e810c19729de860ea"), view:false, type:"news", subjecttype:"comment"});
// 	news.save({_id: ObjectID("507f191e810c19729de860f4"), subject: ObjectID("507f191e810c19729de860f1"), owner: ObjectID("507f191e810c19729de860eb"), view:false, type:"news", subjecttype:"comment"});
//
	comment.save({_id: ObjectID("507f191e810c19729de860f5"),  owner: ObjectID("507f191e810c19729de860eb"), text: 'questo è un commento n.2', type:"comment", post:  ObjectID("507f191e810c19729de860ef"), date: new Date() });
	// news.save({_id: ObjectID("507f191e810c19729de860f6"), subject: ObjectID("507f191e810c19729de860f1"), owner: ObjectID("507f191e810c19729de860ea"), view:false, type:"news", subjecttype:"comment"});
// news.save({_id: ObjectID("507f191e810c19729de860f7"), subject: ObjectID("507f191e810c19729de860f1"), owner: ObjectID("507f191e810c19729de860eb"), view:false, type:"news", subjecttype:"comment"});
	
	
//process.exit()
});


}

