import { format, formatDistance, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { ko } from 'date-fns/locale';

// 날짜 포맷팅
export const formatDate = (date: string | Date) => {
  return format(new Date(date), 'yyyy년 M월 d일 HH:mm', { locale: ko });
};

// 상대 시간 표시
export const formatRelativeTime = (date: string | Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
};

// 남은 시간 표시
export const formatTimeRemaining = (milliseconds: number) => {
  if (milliseconds <= 0) return '종료됨';
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
};

// 카테고리 한글 변환
export const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    general: '일반',
    tech: '기술',
    lifestyle: '라이프스타일',
    politics: '정치',
    entertainment: '엔터테인먼트',
    sports: '스포츠',
    other: '기타'
  };
  return labels[category] || category;
};

// 상태 뱃지 스타일
export const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'ended':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// 상태 텍스트
export const getStatusText = (status: string) => {
  switch (status) {
    case 'scheduled':
      return '예정';
    case 'active':
      return '진행중';
    case 'ended':
      return '종료';
    default:
      return status;
  }
};

// 숫자 포맷팅
export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

// 백분율 색상
export const getPercentageColor = (percentage: number) => {
  if (percentage >= 50) return 'text-green-600';
  if (percentage >= 30) return 'text-blue-600';
  if (percentage >= 10) return 'text-orange-600';
  return 'text-gray-600';
};

// 클래스 네임 합치기
export const cn = (...classes: (string | undefined | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};