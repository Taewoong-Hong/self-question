# Self Question Frontend

Next.js 14 기반의 Self Question 프론트엔드 - 투표 & 설문 플랫폼

## 기술 스택

- Next.js 14
- TypeScript
- Tailwind CSS
- React Hot Toast

## 로컬 개발 설정

1. 환경 변수 설정:
```bash
cp .env.example .env.local
```

2. `.env.local` 파일 수정:
```env
# 로컬 백엔드 API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. 의존성 설치:
```bash
npm install
```

4. 개발 서버 실행:
```bash
npm run dev
```

서버가 http://localhost:3001 에서 실행됩니다.

## Vercel 배포 가이드

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com) 로그인
3. "New Project" 클릭
4. GitHub 저장소 연결
5. 다음 설정 적용:
   - **Framework Preset**: Next.js
   - **Root Directory**: frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

6. 환경 변수 설정:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: Render.com 백엔드 URL (예: `https://selfquestion-backend.onrender.com/api`)

7. "Deploy" 클릭

## 주요 기능

### 투표 (Debates)
- 투표 목록 보기
- 투표 생성
- 찬성/반대 투표
- 의견 작성
- 관리자 페이지

### 설문 (Surveys)
- 설문 목록 보기
- 설문 생성
- 단계별 설문 응답
- 결과 조회
- 관리자 대시보드

## 프로젝트 구조

```
frontend/
├── src/
│   ├── components/     # 재사용 가능한 컴포넌트
│   ├── lib/           # API 클라이언트 및 유틸리티
│   ├── pages/         # Next.js 페이지
│   │   ├── debates/   # 투표 관련 페이지
│   │   └── surveys/   # 설문 관련 페이지
│   ├── styles/        # 글로벌 스타일
│   └── types/         # TypeScript 타입 정의
├── public/            # 정적 파일
└── package.json       # 프로젝트 의존성
```

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행
- `npm run type-check` - TypeScript 타입 체크