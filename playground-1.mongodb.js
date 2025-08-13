// MongoDB Playground
// 이 파일은 MongoDB for VS Code 확장팩에서 사용합니다.
// 연결 문자열은 VS Code 좌측 MongoDB 패널에서 설정하세요.

// 데이터베이스 선택
use('selfquestion');

// 기존 컬렉션 확인
db.getCollectionNames();

// 샘플 투표 데이터 생성
db.debates.insertOne({
  title: "개발자에게 가장 중요한 것은?",
  description: "개발자로서 가장 중요하게 생각하는 가치는 무엇인가요?",
  category: "tech",
  author_name: "관리자",
  admin_password: "$2a$10$YourHashedPasswordHere", // bcrypt 해시된 비밀번호
  allow_anonymous_vote: true,
  status: "active",
  vote_count: 0,
  agree_count: 0,
  disagree_count: 0,
  opinion_count: 0,
  votes: [],
  opinions: [],
  created_at: new Date(),
  updated_at: new Date()
});

// 샘플 설문 데이터 생성
db.surveys.insertOne({
  title: "프로그래밍 언어 선호도 조사",
  description: "가장 선호하는 프로그래밍 언어를 선택해주세요",
  tags: ["프로그래밍", "개발", "언어"],
  author_nickname: "관리자",
  admin_password: "$2a$10$YourHashedPasswordHere", // bcrypt 해시된 비밀번호
  questions: [
    {
      id: "q1",
      type: "single_choice",
      question: "가장 선호하는 프로그래밍 언어는?",
      required: true,
      options: ["JavaScript", "Python", "Java", "Go", "Rust", "기타"],
      order: 0
    },
    {
      id: "q2",
      type: "rating",
      question: "프로그래밍 경력은 몇 년인가요?",
      required: true,
      min_rating: 0,
      max_rating: 20,
      order: 1
    },
    {
      id: "q3",
      type: "long_text",
      question: "선택한 언어를 선호하는 이유는?",
      required: false,
      max_length: 500,
      order: 2
    }
  ],
  status: "open",
  response_count: 0,
  created_at: new Date(),
  updated_at: new Date()
});

// 컬렉션 통계 확인
db.debates.countDocuments();
db.surveys.countDocuments();

// 인덱스 생성
db.debates.createIndex({ created_at: -1 });
db.debates.createIndex({ status: 1, created_at: -1 });
db.debates.createIndex({ category: 1, created_at: -1 });

db.surveys.createIndex({ created_at: -1 });
db.surveys.createIndex({ status: 1, created_at: -1 });
db.surveys.createIndex({ tags: 1 });

// 최근 투표 목록 조회
db.debates.find({}).sort({ created_at: -1 }).limit(5);

// 최근 설문 목록 조회
db.surveys.find({}).sort({ created_at: -1 }).limit(5);