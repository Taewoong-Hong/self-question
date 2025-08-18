export interface RequestPost {
  id: string;
  title: string;
  content: string;
  author_nickname: string;
  is_public: boolean;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRequestDto {
  title: string;
  content: string;
  author_nickname: string;
  password: string;
  is_public: boolean;
}

export interface UpdateRequestDto {
  title?: string;
  content?: string;
  is_public?: boolean;
}

export interface RequestListResponse {
  requests: RequestPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}