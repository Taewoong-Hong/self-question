const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { errorHandler } = require('./middleware/errorHandler');
// Firestore 라우트 사용
const debateRoutes = require('./routes/debateRoutesFirestore');

const app = express();

// Firestore는 자동으로 초기화됨 (firebase.js에서 처리)

// 보안 미들웨어
app.use(helmet());
app.use(cors({
  origin: true,
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

// API 라우트 - 일단 debates만 사용
app.use('/api/debates', debateRoutes);

// 상태 확인 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    region: functions.config().runtime?.region || 'unknown'
  });
});

// 에러 핸들러
app.use(errorHandler);

// Firebase Functions로 export
exports.api = functions
  .region('asia-northeast3') // 서울 리전
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onRequest(app);