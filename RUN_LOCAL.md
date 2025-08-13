# 로컬 개발 환경 실행 가이드

## 필수 사항
- Node.js 18 이상
- Firebase CLI

## Firebase CLI 설치 (Windows)

1. Node.js가 설치되어 있는지 확인:
```bash
node --version
npm --version
```

2. Firebase CLI 설치:
```bash
npm install -g firebase-tools
```

3. 설치 확인:
```bash
firebase --version
```

만약 'firebase' 명령을 찾을 수 없다면:
- PowerShell을 관리자 권한으로 실행
- 다시 설치: `npm install -g firebase-tools`
- 또는 npx 사용: `npx firebase-tools`

## 로컬 서버 실행

### 1. 백엔드 서버 실행
```bash
cd backend

# 옵션 1: npm 스크립트 사용
npm run serve

# 옵션 2: npx 사용 (firebase 명령이 안 될 때)
npx firebase emulators:start --only functions
```

백엔드는 http://localhost:5002 에서 실행됩니다.

### 2. 프론트엔드 서버 실행 (새 터미널)
```bash
cd frontend
npm run dev
```

프론트엔드는 http://localhost:3001 에서 실행됩니다.

## 문제 해결

### "firebase: command not found" 오류
1. npm 전역 패키지 경로 확인:
```bash
npm config get prefix
```

2. 환경 변수 PATH에 추가:
- Windows: `%APPDATA%\npm` 을 PATH에 추가
- 시스템 설정 → 환경 변수 → PATH 편집

3. 또는 npx 사용:
```bash
cd backend
npx firebase emulators:start --only functions
```

### 포트 충돌
Functions 에뮬레이터가 사용하는 포트:
- 5001: Functions
- 5002: Functions UI
- 4000: Emulator UI

포트가 이미 사용 중이면 프로세스를 종료하거나 다른 포트 사용:
```bash
npx firebase emulators:start --only functions --port 5003
```

## 투표 만들기 테스트

1. 두 서버가 모두 실행 중인지 확인
2. http://localhost:3001 접속
3. "첫 투표 만들기" 버튼 클릭
4. 필수 정보 입력:
   - 제목
   - 작성자 닉네임
   - 관리 비밀번호
   - 최소 2개의 투표 옵션
5. "투표 생성" 클릭