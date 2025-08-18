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
import {
  GuestbookNote,
  CreateGuestbookRequest,
  UpdateGuestbookPositionRequest,
  GuestbookListResponse
} from '@/types/guestbook';
import {
  RequestPost,
  CreateRequestDto,
  UpdateRequestDto,
  RequestListResponse
} from '@/types/request';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

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
      id: string;
      public_url: string;
      admin_url: string;
      admin_token: string;
    }>('/debates/create', data);
    return response.data;
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
    const response = await api.get<DebateListResponse>('/debates', { params });
    return response.data;
  },

  // 투표 상세 조회
  get: async (debateId: string) => {
    const response = await api.get<Debate>(`/debates/${debateId}`);
    return response.data;
  },

  // 투표하기
  vote: async (debateId: string, data: VoteDto) => {
    const response = await api.post<{
      message: string;
      results: any;
    }>(`/debates/${debateId}/vote`, data);
    return response.data;
  },

  // 의견 작성
  addOpinion: async (debateId: string, data: OpinionDto) => {
    const response = await api.post<{
      message: string;
    }>(`/debates/${debateId}/opinion`, data);
    return response.data;
  },

  // 관리자 비밀번호 확인
  verifyAdmin: async (debateId: string, password: string) => {
    const response = await api.post<{
      message: string;
      admin_token: string;
    }>(`/debates/${debateId}/verify`, { password });
    return response.data;
  },

  // 투표 수정 (관리자)
  update: async (debateId: string, data: any, adminToken: string) => {
    const response = await api.put(`/debates/${debateId}`, data, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return response.data;
  },

  // 투표 상태 변경 (관리자)
  updateStatus: async (debateId: string, status: 'scheduled' | 'active' | 'ended', adminToken: string) => {
    const response = await api.put(`/debates/${debateId}/status`, { status }, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return response.data;
  },

  // 투표 삭제 (관리자)
  delete: async (debateId: string, adminToken: string) => {
    const response = await api.delete(`/debates/${debateId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return response.data;
  },

  // CSV 다운로드
  exportCSV: async (debateId: string, adminToken: string) => {
    const response = await api.get(`/debates/${debateId}/export`, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
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
      id: string;
      public_url: string;
      admin_url: string;
      admin_token: string;
    }>('/surveys/create', data);
    return response.data;
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
    const response = await api.get<SurveyListResponse>('/surveys', { params });
    return response.data;
  },

  // 설문 상세 조회
  get: async (surveyId: string) => {
    const response = await api.get<Survey>(`/surveys/${surveyId}`);
    return { survey: response.data, can_respond: true, has_responded: false, is_closed: response.data.is_closed || false };
  },

  // 설문 응답
  respond: async (surveyId: string, data: SurveyResponseData) => {
    const response = await api.post<{
      message: string;
      response_code: string;
    }>(`/surveys/${surveyId}/respond`, data);
    return response.data;
  },

  // 설문 결과 조회
  getResults: async (surveyId: string) => {
    const response = await api.get<SurveyStats>(`/surveys/${surveyId}/results`);
    return response.data;
  },

  // CSV 다운로드
  exportCSV: async (surveyId: string, adminToken: string) => {
    const response = await api.get(`/admin/surveys/${surveyId}/export/csv`, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
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
      message: string;
      admin_token: string;
      expires_at?: Date;
    }>(`/surveys/${surveyId}/verify`, { password });
    return response.data;
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
  updateStatus: async (surveyId: string, status: 'open' | 'closed', adminToken: string) => {
    const response = await api.patch(`/surveys/${surveyId}/status`, { status }, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return response.data;
  },

  // 설문 삭제 (관리자)
  delete: async (surveyId: string, adminToken: string) => {
    const response = await api.delete(`/surveys/${surveyId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return response.data;
  },
};

export const guestbookApi = {
  // 방명록 목록 조회
  list: async () => {
    const response = await api.get<GuestbookListResponse>('/guestbook');
    return response.data;
  },

  // 방명록 생성
  create: async (data: CreateGuestbookRequest) => {
    const response = await api.post<GuestbookNote>('/guestbook', data);
    return response.data;
  },

  // 방명록 위치 업데이트
  updatePosition: async (id: string, data: UpdateGuestbookPositionRequest) => {
    const response = await api.patch(`/guestbook/${id}`, data);
    return response.data;
  },

  // 방명록 삭제
  delete: async (id: string, password?: string) => {
    const response = await api.delete(`/guestbook/${id}`, {
      data: { password }
    });
    return response.data;
  },
};

export const requestApi = {
  // 요청 목록 조회
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await api.get<RequestListResponse>('/requests', { params });
    return response.data;
  },

  // 요청 상세 조회
  get: async (id: string) => {
    const response = await api.get<RequestPost>(`/requests/${id}`);
    return response.data;
  },

  // 요청 생성
  create: async (data: CreateRequestDto) => {
    const response = await api.post<RequestPost>('/requests', data);
    return response.data;
  },

  // 요청 수정
  update: async (id: string, data: UpdateRequestDto & { password: string }) => {
    const response = await api.put<RequestPost>(`/requests/${id}`, data);
    return response.data;
  },

  // 요청 삭제
  delete: async (id: string, password: string) => {
    const response = await api.delete(`/requests/${id}`, {
      data: { password }
    });
    return response.data;
  },
};

export default api;