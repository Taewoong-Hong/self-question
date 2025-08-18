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

export const GUESTBOOK_COLORS = [
  '#FFE500', // 노란색
  '#FF9500', // 주황색
  '#FF6B6B', // 빨간색
  '#4ECDC4', // 민트색
  '#45B7D1', // 하늘색
  '#96CEB4', // 연두색
  '#FECA57', // 황금색
  '#DDA5E9', // 보라색
];