export interface Survey {
  id: string;
  _id?: string;  // MongoDB ID
  title: string;
  description?: string;
  tags?: string[];
  author_nickname?: string;
  questions: Question[];
  status: 'draft' | 'open' | 'closed';
  created_at: string;
  updated_at: string;
  stats: {
    response_count: number;
    completion_rate: number;
    avg_completion_time: number;
    last_response_at?: string;
    view_count: number;
  };
  welcome_screen?: {
    title?: string;
    description?: string;
    button_text?: string;
    show_button?: boolean;
  };
  thankyou_screen?: {
    title?: string;
    description?: string;
    show_response_count?: boolean;
  };
  settings?: {
    show_progress_bar?: boolean;
    show_question_number?: boolean;
    allow_back_navigation?: boolean;
    autosave_progress?: boolean;
    response_limit?: number;
    close_at?: string;
    language?: string;
  };
  is_closed?: boolean;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'rating';

export interface Question {
  id: string;
  title: string;  // 백엔드와 일치하도록 수정
  type: QuestionType;
  required: boolean;
  skip_logic?: {  // 조건부 로직
    condition: {
      question_id: string;  // 조건이 되는 질문 ID
      operator: 'equals' | 'not_equals' | 'contains';
      value: string | string[];  // 조건 값
    };
    action: 'skip' | 'show';  // skip: 건너뛰기, show: 보여주기
  };
  properties?: {
    choices?: {
      id: string;
      label: string;
      is_other?: boolean;  // '기타' 옵션 여부
      attachment?: {
        type: 'image';
        href: string;
      };
    }[];
    max_length?: number;
    min_length?: number;
    max_selection?: number;
    min_selection?: number;
    rating_scale?: 5 | 10;
    labels?: {
      left?: string;
      center?: string;
      right?: string;
    };
  };
  validations?: {
    max_characters?: number;
    min_characters?: number;
  };
  order: number;
}

export interface SurveyResponse {
  id: string;
  response_code: string;
  survey_id: string;
  answers: Answer[];
  started_at: string;
  submitted_at: string;
  completion_time: number;
  is_complete: boolean;
  created_at: string;
}

export interface Answer {
  question_id: string;
  question_type: QuestionType;
  // 답변 값 (타입에 따라 다름)
  choice_id?: string; // single_choice
  choice_ids?: string[]; // multiple_choice
  text?: string; // short_text, long_text
  other_text?: string; // '기타' 선택 시 추가 텍스트
  rating?: number; // rating
  answered_at?: string;
  time_spent?: number;
}

export interface SurveyCreateData {
  title: string;
  description?: string;
  tags?: string[];
  author_nickname?: string;
  admin_password: string;
  questions: Question[];
  welcome_screen?: {
    title?: string;
    description?: string;
    button_text?: string;
    show_button?: boolean;
  };
  thankyou_screen?: {
    title?: string;
    description?: string;
    show_response_count?: boolean;
  };
  settings?: {
    show_progress_bar?: boolean;
    show_question_number?: boolean;
    allow_back_navigation?: boolean;
    autosave_progress?: boolean;
    response_limit?: number;
    close_at?: string;
    language?: string;
  };
}

export interface SurveyResponseData {
  answers: {
    question_id: string;
    answer: any; // 타입에 따라 다른 값
  }[];
}

export interface SurveyListResponse {
  surveys: Survey[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SurveyStats {
  total_responses: number;
  completion_rate: number;
  question_stats: Record<string, {
    type: QuestionType;
    response_count: number;
    options?: Record<string, number>;
    average?: number;
  }>;
}