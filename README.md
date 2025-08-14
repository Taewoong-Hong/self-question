# Self Question - 투표 & 설문 플랫폼

Next.js와 MongoDB를 사용한 회원가입 없는 투표 및 설문 서비스입니다.

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

- **Frontend & Backend**: Next.js 14 (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcrypt
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Charts**: Recharts

## 설치 및 실행

### 사전 요구사항
- Node.js 18+
- MongoDB 연결 (로컬 또는 MongoDB Atlas)

### 설치

```bash
# 프로젝트 클론
git clone https://github.com/yourusername/selfquestion.git
cd selfquestion/frontend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 MongoDB URI와 시크릿 키 설정
```

### 환경변수 설정

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
# MongoDB 연결
MONGODB_URI=mongodb://localhost:27017/selfquestion

# 보안
JWT_SECRET=your-super-secret-jwt-key
IP_SALT=your-ip-salt-for-hashing

# 애플리케이션
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

### 개발 서버 실행

```bash
npm run dev
# http://localhost:3001 에서 접속
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 가입 및 GitHub 연동
2. 프로젝트 import
3. 환경변수 설정
4. 배포

### 기타 플랫폼

- Netlify
- Railway
- Heroku
- AWS Amplify

## 프로젝트 구조

```
selfquestion/
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   │   ├── api/       # API Routes
│   │   │   ├── debates/   # 투표 페이지
│   │   │   └── surveys/   # 설문 페이지
│   │   ├── components/    # React 컴포넌트
│   │   ├── lib/          # 유틸리티 함수
│   │   ├── models/       # Mongoose 모델
│   │   └── types/        # TypeScript 타입
│   └── public/           # 정적 파일
└── README.md
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

## 보안 고려사항

- 비밀번호는 bcrypt로 해싱
- IP는 SHA-256으로 해싱하여 저장
- JWT 토큰으로 관리자 인증
- Rate limiting으로 DDoS 방지
- 입력값 검증 및 XSS 방지

## 개발 팁

1. **MongoDB 연결**: MongoDB Compass를 사용하여 데이터베이스를 시각적으로 관리할 수 있습니다.
2. **API 테스트**: Postman이나 Thunder Client를 사용하여 API 엔드포인트를 테스트하세요.
3. **타입 안정성**: TypeScript를 활용하여 컴파일 타임에 오류를 발견할 수 있습니다.

## 라이선스

MIT License