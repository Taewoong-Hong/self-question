const DOMPurify = require('isomorphic-dompurify');

// 허용할 HTML 태그와 속성
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 
  'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'code', 'pre', 'blockquote'
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

// HTML 정제 함수
const sanitizeHtml = (dirty) => {
  if (!dirty) return dirty;
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_CONTENTS: ['script', 'style'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SAFE_FOR_TEMPLATES: true,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    IN_PLACE: false
  });
};

// 일반 텍스트 정제 (HTML 태그 제거)
const sanitizeText = (text) => {
  if (!text) return text;
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

module.exports = {
  sanitizeHtml,
  sanitizeText
};