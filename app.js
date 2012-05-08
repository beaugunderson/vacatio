var express = require('express');
var querystring = require('querystring');
var request = require('request');

var MongoStore = require('connect-mongo')(express);

var singly = require('./singly');

var hostUrl = process.argv[2] || 'https://carealot.singly.com';

var client_id = 'vacat.io';
var client_secret = 'SECRET_HERE';

var port = 8042;

function getLink(service, name, profiles) {
   if (profiles &&
      profiles[service] !== undefined) {
      return '<span class="check">&#10003;</span> ' + name;
   }

   return '<a href="' + hostUrl + '/oauth/authorize?' + querystring.stringify({
      client_id: client_id,
      redirect_uri: 'http://vacat.io/callback',
      service: service
   }) + '">' + name + '</a>';
}

var app = express.createServer();

app.configure(function() {
   app.use(express.logger());
   app.use(express.static(__dirname + '/public'));
   app.use(express.bodyParser());
   app.use(express.cookieParser());
   app.use(express.session({
      secret: 'SECRET_HERE',
      store: new MongoStore({
         db: 'express-sessions'
      })
   }));
   app.use(app.router);
});

app.configure('development', function() {
   app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
   }));
});

app.configure('production', function() {
   app.use(express.errorHandler());
});

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
   res.render('index', {
      services: {
         facebook: getLink('facebook', 'Facebook', req.session.profiles),
         foursquare: getLink('foursquare', 'foursquare', req.session.profiles),
         instagram: getLink('instagram', 'Instagram', req.session.profiles),
         twitter: getLink('twitter', 'Twitter', req.session.profiles)
      },
      session: req.session
   });
});

app.get('/callback', function(req, res) {
   var data = {
      client_id: client_id,
      client_secret: client_secret,
      code: req.param('code')
   };

   request.post({
      uri: hostUrl + '/oauth/access_token',
      body: querystring.stringify(data),
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
      }
   }, function (err, resp, body) {
      try {
         body = JSON.parse(body);
      } catch(parseErr) {
         return res.send(parseErr, 500);
      }

      req.session.access_token = body.access_token;

      singly.getProtectedResource('/profiles', req.session, function(err, profilesBody) {
         try {
            profilesBody = JSON.parse(profilesBody);
         } catch(parseErr) {
            return res.send(parseErr, 500);
         }

         req.session.profiles = profilesBody;

         res.redirect('/');
      });
   });
});

app.listen(port);
