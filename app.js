//  BEGIN BOILER PLATE //

// Set up server
var express    = require('express');
var app        = express();
var ejs        = require('ejs');
var db         = require('./db.js');
var bodyParser = require('body-parser'),
cookieParser  = require('cookie-parser'),
session       = require('express-session');
var methodOverride = require('method-override');
var path       = require('path'),
LocalStrategy	 = require('passport-local').Strategy,
passport     	 = require('passport');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.query("SELECT * FROM users WHERE id = $1", [id], function (err, user) {
    done(err, user);
  });
});

var localStrategy = new LocalStrategy(
  function(username, password, done) {
  	db.query("SELECT * FROM users WHERE username = $1", [username], function(err, dbRes) {
        var user = dbRes.rows[0];
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
  }
)

passport.use(localStrategy);

app.use(passport.initialize());
app.use(passport.session());

// Listen on port
app.listen(3000);
console.log('Server running');

//  END BOILER PLATE //

app.get('/', function(req, res) {
  res.render('index')
});