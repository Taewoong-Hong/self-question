const generateStatistics = async (survey, responses) => {
  const statistics = {
    overview: {
      total_responses: responses.length,
      completion_rate: survey.stats.completion_rate,
      avg_completion_time: survey.stats.avg_completion_time,
      response_rate_per_day: calculateResponseRate(responses),
      quality_score_avg: calculateAverageQualityScore(responses)
    },
    questions: {},
    time_analysis: {
      by_hour: getResponsesByHour(responses),
      by_day: getResponsesByDay(responses),
      peak_times: getPeakTimes(responses)
    },
    device_analysis: {
      device_types: getDeviceTypes(responses),
      browsers: getBrowsers(responses)
    }
  };

  // 각 질문별 통계
  for (const question of survey.questions) {
    const questionResponses = responses.map(r => 
      r.answers.find(a => a.question_id === question.id)
    ).filter(Boolean);

    statistics.questions[question.id] = {
      title: question.title,
      type: question.type,
      response_count: questionResponses.length,
      stats: generateQuestionStats(question, questionResponses)
    };
  }

  return statistics;
};

// 질문 타입별 통계 생성
function generateQuestionStats(question, responses) {
  switch (question.type) {
    case 'single_choice':
    case 'multiple_choice':
      return generateChoiceStats(question, responses);
    case 'rating':
      return generateRatingStats(question, responses);
    case 'short_text':
    case 'long_text':
      return generateTextStats(responses);
    default:
      return {};
  }
}

// 객관식 통계
function generateChoiceStats(question, responses) {
  const choiceCounts = {};
  
  // 초기화
  question.properties.choices.forEach(choice => {
    choiceCounts[choice.id] = { label: choice.label, count: 0, percentage: 0 };
  });

  // 집계
  responses.forEach(response => {
    if (question.type === 'single_choice' && response.choice_id) {
      if (choiceCounts[response.choice_id]) {
        choiceCounts[response.choice_id].count++;
      }
    } else if (question.type === 'multiple_choice' && response.choice_ids) {
      response.choice_ids.forEach(choiceId => {
        if (choiceCounts[choiceId]) {
          choiceCounts[choiceId].count++;
        }
      });
    }
  });

  // 백분율 계산
  const total = responses.length || 1;
  Object.values(choiceCounts).forEach(choice => {
    choice.percentage = Math.round((choice.count / total) * 100);
  });

  return {
    type: 'choice',
    choices: choiceCounts,
    most_selected: getMostSelected(choiceCounts)
  };
}

// 평점 통계
function generateRatingStats(question, responses) {
  const ratings = responses.map(r => r.rating).filter(r => r !== undefined);
  const ratingScale = question.properties.rating_scale || 5;
  
  if (ratings.length === 0) {
    return { type: 'rating', average: 0, distribution: {} };
  }

  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  const average = sum / ratings.length;

  // 분포 계산
  const distribution = {};
  for (let i = 1; i <= ratingScale; i++) {
    distribution[i] = {
      count: ratings.filter(r => r === i).length,
      percentage: 0
    };
  }

  ratings.forEach(rating => {
    if (distribution[rating]) {
      distribution[rating].percentage = Math.round(
        (distribution[rating].count / ratings.length) * 100
      );
    }
  });

  return {
    type: 'rating',
    average: Math.round(average * 10) / 10,
    distribution,
    median: getMedian(ratings),
    mode: getMode(ratings)
  };
}

// 텍스트 통계
function generateTextStats(responses) {
  const texts = responses.map(r => r.text).filter(Boolean);
  
  if (texts.length === 0) {
    return { type: 'text', word_cloud: [], avg_length: 0 };
  }

  const totalLength = texts.reduce((sum, text) => sum + text.length, 0);
  const avgLength = Math.round(totalLength / texts.length);

  // 단어 빈도 분석 (간단한 버전)
  const wordFreq = {};
  texts.forEach(text => {
    const words = text.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 2) { // 2글자 이상만
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
  });

  const wordCloud = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  return {
    type: 'text',
    word_cloud: wordCloud,
    avg_length: avgLength,
    response_count: texts.length
  };
}

// 헬퍼 함수들
function calculateResponseRate(responses) {
  if (responses.length === 0) return 0;
  
  const firstResponse = new Date(responses[responses.length - 1].created_at);
  const lastResponse = new Date(responses[0].created_at);
  const daysDiff = Math.max(1, Math.ceil((lastResponse - firstResponse) / (1000 * 60 * 60 * 24)));
  
  return Math.round(responses.length / daysDiff * 10) / 10;
}

function calculateAverageQualityScore(responses) {
  if (responses.length === 0) return 0;
  const sum = responses.reduce((acc, r) => acc + r.quality_score, 0);
  return Math.round(sum / responses.length);
}

function getResponsesByHour(responses) {
  const hourCounts = Array(24).fill(0);
  responses.forEach(r => {
    const hour = new Date(r.created_at).getHours();
    hourCounts[hour]++;
  });
  return hourCounts;
}

function getResponsesByDay(responses) {
  const dayCounts = {};
  responses.forEach(r => {
    const date = new Date(r.created_at).toISOString().split('T')[0];
    dayCounts[date] = (dayCounts[date] || 0) + 1;
  });
  return dayCounts;
}

function getPeakTimes(responses) {
  const hourCounts = getResponsesByHour(responses);
  const maxCount = Math.max(...hourCounts);
  const peakHours = [];
  
  hourCounts.forEach((count, hour) => {
    if (count === maxCount) {
      peakHours.push(`${hour}:00-${hour + 1}:00`);
    }
  });
  
  return peakHours;
}

function getDeviceTypes(responses) {
  const types = {};
  responses.forEach(r => {
    const type = r.device_type || 'unknown';
    types[type] = (types[type] || 0) + 1;
  });
  return types;
}

function getBrowsers(responses) {
  const browsers = {};
  responses.forEach(r => {
    const browser = r.browser || 'unknown';
    browsers[browser] = (browsers[browser] || 0) + 1;
  });
  return browsers;
}

function getMostSelected(choiceCounts) {
  let maxCount = 0;
  let mostSelected = null;
  
  Object.entries(choiceCounts).forEach(([id, data]) => {
    if (data.count > maxCount) {
      maxCount = data.count;
      mostSelected = { id, ...data };
    }
  });
  
  return mostSelected;
}

function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getMode(arr) {
  const freq = {};
  let maxFreq = 0;
  let mode = null;
  
  arr.forEach(val => {
    freq[val] = (freq[val] || 0) + 1;
    if (freq[val] > maxFreq) {
      maxFreq = freq[val];
      mode = val;
    }
  });
  
  return mode;
}

module.exports = { generateStatistics };