const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Firestore 설정
db.settings({
  ignoreUndefinedProperties: true,
});

module.exports = { admin, db };