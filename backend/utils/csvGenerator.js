const generateCSV = (survey, responses) => {
  if (!survey || !responses || responses.length === 0) {
    return '';
  }

  // CSV 헤더 생성
  const headers = ['응답 코드', '응답 시간', '완료 시간(초)', '디바이스', '브라우저'];
  
  // 질문 헤더 추가
  survey.questions.forEach(question => {
    headers.push(question.title || question.question);
  });

  // CSV 행 생성
  const rows = responses.map(response => {
    const row = [
      response.response_code,
      new Date(response.submitted_at).toLocaleString('ko-KR'),
      response.completion_time,
      response.device_type || 'unknown',
      response.browser || 'unknown'
    ];

    // 각 질문에 대한 답변 추가
    survey.questions.forEach(question => {
      const answer = response.answers.find(a => a.question_id === question.id);
      
      if (!answer) {
        row.push('');
      } else {
        switch (question.type) {
          case 'single_choice':
            const choice = question.properties?.choices?.find(c => c.id === answer.choice_id);
            row.push(choice?.label || answer.choice_id || '');
            break;
          
          case 'multiple_choice':
            if (answer.choice_ids && answer.choice_ids.length > 0) {
              const selectedChoices = answer.choice_ids.map(id => {
                const choice = question.properties?.choices?.find(c => c.id === id);
                return choice?.label || id;
              });
              row.push(selectedChoices.join(', '));
            } else {
              row.push('');
            }
            break;
          
          case 'short_text':
          case 'long_text':
            row.push(answer.text || '');
            break;
          
          case 'rating':
            row.push(answer.rating || '');
            break;
          
          default:
            row.push('');
        }
      }
    });

    return row;
  });

  // CSV 문자열 생성
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map(row => row.map(escapeCSVField).join(','))
  ].join('\n');

  // BOM 추가 (Excel에서 한글 깨짐 방지)
  return '\uFEFF' + csvContent;
};

// CSV 필드 이스케이프 처리
const escapeCSVField = (field) => {
  if (field === null || field === undefined) {
    return '';
  }
  
  const stringField = String(field);
  
  // 쉼표, 따옴표, 줄바꿈이 포함된 경우 따옴표로 감싸기
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  
  return stringField;
};

module.exports = { generateCSV };