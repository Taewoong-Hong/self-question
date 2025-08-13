export interface Survey {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  authorNickname?: string;
  questions: Question[];
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  responseCount: number;
  isAnonymous: boolean;
}

export interface Question {
  id: string;
  type: 'single' | 'multiple' | 'text' | 'longtext' | 'rating';
  question: string;
  required: boolean;
  options?: string[]; // for single/multiple choice
  maxLength?: number; // for text/longtext
  minRating?: number; // for rating
  maxRating?: number; // for rating
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Answer[];
  respondentIP: string;
  createdAt: string;
}

export interface Answer {
  questionId: string;
  value: string | string[] | number; // string for text, string[] for multiple choice, number for rating
}

export interface SurveyCreateData {
  title: string;
  description?: string;
  tags?: string[];
  authorNickname?: string;
  password: string;
  questions: Omit<Question, 'id'>[];
  isAnonymous?: boolean;
}

export interface SurveyResponseData {
  surveyId: string;
  answers: Answer[];
}

export interface SurveyStats {
  totalResponses: number;
  completionRate: number;
  questionStats: QuestionStats[];
}

export interface QuestionStats {
  questionId: string;
  type: Question['type'];
  responses: number;
  data: {
    [key: string]: number | string[];
  };
}