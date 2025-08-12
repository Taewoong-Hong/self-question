import axios from 'axios';
import { 
  Debate, 
  CreateDebateDto, 
  VoteDto, 
  OpinionDto, 
  DebateListResponse 
} from '@/types/debate';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
);

export const debateApi = {
  // 투표 생성
  create: async (data: CreateDebateDto) => {
    const response = await api.post<{
      success: boolean;
      data: {
        id: string;
        public_url: string;
        admin_url: string;
        status: string;
      };
    }>('/debates/create', data);
    return response.data.data;
  },

  // 투표 목록 조회
  list: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    sort?: string;
    search?: string;
  }) => {
    const response = await api.get<{
      success: boolean;
      data: DebateListResponse;
    }>('/debates', { params });
    return response.data.data;
  },

  // 투표 상세 조회
  get: async (debateId: string) => {
    const response = await api.get<{
      success: boolean;
      data: Debate;
    }>(`/debates/${debateId}`);
    return response.data.data;
  },

  // 투표하기
  vote: async (debateId: string, data: VoteDto) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: {
        results: any;
        can_vote_again: boolean;
      };
    }>(`/debates/${debateId}/vote`, data);
    return response.data;
  },

  // 의견 작성
  addOpinion: async (debateId: string, data: OpinionDto) => {
    const response = await api.post<{
      success: boolean;
      message: string;
    }>(`/debates/${debateId}/opinion`, data);
    return response.data;
  },

  // 투표 수정 (관리자)
  update: async (debateId: string, data: any) => {
    const response = await api.put(`/debates/${debateId}`, data);
    return response.data;
  },

  // 투표 삭제 (관리자)
  delete: async (debateId: string, adminPassword: string) => {
    const response = await api.delete(`/debates/${debateId}`, {
      data: { admin_password: adminPassword }
    });
    return response.data;
  },

  // 투표 통계 (관리자)
  getStats: async (debateId: string) => {
    const response = await api.get(`/debates/${debateId}/stats`);
    return response.data.data;
  }
};

export default api;