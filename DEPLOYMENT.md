# Firebase 자동 배포 설정 가이드

## GitHub Secrets 설정

GitHub 리포지토리 → Settings → Secrets and variables → Actions에서 다음 시크릿들을 추가하세요:

### 필수 시크릿

1. **FIREBASE_TOKEN**
   ```bash
   # Firebase CLI 설치 (아직 안 했다면)
   npm install -g firebase-tools
   
   # Firebase 로그인 및 토큰 생성
   firebase login:ci
   ```
   생성된 토큰을 복사하여 추가

2. **NEXT_PUBLIC_FIREBASE_API_KEY**
   - 값: `AIzaSyCtgFT-AdIoKkVtff8RO0pcGWjgKd9aLPg`

3. **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
   - Firebase 콘솔 → 프로젝트 설정 → 일반 → 내 앱에서 확인

4. **NEXT_PUBLIC_FIREBASE_APP_ID**
   - Firebase 콘솔 → 프로젝트 설정 → 일반 → 내 앱에서 확인

## 배포 프로세스

1. 위의 모든 GitHub Secrets 설정 완료
2. `main` 브랜치에 푸시하면 자동으로 배포 시작
3. GitHub Actions 탭에서 배포 진행 상황 확인

## 배포 URL

- Frontend: https://oz-lecture.web.app 또는 https://oz-lecture.firebaseapp.com
- Backend API: https://asia-northeast3-oz-lecture.cloudfunctions.net/api

## 로컬 환경 설정

1. `frontend/.env.local` 파일에 Firebase 설정 추가
2. `MESSAGING_SENDER_ID`와 `APP_ID`를 Firebase 콘솔에서 확인하여 업데이트

## 문제 해결

- 배포 실패 시 GitHub Actions 로그 확인
- Firebase 프로젝트가 Asia Northeast3 (seoul) 리전으로 설정되어 있는지 확인
- Functions 배포 실패 시 Firebase 콘솔에서 Functions 활성화 여부 확인