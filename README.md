# Self Question - 투표 & 설문 플랫폼

Firebase Functions와 Firestore를 사용한 회원가입 없는 투표 및 설문 서비스입니다.

## 주요 기능

### 투표 기능
- 📊 익명/실명 투표 생성 및 참여
- 💬 투표에 대한 의견 작성
- 🔒 비밀번호 기반 투표 관리
- ⏰ 시간 기반 투표 상태 관리 (예정/진행중/종료)

### 설문 기능
- 📝 회원가입 없이 설문 생성 및 게시
- 🔐 설문별 비밀번호 기반 관리
- 🚫 IP당 1회 응답 제한
- 📊 실시간 결과 통계 및 CSV 다운로드
- 🏷️ 태그 기반 분류 및 검색

### 공통 기능
- 📱 반응형 디자인
- 🔍 검색 및 필터링
- 📄 메인 게시판에서 통합 관리

## 기술 스택

### Backend
- Firebase Functions
- Express.js
- Firestore
- TypeScript

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Axios

## Firebase 프로젝트 설정

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com)에서 새 프로젝트 생성
2. Firestore Database 활성화 (asia-northeast3 리전 권장)
3. Firebase Functions 활성화

### 2. Firebase CLI 설치
```bash
npm install -g firebase-tools
firebase login
```

### 3. 프로젝트 연결
```bash
# 프로젝트 루트에서
firebase use --add
# 생성한 프로젝트 선택
```

### 4. `.firebaserc` 파일 수정
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 5. 환경 변수 설정
```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set mongodb.uri="your-mongodb-uri" # Firestore 사용시 불필요
```

## 로컬 개발

### Backend (Firebase Functions Emulator)
```bash
cd backend
npm install
firebase emulators:start --only functions
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 배포

### 1. Frontend 빌드
```bash
cd frontend
npm run build
```

### 2. Firebase 배포
```bash
# 프로젝트 루트에서
firebase deploy
```

개별 배포:
```bash
# Functions만 배포
firebase deploy --only functions

# Hosting만 배포
firebase deploy --only hosting
```

## 프로젝트 구조

```
selfquestion/
├── backend/                 # Firebase Functions
│   ├── index.js            # Functions 진입점
│   ├── config/             # 설정 파일
│   ├── models/             # Firestore 모델
│   ├── routes/             # API 라우트
│   ├── middleware/         # Express 미들웨어
│   └── utils/              # 유틸리티 함수
├── frontend/               # Next.js 앱
│   ├── src/
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── lib/           # API 클라이언트
│   │   ├── types/         # TypeScript 타입
│   │   └── styles/        # 글로벌 스타일
│   └── out/               # 정적 빌드 결과
├── firebase.json          # Firebase 설정
└── .firebaserc           # Firebase 프로젝트 설정
```

## API 엔드포인트

### 투표 관련
- `POST /api/debates/create` - 투표 생성
- `GET /api/debates` - 투표 목록 조회
- `GET /api/debates/:id` - 투표 상세 조회
- `POST /api/debates/:id/vote` - 투표하기
- `POST /api/debates/:id/opinion` - 의견 작성
- `PUT /api/debates/:id` - 투표 수정 (관리자)
- `DELETE /api/debates/:id` - 투표 삭제 (관리자)

### 설문 관련
- `POST /api/surveys/create` - 설문 생성
- `GET /api/surveys` - 설문 목록 조회
- `GET /api/surveys/:id` - 설문 상세 조회
- `POST /api/surveys/:id/respond` - 설문 응답
- `GET /api/surveys/:id/results` - 설문 결과 조회
- `GET /api/surveys/:id/export` - CSV 다운로드
- `POST /api/surveys/:id/verify` - 관리자 비밀번호 확인
- `PUT /api/surveys/:id` - 설문 수정 (관리자)
- `PUT /api/surveys/:id/status` - 설문 열기/닫기 (관리자)
- `DELETE /api/surveys/:id` - 설문 삭제 (관리자)

## 주의사항

1. **Firestore 인덱스**: 정렬/필터링을 위해 복합 인덱스가 필요할 수 있습니다. 에러 메시지에서 제공하는 링크를 통해 생성하세요.

2. **CORS 설정**: Firebase Functions에서 CORS가 자동 처리되지만, 필요시 `cors` 옵션을 조정하세요.

3. **Rate Limiting**: DDoS 방지를 위해 rate limiting이 적용되어 있습니다.

4. **보안 규칙**: Firestore 보안 규칙을 프로덕션 환경에 맞게 설정하세요.

## 라이선스

MIT License