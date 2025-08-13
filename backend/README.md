# Self Question Backend

Express.js backend API for Self Question - 투표 & 설문 플랫폼

## 기술 스택

- Node.js (v18+)
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing

## 로컬 개발 설정

1. 환경 변수 설정:
```bash
cp .env.example .env
```

2. `.env` 파일 수정:
```env
# MongoDB Atlas 연결 문자열
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/selfquestion?retryWrites=true&w=majority

# 서버 포트
PORT=5000

# JWT 시크릿 (랜덤한 값으로 변경)
JWT_SECRET=your-secure-random-secret

# Frontend URL (CORS 설정)
FRONTEND_URL=http://localhost:3001
```

3. 의존성 설치:
```bash
npm install
```

4. 개발 서버 실행:
```bash
npm run dev
```

## Render.com 배포 가이드

1. GitHub에 코드 푸시
2. [Render.com](https://render.com) 로그인
3. "New +" → "Web Service" 선택
4. GitHub 저장소 연결
5. 다음 설정 적용:
   - **Name**: selfquestion-backend
   - **Region**: Singapore (한국과 가까움)
   - **Branch**: main
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

6. 환경 변수 설정:
   - `MONGODB_URI`: MongoDB Atlas 연결 문자열
   - `JWT_SECRET`: (자동 생성 사용)
   - `FRONTEND_URL`: Vercel 프론트엔드 URL

7. "Create Web Service" 클릭

## API 엔드포인트

### 투표 (Debates)
- `POST /api/debates/create` - 투표 생성
- `GET /api/debates` - 투표 목록
- `GET /api/debates/:id` - 투표 상세
- `POST /api/debates/:id/vote` - 투표하기
- `POST /api/debates/:id/opinion` - 의견 작성

### 설문 (Surveys)
- `POST /api/surveys/create` - 설문 생성
- `GET /api/surveys` - 설문 목록
- `GET /api/surveys/:id` - 설문 상세
- `POST /api/surveys/:id/respond` - 설문 응답
- `GET /api/surveys/:id/results` - 설문 결과

### 관리자
- `POST /api/surveys/:id/verify` - 관리자 인증
- `PUT /api/surveys/:id/status` - 설문 상태 변경
- `GET /api/surveys/:id/export` - CSV 다운로드

## 보안 기능

- Helmet.js로 보안 헤더 설정
- Rate limiting으로 요청 제한
- CORS 설정
- bcrypt로 비밀번호 해싱
- JWT 토큰 인증
- IP 기반 중복 응답 방지