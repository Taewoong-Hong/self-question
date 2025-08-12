export interface VoteOption {
  id: string;
  label: string;
  order: number;
  vote_count?: number;
  percentage?: number;
}

export interface Opinion {
  id: string;
  author_nickname: string;
  selected_option_id?: string;
  content: string;
  created_at: string;
}

export interface DebateSettings {
  allow_multiple_choice: boolean;
  show_results_before_end: boolean;
  allow_anonymous_vote: boolean;
  allow_opinion: boolean;
  max_votes_per_ip?: number;
}

export interface DebateStats {
  total_votes: number;
  unique_voters: number;
  opinion_count: number;
  view_count: number;
}

export interface Debate {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  author_nickname: string;
  vote_options: VoteOption[];
  settings: DebateSettings;
  start_at: string;
  end_at: string;
  status: 'scheduled' | 'active' | 'ended';
  is_active: boolean;
  is_ended: boolean;
  time_remaining: number;
  can_vote?: boolean;
  stats: DebateStats;
  results?: {
    options: VoteOption[];
    total_votes: number;
    unique_voters: number;
  };
  opinions?: Opinion[];
  created_at: string;
  public_url?: string;
}

export interface CreateDebateDto {
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  author_nickname: string;
  admin_password: string;
  vote_options: Array<{ label: string }>;
  settings?: Partial<DebateSettings>;
  start_at: string;
  end_at: string;
}

export interface VoteDto {
  option_ids: string[];
  user_nickname?: string;
  is_anonymous?: boolean;
}

export interface OpinionDto {
  author_nickname: string;
  selected_option_id?: string;
  content: string;
  is_anonymous?: boolean;
}

export interface DebateListResponse {
  debates: Debate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}