// Inicialização da Firebase com o Admin SDK (igual às fichas 6-8).
const admin = require("firebase-admin");
const config = require("./config");

const serviceAccount = require(config.serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.databaseURL
});

const db = admin.database();

module.exports = {
  db,
  ref: (path) => db.ref(path),
  now: () => new Date().toISOString()
};
