const mongoose = require('mongoose');

// 커넥션 캐싱을 위한 전역 변수
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // 이미 연결되어 있다면 재사용
  if (cached.conn) {
    console.log('✅ MongoDB 연결 재사용');
    return cached.conn;
  }

  // 연결 중이라면 기다림
  if (cached.promise) {
    console.log('⏳ MongoDB 연결 대기 중...');
    cached.conn = await cached.promise;
    return cached.conn;
  }

  try {
    // 환경별 설정
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI가 설정되지 않았습니다.');
    }

    // 개발/운영 환경 확인
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`🔧 환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 연결 대상: ${mongoUri.includes('localhost') ? '로컬 MongoDB' : 'MongoDB Atlas'}`);
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: isDevelopment ? 5 : 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Atlas 연결인 경우 자동으로 DB 이름이 포함되어 있음
    // 로컬 연결인 경우 URI에 DB 이름이 포함되어 있음
    cached.promise = mongoose.connect(mongoUri, options);
    
    cached.conn = await cached.promise;

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB 연결 성공');
      console.log(`📍 데이터베이스: ${mongoose.connection.db.databaseName}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB 연결 오류:', err);
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB 연결 해제');
      cached.conn = null;
      cached.promise = null;
    });

    // 프로세스 종료 시 연결 해제
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 앱 종료로 인한 MongoDB 연결 해제');
      process.exit(0);
    });

    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    cached.promise = null;
    throw error;
  }
};

module.exports = { connectDB };