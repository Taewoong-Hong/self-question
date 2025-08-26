# PRD: 회원가입 없는 비밀번호 기반 투표 & 설문 플랫폼

## 1) 제품 요약

* **한 줄 요약**: 누구나 투표와 설문을 만들어 메인 게시판에 공개할 수 있고, 작성자는 비밀번호로 관리하며, 참여자는 IP당 1회만 참여 가능한 통합 플랫폼.
* **주요 사용자**

  * **작성자**: 투표/설문 생성 및 비밀번호로 관리.
  * **참여자**: 투표 참여 및 설문 응답(1 IP당 1회 제한).
  * **운영자(내부)**: 신고/악성 콘텐츠 관리.
* **목표 (MVP)**

  1. 계정 없이 투표/설문 생성 및 게시.
  2. 메인 게시판에서 투표/설문 통합 목록 제공(검색/정렬/필터).
  3. IP당 1회 참여 제한.
  4. 투표/설문별 비밀번호 기반 관리 페이지.
  5. 실시간 결과 표시, CSV 다운로드 및 기본 통계 제공.

## 2) 범위

* **포함**: 
  * 투표: 익명/실명 투표 생성, 찬반 투표, 의견 작성, 실시간 결과
  * 설문: 다양한 질문 유형, 설문 생성, 응답 수집, 통계 제공
  * 공통: 메인 게시판, IP 중복 방지, 비밀번호 기반 관리자 페이지, CSV 내보내기, 신고 기능, 열기/닫기 제어
* **제외 (MVP)**: 고급 로직/분기, 결제, 소셜 로그인, 조직 단위 워크스페이스, 고급 분석, 웹훅(추후 고려).

## 3) 성공 지표

* 첫 투표/설문 게시까지 소요 시간 < 60초.
* 투표 참여율 70% 이상, 설문 완성률 80% 이상.
* 중복 참여(동일 IP) 비율 < 0.5%.
* 월 가동률 99.5% 이상, 한국 내 p95 페이지 로드 2.5초 이하.

## 4) 사용자 시나리오

### 투표 시나리오
* **작성자**
  * 제목, 설명, 익명/실명 선택, 관리자 비밀번호 입력 후 투표 생성.
  * 투표 공유 URL과 관리자 URL 즉시 발급.
  * 첫 투표 전까지 투표 수정 가능, 이후 열기/닫기 제어.
  * 실시간 투표 결과 및 의견 확인.
  * 필요 시 특정 투표 삭제 또는 IP 제한 해제 가능.

* **참여자**
  * 투표 접속 후 찬성/반대 선택 및 의견 작성.
  * 실명 투표의 경우 이름/별명 입력.
  * 동일 IP에서 재투표 시 제한 메시지 표시.
  * 투표 완료 후 실시간 결과 확인.

### 설문 시나리오
* **작성자**
  * 제목, 설명, 질문, 관리자 비밀번호 입력 후 설문 생성.
  * 설문 공유 URL과 관리자 URL 즉시 발급.
  * 첫 응답 전까지 설문 수정 가능, 이후 열기/닫기 제어.
  * 응답 CSV 다운로드 및 기본 차트 제공.
  * 필요 시 특정 응답 삭제 또는 IP 제한 해제 가능.

* **응답자**
  * 설문 접속 후 응답 제출.
  * 동일 IP에서 재응답 시 제한 메시지 표시.
  * 응답 완료 후 확인 화면 및 응답 코드 제공(개인정보 없음).

### 공통 시나리오
* **운영자**
  * 악성 투표/설문 숨기기/삭제.
  * 악성 작성자 IP 차단.

## 5) 핵심 기능 요구사항

### 5.1 메인 게시판

* 카드 형태로 제목, 생성일, 상태(열림/닫힘/예정), 참여 수, 태그(선택), 작성자 별명(선택), 콘텐츠 타입(투표/설문) 표시.
* 정렬: 최신순, 참여수순, 마감임박순.
* 필터: 열림만 보기, 태그별 필터, 콘텐츠 타입별 필터(투표/설문).
* 검색: 제목/설명 전체 검색.
* 페이지네이션(무한 스크롤 또는 페이지 번호).

### 5.2 투표 생성

* 필드: 제목(필수), 설명(선택, 마크다운 일부 지원), 태그(선택), 관리자 비밀번호(필수, 8자 이상).
* 투표 유형: 익명/실명 선택, 의견 작성 허용 여부.
* 시간 설정: 시작일시, 종료일시(선택).
* 관리자 접속: 비밀번호 입력 후 해당 투표 전용 관리자 토큰 발급.

### 5.3 설문 생성

* 필드: 제목(필수), 설명(선택, 마크다운 일부 지원), 태그(선택), 관리자 비밀번호(필수, 8자 이상).
* **질문 유형 (MVP)**: 단일 선택, 다중 선택, 단답, 장문, 평점(1~5).
* 검증: 필수 여부, 길이 제한, 옵션 개수 제한.
* 관리자 접속: 비밀번호 입력 후 해당 설문 전용 관리자 토큰 발급(HTTP-only 쿠키 또는 서명된 localStorage 토큰).

### 5.4 투표 상세 (공개 화면)

* 제목, 설명, 실시간 투표 현황(찬성/반대 비율).
* 찬성/반대 버튼, 의견 작성 폼(허용 시).
* 실명 투표의 경우 이름/별명 입력 필드.
* **IP 제한 동작**: 페이지 로드 시 서버에서 해당 IP 투표 여부 확인 후 제한 메시지 표시.
* 시간 기반 상태: 예정(시작 전), 진행중, 종료.

### 5.5 설문 상세 (공개 화면)

* 제목, 설명, 시작 버튼, 진행 상황 표시.
* 클라이언트 검증, 로컬 임시 저장(선택).
* **IP 제한 동작**: 페이지 로드 시 서버에서 해당 IP 응답 여부 확인 후 제한 메시지 표시.
* 닫힘 상태: "이 설문은 현재 응답을 받지 않습니다." 배너 표시.

### 5.6 참여 처리 및 IP 중복 방지

* 제출 시 서버 절차:
  1. 투표/설문 상태 확인.
  2. IP 중복 여부 확인.
  3. 응답 저장 후 IP 잠금 처리.
  4. 참여 수 업데이트.
  5. 투표의 경우 실시간 결과 업데이트.

* CSV/통계: 
  * 투표: 투표 결과, 의견 목록, 시간별 추이 CSV 다운로드.
  * 설문: 응답 데이터 다운로드, 기본 통계 차트(응답 분포 등) 제공.

## 6) API 엔드포인트

### 투표 관련
- `POST /api/debates/create` - 투표 생성
- `GET /api/debates` - 투표 목록 조회
- `GET /api/debates/:id` - 투표 상세 조회
- `POST /api/debates/:id/vote` - 투표하기
- `POST /api/debates/:id/opinion` - 의견 작성
- `POST /api/debates/:id/verify` - 관리자 비밀번호 확인
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

## 7) 기술 스택

### Frontend Framework
- Next.js 14.1.0 (App Router)
- React 18.2.0
- TypeScript 5.3.3

### Styling
- Tailwind CSS 3.4.1
- PostCSS 8.4.33
- Autoprefixer 10.4.17

### Data Fetching & State
- Axios 1.6.5 (HTTP 클라이언트)
- React Context API (테마, 인증 상태 관리)

### UI Components & Libraries
- React Hot Toast 2.6.0 (알림 메시지)
- React Datepicker 8.4.0 (날짜 선택)
- Recharts 3.1.2 (차트 라이브러리)
- Victory 37.3.6 (데이터 시각화 - 사용 검토 중)
- QRCode 1.5.4 (QR 코드 생성)

### Backend & Database
- Next.js API Routes
- MongoDB + Mongoose 8.17.1 (ODM)
- bcryptjs 3.0.2 (비밀번호 해싱)
- jsonwebtoken 9.0.2 (JWT 인증)

### Date & Time
- date-fns 3.6.0 (날짜 포맷팅, 한국어 지원)

### Development Tools
- ESLint 8.56.0 + TypeScript ESLint
- Next.js ESLint Config

## 8) 보안 고려사항

* 비밀번호는 bcrypt로 해싱하여 저장
* 관리자 토큰은 HTTP-only 쿠키 또는 서명된 JWT 사용
* IP 기반 중복 방지
* Rate limiting으로 DDoS 방지
* 입력값 검증 및 XSS 방지
* CORS 설정으로 외부 접근 제어

# 현재 구현 상태

## 완료된 기능

### 1. 투표 (Debates) 시스템
- ✅ 투표 생성/조회/수정/삭제
- ✅ 투표유형 선택 가능
- ✅ 찬성/반대 투표, 다중선택지 투표, 중복선택 기능
- ✅ 의견 작성 기능
- ✅ 익명/실명 투표 지원
- ✅ 관리자 페이지 (비밀번호 인증)
- ✅ 실시간 투표 현황
- ✅ CSV 내보내기
- ✅ IP 기반 중복 투표 방지

### 2. 설문 (Surveys) 시스템
- ✅ 설문 생성/조회/수정/삭제
- ✅ 다양한 질문 유형 (단일선택, 다중선택, 단답, 장문, 평점)
- ✅ 단계별 설문 응답 UI
- ✅ 관리자 페이지 (비밀번호 인증)
- ✅ 설문 결과 통계 및 차트
- ✅ CSV 내보내기
- ✅ IP 기반 중복 응답 방지
- ✅ 공개 결과 페이지

### 3. 관리자 시스템
- ✅ 슈퍼 관리자 인증 (JWT 기반)
- ✅ 관리자 대시보드
- ✅ 통계 페이지 (상세 통계 포함)
- ✅ 콘텐츠 관리 (숨기기/삭제)
- ✅ 사용자 IP 관리 및 차단
- ✅ 에러 로그 모니터링

### 4. 추가 기능
- ✅ 방명록 (Guestbook) 시스템
- ✅ 질문/답변 (Questions) 시스템
- ✅ 요청사항 (Requests) 시스템
- ✅ 댓글 (Comments) 시스템
- ✅ 다크모드 지원
- ✅ 반응형 디자인

## 개발 진행 중
- 🚧 태그 입력 컴포넌트 (TagInput.tsx)
- 🚧 debates/create 페이지 개선

## 기술 스택 (간단 요약)
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT, bcryptjs
- **UI Components**: Recharts, React Hot Toast, React Datepicker, QRCode
- **Styling**: Tailwind CSS
- **날짜 처리**: date-fns (한국어 지원)

## 배포 정보
- **Frontend**: Vercel (추천)
- **Database**: MongoDB Atlas
- **배포 방법**: 
  - Vercel에 GitHub 연동 후 자동 배포
  - 환경 변수 설정 필요 (아래 참조)

## 환경 변수
- `MONGODB_URI`: MongoDB 연결 문자열
- `JWT_SECRET`: JWT 시크릿 키
- `NEXT_PUBLIC_API_URL`: API 엔드포인트 URL
- `ADMIN_USERNAME`: 슈퍼 관리자 아이디
- `ADMIN_PASSWORD`: 슈퍼 관리자 비밀번호

## 로컬 실행
```bash
npm install
npm run dev
```

포트: http://localhost:3001 (기본값)

## 프로젝트 구조
```
selfquestion/
├── src/
│   ├── app/               # Next.js 14 app directory
│   │   ├── api/          # API Routes
│   │   ├── debates/      # 투표 페이지
│   │   ├── surveys/      # 설문 페이지
│   │   ├── admin/        # 관리자 페이지
│   │   ├── guestbook/    # 방명록
│   │   ├── questions/    # Q&A
│   │   └── requests/     # 요청사항
│   ├── components/       # 재사용 가능한 컴포넌트
│   ├── contexts/        # React Context (테마, 인증)
│   ├── lib/            # 유틸리티 및 API 클라이언트
│   ├── models/         # Mongoose 모델
│   └── types/          # TypeScript 타입 정의
├── public/             # 정적 파일
└── scripts/           # 유틸리티 스크립트
```

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# UI-PROTECTION-RULES
NEVER modify UI structure or styling unless explicitly requested by the user.
기본 UI 구조는 절대 변경하지 않는다. 사용자가 명시적으로 UI 변경을 요청할 때만 수정한다.
- 레이아웃 구조 변경 금지
- 기본 스타일 변경 금지  
- 색상 체계 변경 금지
- 간격 및 패딩 변경 금지
UI 변경 요청이 있을 때만 해당 부분을 수정하고, 그 외에는 기존 구조를 유지한다.
