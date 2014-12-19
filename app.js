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
  db.query("SELECT * FROM users WHERE id = $1", [id], function (err, dbRes) {
    done(err, dbRes.rows[0]);
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
app.listen(process.env.PORT || 3000);
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
    var user = req.user;
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

app.post('/books', function(req, res) {
  db.query('SELECT * FROM book_lists WHERE title = $1', [req.body.title], function(err, dbRes1) {
    if (dbRes1.rows.length === 0) {
      db.query('INSERT INTO book_lists (title, user_id, url, thumb) VALUES ($1, $2, $3, $4)', [req.body.title, req.user.id, req.body.link, req.body.thumbnail], function(err, dbRes2) {
        db.query('SELECT id FROM book_lists WHERE title = $1', [req.body.title], function(err, dbRes3) {
          db.query('INSERT INTO users_books (user_id, book_id) VALUES ($1, $2)', [req.user.id, dbRes3.rows[0].id], function(err, dbRes4) {
              res.redirect('/books/list');
          });
        });
      });
    } else if(dbRes1.rows[0].user_id === req.user.id) {
      res.redirect('/books');
    } else {
        db.query('SELECT id FROM book_lists WHERE title = $1', [req.body.title], function(err, dbRes5) {
          db.query('INSERT INTO users_books (user_id, book_id) VALUES ($1, $2)', [req.user.id, dbRes5.rows[0].id], function(err, dbRes6) {
           res.redirect('/books/list');
          });
        });
      }
  });
});

app.get('/books/list', function(req, res) {
  if(req.user) {
    db.query('SELECT * FROM book_lists', function(err, dbRes) {
      if (!err) {
        res.render('books/index', { books: dbRes.rows, layout: false });
      }
    });
  } else { res.redirect('/'); };
});

app.get('/books/:id', function(req, res) {
  console.log('Book ID found, going to show page!');
  db.query('SELECT * FROM book_lists WHERE id = $1', [req.params.id], function(err, dbRes) {
    if (!err) {
      res.render('books/show', { book: dbRes.rows[0], layout: false });
    }
  });
});

/* Reviews Routes*/
app.post('/reviews/', function(req, res) {
  console.log('////////////////////');
  console.log('Body: ' + req.body.body);
  console.log('Book ID: ' + req.body.book_id);
  console.log('Username: ' + req.user.username);
  console.log('Book name: ' + req.body.book_name);
  var user = req.user;
  db.query('INSERT INTO reviews (body, book_id, username, book_name) VALUES ($1, $2, $3, $4)', [req.body.body, req.body.book_id, user.username, req.body.book_name], function(err, dbRes) {
      if (!err) {
        res.redirect('/reviews/' + req.body.book_name);
      }
  });
});

app.get('/reviews/:book_name', function(req, res) {
  console.log('*********');
  console.log('Book ID: ' + req.params.book_name);
  db.query('SELECT * FROM reviews WHERE book_name = $1', [req.params.book_name], function(err, dbRes) {
    if (!err) {
      res.render('reviews/show', { reviews: dbRes.rows, params: req.body.book_id, layout: false });
    }
  });
});

/* 404 Route */
app.get('*', function( req, res) {
 res.redirect('/');
});