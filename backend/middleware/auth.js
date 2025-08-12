const Survey = require('../models/Survey');

// 관리자 인증 미들웨어
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const surveyId = req.params.surveyId;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: '인증 토큰이 필요합니다' 
      });
    }

    const token = authHeader.substring(7);

    const survey = await Survey.findOne({ 
      id: surveyId,
      is_deleted: false 
    });

    if (!survey) {
      return res.status(404).json({ 
        success: false, 
        error: '설문을 찾을 수 없습니다' 
      });
    }

    // 토큰 검증
    if (!survey.validateAdminToken(token)) {
      return res.status(401).json({ 
        success: false, 
        error: '유효하지 않거나 만료된 토큰입니다' 
      });
    }

    // 토큰 갱신 (활동 시마다 24시간 연장)
    survey.admin_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await survey.save();

    req.survey = survey;
    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('인증 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '인증 처리 중 오류가 발생했습니다' 
    });
  }
};

// 운영자 인증 미들웨어 (내부 관리용)
const authenticateOperator = async (req, res, next) => {
  try {
    const operatorKey = req.headers['x-operator-key'];
    
    if (!operatorKey || operatorKey !== process.env.OPERATOR_KEY) {
      return res.status(401).json({ 
        success: false, 
        error: '운영자 권한이 필요합니다' 
      });
    }

    req.isOperator = true;
    next();
  } catch (error) {
    console.error('운영자 인증 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '인증 처리 중 오류가 발생했습니다' 
    });
  }
};

module.exports = {
  authenticateAdmin,
  authenticateOperator
};