const parseUserAgent = (userAgentString) => {
  if (!userAgentString) {
    return {
      browser: 'unknown',
      device_type: 'unknown'
    };
  }

  // 브라우저 감지
  let browser = 'unknown';
  if (userAgentString.includes('Chrome') && !userAgentString.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgentString.includes('Safari') && !userAgentString.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgentString.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgentString.includes('Edg')) {
    browser = 'Edge';  
  } else if (userAgentString.includes('MSIE') || userAgentString.includes('Trident/')) {
    browser = 'Internet Explorer';
  }

  // 디바이스 타입 감지
  let device_type = 'desktop';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgentString)) {
    if (/iPad/i.test(userAgentString)) {
      device_type = 'tablet';
    } else {
      device_type = 'mobile';
    }
  } else if (/Tablet|iPad|Playbook|Silk/i.test(userAgentString)) {
    device_type = 'tablet';
  }

  return {
    browser,
    device_type
  };
};

module.exports = { parseUserAgent };