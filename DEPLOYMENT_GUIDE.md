# Self Question 배포 가이드

이 문서는 Self Question 플랫폼을 Render.com(백엔드)과 Vercel(프론트엔드)에 배포하는 방법을 설명합니다.

## 사전 준비

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 계정 생성 및 클러스터 설정
2. [Render.com](https://render.com) 계정 생성
3. [Vercel](https://vercel.com) 계정 생성
4. GitHub 저장소에 코드 푸시

## 1단계: MongoDB Atlas 설정

1. MongoDB Atlas 로그인
2. 새 클러스터 생성 (무료 M0 클러스터 선택 가능)
3. Database Access에서 사용자 생성
4. Network Access에서 IP 허용 (0.0.0.0/0 허용)
5. 연결 문자열 복사:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/selfquestion?retryWrites=true&w=majority
   ```

## 2단계: 백엔드 배포 (Render.com)

1. Render.com 대시보드에서 "New +" → "Web Service" 클릭
2. GitHub 저장소 연결
3. 서비스 설정:
   - **Name**: selfquestion-backend
   - **Region**: Singapore (한국과 가장 가까움)
   - **Branch**: main
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. 환경 변수 추가:
   - `MONGODB_URI`: MongoDB Atlas 연결 문자열
   - `JWT_SECRET`: "Generate" 버튼 클릭하여 자동 생성
   - `NODE_ENV`: production
   - `FRONTEND_URL`: https://selfquestion.vercel.app (Vercel 배포 후 업데이트)

5. "Create Web Service" 클릭
6. 배포 완료 후 URL 복사 (예: https://selfquestion-backend.onrender.com)

## 3단계: 프론트엔드 배포 (Vercel)

1. Vercel 대시보드에서 "New Project" 클릭
2. GitHub 저장소 Import
3. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: frontend
   - **Build Command**: `npm run build` (자동 감지됨)
   - **Output Directory**: `.next` (자동 감지됨)

4. 환경 변수 추가:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://selfquestion-backend.onrender.com/api`

5. "Deploy" 클릭
6. 배포 완료 후 도메인 확인 (예: https://selfquestion.vercel.app)

## 4단계: 백엔드 CORS 업데이트

1. Render.com 대시보드로 이동
2. 환경 변수에서 `FRONTEND_URL` 업데이트:
   - **Value**: Vercel에서 제공한 프론트엔드 URL

## 배포 확인

1. 프론트엔드 URL 접속
2. 투표/설문 생성 테스트
3. 관리자 기능 테스트
4. API 헬스체크: `https://selfquestion-backend.onrender.com/api/health`

## 문제 해결

### MongoDB 연결 오류
- Network Access에서 IP 허용 확인
- 연결 문자열의 username/password 확인
- 데이터베이스 이름이 URL에 포함되어 있는지 확인

### CORS 오류
- 백엔드 환경 변수의 `FRONTEND_URL` 확인
- Vercel 도메인이 정확히 입력되었는지 확인

### 빌드 실패
- Node.js 버전 확인 (18 이상)
- package.json의 의존성 확인
- 환경 변수가 모두 설정되었는지 확인

## 모니터링

- Render.com: Logs 탭에서 실시간 로그 확인
- Vercel: Functions 탭에서 로그 및 성능 모니터링
- MongoDB Atlas: Metrics 탭에서 데이터베이스 성능 확인

## 추가 설정 (선택사항)

### 커스텀 도메인
- Vercel: Settings → Domains에서 커스텀 도메인 추가
- Render.com: Settings → Custom Domains에서 도메인 추가

### 자동 배포
- GitHub main 브랜치 푸시 시 자동 배포 (기본 설정됨)
- 브랜치별 프리뷰 배포 (Vercel 자동 지원)