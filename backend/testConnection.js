const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('연결 시도 중...');
    console.log('MongoDB URI:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // 비밀번호 숨김
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB 연결 성공!');
    console.log('데이터베이스:', mongoose.connection.name);
    
    // 연결 종료
    await mongoose.connection.close();
    console.log('연결 종료됨');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    console.error('상세 오류:', error);
  }
  process.exit();
};

testConnection();