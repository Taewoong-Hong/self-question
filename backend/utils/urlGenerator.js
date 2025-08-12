const generateSurveyUrls = (surveyId) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  return {
    publicUrl: `${baseUrl}/s/${surveyId}`,
    adminUrl: `${baseUrl}/admin/${surveyId}`
  };
};

const generateResponseUrl = (surveyId, responseCode) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  return `${baseUrl}/r/${responseCode}`;
};

module.exports = {
  generateSurveyUrls,
  generateResponseUrl
};