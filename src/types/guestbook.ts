export interface GuestbookNote {
  id: string;
  content: string;
  color: string;
  position: {
    x: number;
    y: number;
  };
  author_nickname?: string;
  created_at: string;
  z_index?: number;
  is_mine?: boolean; // 현재 사용자가 작성한 노트인지 여부
}

export interface CreateGuestbookRequest {
  content: string;
  color: string;
  position?: {
    x: number;
    y: number;
  };
  author_nickname?: string;
  password?: string;
}

export interface UpdateGuestbookPositionRequest {
  position: {
    x: number;
    y: number;
  };
  z_index?: number;
}

export interface GuestbookListResponse {
  notes: GuestbookNote[];
  total: number;
}

export interface GuestbookColor {
  id: string;
  bg: string;
  name: string;
}

export const GUESTBOOK_COLORS: GuestbookColor[] = [
  { id: 'yellow', bg: '#FFE500', name: '노란색' },
  { id: 'orange', bg: '#FF9500', name: '주황색' },
  { id: 'red', bg: '#FF6B6B', name: '빨간색' },
  { id: 'mint', bg: '#4ECDC4', name: '민트색' },
  { id: 'sky', bg: '#45B7D1', name: '하늘색' },
  { id: 'green', bg: '#96CEB4', name: '연두색' },
  { id: 'gold', bg: '#FECA57', name: '황금색' },
  { id: 'purple', bg: '#DDA5E9', name: '보라색' },
];