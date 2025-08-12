require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const surveyRoutes = require('./routes/surveyRoutes');
const responseRoutes = require('./routes/responseRoutes');
const adminRoutes = require('./routes/adminRoutes');
const boardRoutes = require('./routes/boardRoutes');
const debateRoutes = require('./routes/debateRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// 요청 크기 제한 및 압축
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Rate limiting - IP당 요청 제한
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // 최대 5개 요청
  message: '너무 많은 설문 생성 요청입니다. 1분 후 다시 시도해주세요.',
});

app.use('/api/', limiter);
app.use('/api/surveys/create', strictLimiter);
app.use('/api/debates/create', strictLimiter);

// 실제 IP 주소 추출 미들웨어
app.use((req, res, next) => {
  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress;
  next();
});

// API 라우트
app.use('/api/surveys', surveyRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/debates', debateRoutes);

// 상태 확인 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 에러 핸들러
app.use(errorHandler);

// 데이터베이스 연결 및 서버 시작
let server;
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ 데이터베이스 연결 성공');
    
    server = app.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
      console.log(`📊 API 문서: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호 수신, 서버 종료 중...');
  if (server) {
    server.close(() => {
      console.log('서버가 안전하게 종료되었습니다');
      process.exit(0);
    });
  }
});

startServer();