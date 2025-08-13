const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  // 로컬 환경에서는 서비스 계정 키 사용
  if (process.env.NODE_ENV === 'development' || !process.env.FUNCTIONS_EMULATOR) {
    const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Firebase Functions 환경에서는 자동 초기화
    admin.initializeApp();
  }
}

const db = admin.firestore();

// Firestore 설정
db.settings({
  ignoreUndefinedProperties: true,
});

module.exports = { admin, db };