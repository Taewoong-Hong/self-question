import axios from 'axios';
import { 
  Debate, 
  CreateDebateDto, 
  VoteDto, 
  OpinionDto, 
  DebateListResponse 
} from '@/types/debate';
import {
  Survey,
  SurveyCreateData,
  SurveyResponseData,
  SurveyStats,
  SurveyListResponse
} from '@/types/survey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

  // 관리자 비밀번호 확인
  verifyAdmin: async (debateId: string, password: string) => {
    const response = await api.post<{
      success: boolean;
      data: {
        token: string;
      };
    }>(`/debates/${debateId}/verify`, { admin_password: password });
    return response.data.data;
  },

  // 투표 수정 (관리자)
  update: async (debateId: string, data: any) => {
    const response = await api.put(`/debates/${debateId}`, data);
    return response.data;
  },

  // 투표 상태 변경 (관리자)
  updateStatus: async (debateId: string, status: 'open' | 'closed') => {
    const response = await api.put(`/debates/${debateId}/status`, { status });
    return response.data;
  },

  // 투표 삭제 (관리자)
  delete: async (debateId: string) => {
    const response = await api.delete(`/debates/${debateId}`);
    return response.data;
  },

  // CSV 다운로드
  exportCSV: async (debateId: string) => {
    const response = await api.get(`/debates/${debateId}/export`, {
      responseType: 'blob',
    });
    
    // 브라우저에서 다운로드 처리
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `debate_${debateId}_results.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // 투표 통계 (관리자)
  getStats: async (debateId: string) => {
    const response = await api.get(`/debates/${debateId}/stats`);
    return response.data.data;
  }
};

export const surveyApi = {
  // 설문 생성
  create: async (data: SurveyCreateData) => {
    const response = await api.post<{
      success: boolean;
      data: {
        id: string;
        public_url: string;
        admin_url: string;
      };
    }>('/surveys/create', data);
    return response.data.data;
  },

  // 설문 목록 조회
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    tag?: string;
    sort?: string;
    search?: string;
  }) => {
    const response = await api.get<{
      success: boolean;
      data: SurveyListResponse;
    }>('/surveys', { params });
    return response.data.data;
  },

  // 설문 상세 조회
  get: async (surveyId: string) => {
    const response = await api.get<{
      success: boolean;
      data: Survey;
    }>(`/surveys/${surveyId}`);
    return response.data.data;
  },

  // 설문 응답
  respond: async (surveyId: string, data: SurveyResponseData) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: {
        response_code: string;
      };
    }>(`/surveys/${surveyId}/respond`, data);
    return response.data;
  },

  // 설문 결과 조회
  getResults: async (surveyId: string) => {
    const response = await api.get<{
      success: boolean;
      data: SurveyStats;
    }>(`/surveys/${surveyId}/results`);
    return response.data.data;
  },

  // CSV 다운로드
  exportCSV: async (surveyId: string) => {
    const response = await api.get(`/surveys/${surveyId}/export`, {
      responseType: 'blob',
    });
    
    // 브라우저에서 다운로드 처리
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `survey_${surveyId}_results.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // 관리자 비밀번호 확인
  verifyAdmin: async (surveyId: string, password: string) => {
    const response = await api.post<{
      success: boolean;
      data: {
        token: string;
      };
    }>(`/surveys/${surveyId}/verify`, { admin_password: password });
    return response.data.data;
  },

  // 설문 수정 (관리자)
  update: async (surveyId: string, data: any, adminToken: string) => {
    const response = await api.put(`/surveys/${surveyId}`, data, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return response.data;
  },

  // 설문 상태 변경 (관리자)
  updateStatus: async (surveyId: string, status: 'open' | 'closed') => {
    const response = await api.put(`/surveys/${surveyId}/status`, { status });
    return response.data;
  },

  // 설문 삭제 (관리자)
  delete: async (surveyId: string) => {
    const response = await api.delete(`/surveys/${surveyId}`);
    return response.data;
  },
};

export default api;