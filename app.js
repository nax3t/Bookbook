//  BEGIN BOILER PLATE //

// Set up server
var express    = require('express'),
    partials   = require('express-partials');
var app        = express();
var ejs        = require('ejs');
var db         = require('./db.js');
var bodyParser = require('body-parser'),
cookieParser   = require('cookie-parser'),
session        = require('express-session');
var methodOverride = require('method-override');
var path       = require('path'),
LocalStrategy	 = require('passport-local').Strategy,
passport     	 = require('passport'),
books          = require('google-books-search');

app.use(partials());
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

// Home Route 
app.get('/', function(req, res) {
  var user = req.user;
  res.render('index', {user:user});
});

// Users Routes
app.get('/users/new', function(req, res) {
  res.render('users/signup');
});

app.post('/users', function(req, res) {
  db.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [req.body.username, req.body.email, req.body.password], function(err, dbRes) {
      if (!err) {
        res.redirect('/');
      }
  });
});

// Session routes
app.post('/sessions', passport.authenticate('local', 
  {failureRedirect: '/'}), function(req, res) {
    res.redirect('/');
});

app.delete('/sessions', function(req, res) {
  req.logout();
  res.redirect('/');
});

// Book Routes
app.get('/books', function(req, res) {
  if(req.user) {
    var user = req.user.rows[0];
    var title = req.query['title'];
    books.search(title, function(error, results) {
      if ( ! error ) {
        res.render('books/results', { user: user, results: results, layout: false });
      } else {
          console.log(error);
      }
    });
} else { res.redirect('/'); };
});

app.post('/books/add', function(req, res) {
  var user = req.user.rows[0];
  db.query('INSERT INTO book_lists (title, user_id, url, thumb) VALUES ($1, $2, $3, $4)', [req.body.title, user.id, req.body.link, req.body.thumbnail], function(err, dbRes) {
      if (!err) {
        res.redirect('/books/list');
      }
  });
});

app.get('/books/list', function(req, res) {
  db.query('SELECT * FROM book_lists', function(err, dbRes) {
    res.render('books/index', { books: dbRes.rows, layout: false });
  });
});

app.get('/books/:id', function(req, res) {
  db.query('SELECT * FROM book_lists WHERE id = $1', [req.params.id], function(err, dbRes) {
    if (!err) {
      res.render('books/show', { book: dbRes.rows[0], layout: false });
    }
  });
});

app.get('*', function( req, res) {
 res.redirect('/');
});