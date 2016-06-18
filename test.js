
var ldap = require('ldapjs');


var client = ldap.createClient({
  url: 'ldap://ldapcluster.crs4.it'
});

var opts = {
	scope: 'sub',
	filter: 'uid=gavino',
    attributes: ['givenName', 'sn']

};


client.bind('uid=gavino,ou=People,dc=crs4', 'enrifal0316', function(err) {
  console.log(err);
});

client.search('ou=People,dc=crs4', opts, function(err, res) {
	console.log("ldap: ", res)

	res.on('searchEntry', function(entry) {
		if(entry.attributes[0]!= undefined)
	   	 console.log('Name: ' + entry.attributes[0].vals[0]);
		 console.log('Name: ' + entry.attributes[1].vals[0]);
		
	  });
	  res.on('searchReference', function(referral) {
	    console.log('referral: ' + referral);
	  });
	  res.on('error', function(err) {
	    console.error('error: ' + err.message);
	  });
	  res.on('end', function(result) {
	    console.log('status: ' + result);
	  });

})


// $options = array(
//         'enableLogging' => false,
//         'host' => 'ldapcluster.crs4.it',
//         'userattr' => 'uid',
//         'binddn' => 'ou=People,dc=crs4',
//         'version' => 3,
//         'debug' => false
//           );

//
//
// var extract = require('pdf-text-extract')
// extract("./test.pdf", function (err, pages) {
//   if (err) {
//     console.dir(err)
//     return
//   }
//   console.log(pages)
// })
//
//
// setInterval(function(){console.log("end")}, 10000)