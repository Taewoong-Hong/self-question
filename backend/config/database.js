const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/survey_board';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB 연결 성공');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB 연결 오류:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB 연결 해제');
    });

    // 프로세스 종료 시 연결 해제
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 앱 종료로 인한 MongoDB 연결 해제');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };