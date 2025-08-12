const { db } = require('../config/firebase');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class Debate {
  constructor(data) {
    this.id = data.id || crypto.randomBytes(8).toString('hex');
    this.title = data.title;
    this.description = data.description || '';
    this.category = data.category || 'general';
    this.tags = data.tags || [];
    this.author_nickname = data.author_nickname;
    this.author_ip_hash = data.author_ip_hash;
    this.admin_password_hash = data.admin_password_hash;
    this.vote_options = data.vote_options || [];
    this.settings = {
      allow_multiple_choice: data.settings?.allow_multiple_choice || false,
      show_results_before_end: data.settings?.show_results_before_end !== false,
      allow_anonymous_vote: data.settings?.allow_anonymous_vote !== false,
      allow_opinion: data.settings?.allow_opinion !== false,
      max_votes_per_ip: data.settings?.max_votes_per_ip || 1
    };
    this.start_at = data.start_at;
    this.end_at = data.end_at;
    this.status = data.status || 'scheduled';
    this.is_hidden = data.is_hidden || false;
    this.is_deleted = data.is_deleted || false;
    this.stats = {
      total_votes: data.stats?.total_votes || 0,
      unique_voters: data.stats?.unique_voters || 0,
      opinion_count: data.stats?.opinion_count || 0,
      view_count: data.stats?.view_count || 0,
      last_vote_at: data.stats?.last_vote_at || null
    };
    this.opinions = data.opinions || [];
    this.voter_ips = data.voter_ips || [];
    this.public_url = data.public_url;
    this.admin_url = data.admin_url;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  // 상태 업데이트
  updateStatus() {
    const now = new Date();
    const startDate = new Date(this.start_at);
    const endDate = new Date(this.end_at);

    if (this.is_deleted || this.is_hidden) {
      return this.status;
    }

    if (now < startDate) {
      this.status = 'scheduled';
    } else if (now >= startDate && now <= endDate) {
      this.status = 'active';
    } else {
      this.status = 'ended';
    }

    return this.status;
  }

  // 투표 가능 여부 확인
  canVote(ipHash) {
    this.updateStatus();
    
    if (this.status !== 'active') return false;
    if (this.is_hidden || this.is_deleted) return false;
    
    const voterRecord = this.voter_ips.find(v => v.ip_hash === ipHash);
    if (voterRecord && voterRecord.vote_count >= this.settings.max_votes_per_ip) {
      return false;
    }
    
    return true;
  }

  // 투표하기
  async castVote(optionIds, ipHash, userInfo = {}) {
    if (!this.canVote(ipHash)) {
      throw new Error('투표할 수 없습니다');
    }
    
    // 단일/다중 선택 검증
    if (!this.settings.allow_multiple_choice && optionIds.length > 1) {
      throw new Error('단일 선택만 가능합니다');
    }
    
    // 유효한 옵션인지 확인
    const validOptionIds = this.vote_options.map(opt => opt.id);
    const invalidOptions = optionIds.filter(id => !validOptionIds.includes(id));
    if (invalidOptions.length > 0) {
      throw new Error('유효하지 않은 옵션입니다');
    }
    
    // 투표 추가
    for (const optionId of optionIds) {
      const option = this.vote_options.find(opt => opt.id === optionId);
      if (option) {
        if (!option.votes) option.votes = [];
        option.votes.push({
          user_id: userInfo.user_id,
          user_nickname: userInfo.nickname,
          voter_ip_hash: ipHash,
          is_anonymous: userInfo.is_anonymous || false,
          voted_at: new Date()
        });
        option.vote_count = option.votes.length;
      }
    }
    
    // IP 기록 업데이트
    const voterRecord = this.voter_ips.find(v => v.ip_hash === ipHash);
    if (voterRecord) {
      voterRecord.vote_count += 1;
      voterRecord.last_vote_at = new Date();
    } else {
      this.voter_ips.push({
        ip_hash: ipHash,
        vote_count: 1,
        last_vote_at: new Date()
      });
    }
    
    // 통계 업데이트
    this.stats.total_votes += optionIds.length;
    this.stats.unique_voters = this.voter_ips.length;
    this.stats.last_vote_at = new Date();
    
    // 백분율 계산
    this.updatePercentages();
  }

  // 백분율 업데이트
  updatePercentages() {
    const totalVotes = this.vote_options.reduce((sum, opt) => sum + (opt.vote_count || 0), 0);
    
    this.vote_options.forEach(option => {
      option.percentage = totalVotes > 0 
        ? Math.round((option.vote_count / totalVotes) * 100) 
        : 0;
    });
  }

  // 의견 추가
  addOpinion(opinionData, ipHash) {
    if (!this.settings.allow_opinion) {
      throw new Error('이 토론에서는 의견을 작성할 수 없습니다');
    }
    
    this.updateStatus();
    if (this.status === 'scheduled') {
      throw new Error('토론이 아직 시작되지 않았습니다');
    }
    
    const opinion = {
      id: crypto.randomBytes(8).toString('hex'),
      author_nickname: opinionData.author_nickname,
      author_ip_hash: ipHash,
      selected_option_id: opinionData.selected_option_id,
      content: opinionData.content,
      is_anonymous: opinionData.is_anonymous || false,
      is_deleted: false,
      created_at: new Date()
    };
    
    this.opinions.push(opinion);
    this.stats.opinion_count = this.opinions.filter(op => !op.is_deleted).length;
  }

  // 결과 조회
  getResults(forceShow = false) {
    this.updateStatus();
    
    if (!forceShow && !this.settings.show_results_before_end && this.status !== 'ended') {
      return null;
    }
    
    return {
      options: this.vote_options.map(opt => ({
        id: opt.id,
        label: opt.label,
        vote_count: opt.vote_count || 0,
        percentage: opt.percentage || 0
      })),
      total_votes: this.stats.total_votes,
      unique_voters: this.stats.unique_voters
    };
  }

  // 비밀번호 검증
  async validatePassword(password) {
    return await bcrypt.compare(password, this.admin_password_hash);
  }

  // Firestore 문서로 변환
  toFirestore() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      category: this.category,
      tags: this.tags,
      author_nickname: this.author_nickname,
      author_ip_hash: this.author_ip_hash,
      admin_password_hash: this.admin_password_hash,
      vote_options: this.vote_options,
      settings: this.settings,
      start_at: this.start_at,
      end_at: this.end_at,
      status: this.status,
      is_hidden: this.is_hidden,
      is_deleted: this.is_deleted,
      stats: this.stats,
      opinions: this.opinions,
      voter_ips: this.voter_ips,
      public_url: this.public_url,
      admin_url: this.admin_url,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // 계산된 속성들
  get is_active() {
    return this.status === 'active';
  }

  get is_ended() {
    return this.status === 'ended';
  }

  get time_remaining() {
    const now = new Date();
    if (this.status === 'scheduled') {
      return new Date(this.start_at) - now;
    } else if (this.status === 'active') {
      return new Date(this.end_at) - now;
    }
    return 0;
  }
}

// Firestore 작업을 위한 정적 메서드들
class DebateModel {
  static collection = db.collection('debates');

  // 생성
  static async create(debateData) {
    // 비밀번호 해싱
    if (debateData.admin_password) {
      debateData.admin_password_hash = await bcrypt.hash(debateData.admin_password, 10);
      delete debateData.admin_password;
    }

    const debate = new Debate(debateData);
    const docRef = this.collection.doc(debate.id);
    await docRef.set(debate.toFirestore());
    return debate;
  }

  // 조회
  static async findById(id) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return new Debate(doc.data());
  }

  // 목록 조회
  static async find(filter = {}, options = {}) {
    let query = this.collection;

    // 필터 적용
    if (filter.is_deleted !== undefined) {
      query = query.where('is_deleted', '==', filter.is_deleted);
    }
    if (filter.is_hidden !== undefined) {
      query = query.where('is_hidden', '==', filter.is_hidden);
    }
    if (filter.category && filter.category !== 'all') {
      query = query.where('category', '==', filter.category);
    }
    if (filter.status && filter.status !== 'all') {
      query = query.where('status', '==', filter.status);
    }

    // 정렬
    if (options.sort) {
      switch (options.sort) {
        case 'popular':
          query = query.orderBy('stats.total_votes', 'desc');
          break;
        case 'views':
          query = query.orderBy('stats.view_count', 'desc');
          break;
        case 'ending_soon':
          query = query.where('status', '==', 'active').orderBy('end_at', 'asc');
          break;
        case 'latest':
        default:
          query = query.orderBy('created_at', 'desc');
      }
    }

    // 페이지네이션
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.skip) {
      query = query.offset(options.skip);
    }

    const snapshot = await query.get();
    const debates = [];
    snapshot.forEach(doc => {
      debates.push(new Debate(doc.data()));
    });

    return debates;
  }

  // 업데이트
  static async update(id, updateData) {
    updateData.updated_at = new Date();
    await this.collection.doc(id).update(updateData);
    return await this.findById(id);
  }

  // 삭제 (소프트 삭제)
  static async softDelete(id) {
    await this.collection.doc(id).update({
      is_deleted: true,
      updated_at: new Date()
    });
  }

  // 총 개수
  static async count(filter = {}) {
    let query = this.collection;

    if (filter.is_deleted !== undefined) {
      query = query.where('is_deleted', '==', filter.is_deleted);
    }
    if (filter.is_hidden !== undefined) {
      query = query.where('is_hidden', '==', filter.is_hidden);
    }
    if (filter.category && filter.category !== 'all') {
      query = query.where('category', '==', filter.category);
    }
    if (filter.status && filter.status !== 'all') {
      query = query.where('status', '==', filter.status);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }
}

module.exports = { Debate, DebateModel };