const checkResponseQuality = (answers, completionTime) => {
  const quality_flags = [];
  let quality_score = 100;

  // 너무 빠른 응답 체크 (질문당 평균 2초 미만)
  const answerCount = answers.length;
  if (completionTime < answerCount * 2) {
    quality_score -= 30;
    quality_flags.push('too_fast');
  }

  // 모든 객관식 답변이 동일한 경우
  const choiceAnswers = answers.filter(a => 
    a.question_type === 'single_choice' || a.question_type === 'multiple_choice'
  );
  
  if (choiceAnswers.length > 3) {
    const firstChoice = choiceAnswers[0]?.choice_id || choiceAnswers[0]?.choice_ids?.[0];
    const allSame = choiceAnswers.every(a => 
      a.choice_id === firstChoice || a.choice_ids?.[0] === firstChoice
    );
    
    if (allSame) {
      quality_score -= 20;
      quality_flags.push('all_same_answers');
    }
  }

  // 텍스트 답변이 모두 너무 짧은 경우
  const textAnswers = answers.filter(a => 
    a.question_type === 'short_text' || a.question_type === 'long_text'
  );
  
  if (textAnswers.length > 0) {
    const allShort = textAnswers.every(a => 
      !a.text || a.text.trim().length < 5
    );
    
    if (allShort) {
      quality_score -= 15;
      quality_flags.push('minimal_text_responses');
    }
  }

  return {
    quality_score: Math.max(0, quality_score),
    quality_flags
  };
};

module.exports = { checkResponseQuality };