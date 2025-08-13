export interface Survey {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  author_nickname?: string;
  questions: Question[];
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  response_count: number;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'rating';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[]; // for single_choice/multiple_choice
  max_length?: number; // for short_text/long_text
  min_rating?: number; // for rating
  max_rating?: number; // for rating
  order: number;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  responses: Record<string, any>;
  respondent_ip: string;
  created_at: string;
  response_code: string;
}

export interface Answer {
  questionId: string;
  value: string | string[] | number; // string for text, string[] for multiple choice, number for rating
}

export interface SurveyCreateData {
  title: string;
  description?: string;
  tags?: string[];
  author_nickname?: string;
  admin_password: string;
  questions: Question[];
}

export interface SurveyResponseData {
  responses: Record<string, any>;
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