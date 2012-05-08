var OAuth2 = require('oauth').OAuth2;

var baseUrl = 'https://carealot.singly.com';

var oa = new OAuth2('vacat.io', 'SECRET_HERE', baseUrl);

exports.getOAuthAccessToken = function(code, options, callback) {
   oa.getOAuthAccessToken(code, {}, callback);
};

exports.getProtectedResource = function(path, session, callback) {
   oa.getProtectedResource(baseUrl + path, session.access_token, callback);
}
