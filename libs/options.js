
var admin = require("firebase-admin");

accountKey = "../data/desafiofaker-firebase-adminsdk-xwwle-73ff7006b4.json"
var serviceAccount = require(accountKey);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const options = {
    client: 'mysql',
    connection: {
        host: '127.0.0.1',
        user: 'asdf',
        password: '456',
        database: 'coderhouse'
    }
}

module.exports = { options }