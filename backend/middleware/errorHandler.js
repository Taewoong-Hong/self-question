const errorHandler = (err, req, res, next) => {
  // 개발 환경에서는 상세 에러 로그
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Mongoose 유효성 검사 에러
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      error: '입력값 검증 실패',
      errors
    });
  }

  // MongoDB 중복 키 에러
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: `${field}이(가) 이미 존재합니다`
    });
  }

  // JWT 에러
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: '만료된 토큰입니다'
    });
  }

  // 기본 에러 응답
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || '서버 오류가 발생했습니다',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };