// Set up database
var db = {};
var pg = require('pg');

//// Local Settings
// db.config = {
//   database: "books2",
//   port: 5432,
//   host: "localhost",
//   user: "postgres"
// };

// db.connect = function(runAfterConnecting) {
//   pg.connect(db.config, function(err, client, done){
//     if (err) {
//       console.error("OOOPS!!! SOMETHING WENT WRONG!", err);
//     }
//     runAfterConnecting(client);
//     done();
//   });
// };

db.config = {}

db.connect = function(runAfterConnecting) {
  console.log(process.env.DATABASE_URL);

  pg.connect(process.env.DATABASE_URL, function(err, client, done){
    if (err) {
      console.error("OOOPS!!! SOMETHING WENT WRONG!", err);
    }
    runAfterConnecting(client);
    done();
  });
};


db.query = function(statement, params, callback){
  db.connect(function(client){
    client.query(statement, params, callback);
  });
};

module.exports = db;