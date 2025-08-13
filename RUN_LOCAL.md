# 로컬 개발 환경 실행 가이드

## 필수 사항
- Node.js 18 이상
- MongoDB (로컬 또는 MongoDB Atlas)

## 빠른 시작

### 1. 백엔드 설정 및 실행

```bash
# backend 디렉토리로 이동
cd backend

# 환경 변수 설정
cp .env.example .env

# .env 파일 편집 (MongoDB 연결 문자열 입력)
# MONGODB_URI=mongodb://localhost:27017/selfquestion (로컬 MongoDB)
# 또는
# MONGODB_URI=mongodb+srv://... (MongoDB Atlas)

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

백엔드가 http://localhost:5000 에서 실행됩니다.

### 2. 프론트엔드 설정 및 실행

새 터미널을 열고:

```bash
# frontend 디렉토리로 이동
cd frontend

# 환경 변수 설정
cp .env.example .env.local

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드가 http://localhost:3001 에서 실행됩니다.

## MongoDB 설정

### 옵션 1: 로컬 MongoDB
```bash
# MongoDB 설치 후
mongod --dbpath ./data/db
```

### 옵션 2: MongoDB Atlas (추천)
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 무료 클러스터 생성
2. Network Access에서 현재 IP 추가
3. 연결 문자열을 backend/.env의 MONGODB_URI에 입력

## 테스트 데이터

VS Code MongoDB 확장팩을 설치했다면, `playground-1.mongodb.js` 파일을 실행하여 샘플 데이터를 생성할 수 있습니다.

## 주요 기능 테스트

1. **투표 생성**: http://localhost:3001/debates/create
2. **설문 생성**: http://localhost:3001/surveys/create
3. **메인 페이지**: http://localhost:3001

## 문제 해결

- **포트 충돌**: .env 파일에서 PORT 변경
- **MongoDB 연결 오류**: 연결 문자열 및 네트워크 접근 권한 확인
- **CORS 오류**: backend/.env의 FRONTEND_URL 확인