# GoDaddy 실제 경매 봇 배포 가이드

## 🚀 무료 호스팅 플랫폼 배포

### 1. Railway (추천)
Railway는 Python Flask 앱을 쉽게 배포할 수 있는 무료 플랫폼입니다.

#### 배포 단계:
1. [Railway](https://railway.app) 가입
2. GitHub 저장소 연결
3. 자동 배포 완료

#### 설정 파일:
- `railway.json` ✅
- `Procfile` ✅
- `real_requirements.txt` ✅

### 2. Heroku
Heroku는 가장 인기 있는 무료 호스팅 플랫폼입니다.

#### 배포 단계:
1. [Heroku](https://heroku.com) 가입
2. Heroku CLI 설치
3. 다음 명령어 실행:
```bash
heroku create godaddy-auction-bot
git push heroku main
```

#### 설정 파일:
- `Procfile` ✅
- `runtime.txt` ✅
- `real_requirements.txt` ✅

### 3. Vercel
Vercel은 주로 프론트엔드용이지만 Python도 지원합니다.

#### 배포 단계:
1. [Vercel](https://vercel.com) 가입
2. GitHub 저장소 연결
3. 자동 배포

#### 설정 파일:
- `vercel.json` ✅

### 4. Render
Render는 Heroku의 대안으로 인기가 높습니다.

#### 배포 단계:
1. [Render](https://render.com) 가입
2. GitHub 저장소 연결
3. Web Service 생성
4. 빌드 명령어: `pip install -r real_requirements.txt`
5. 시작 명령어: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT godaddy_real_bot:app`

## 🐳 Docker 배포

### Docker Hub 배포:
```bash
# 이미지 빌드
docker build -t godaddy-auction-bot .

# 컨테이너 실행
docker run -p 8080:8080 godaddy-auction-bot
```

### Docker Compose:
```yaml
version: '3.8'
services:
  godaddy-bot:
    build: .
    ports:
      - "8080:8080"
    environment:
      - FLASK_ENV=production
      - PORT=8080
```

## 🔧 환경변수 설정

배포 시 다음 환경변수를 설정하세요:

### 필수 환경변수:
- `SECRET_KEY`: Flask 보안 키
- `PORT`: 서버 포트 (기본값: 8080)

### 선택적 환경변수:
- `FLASK_ENV`: production
- `MAX_BID_LIMIT`: 180
- `LOG_LEVEL`: INFO

## 📋 배포 전 체크리스트

### 1. 파일 확인:
- [x] `godaddy_real_bot.py` - 메인 애플리케이션
- [x] `templates/real_index.html` - 로그인 페이지
- [x] `templates/dashboard.html` - 대시보드 페이지
- [x] `static/css/dashboard.css` - 스타일시트
- [x] `static/js/dashboard.js` - JavaScript

### 2. 설정 파일:
- [x] `real_requirements.txt` - Python 의존성
- [x] `Procfile` - Heroku/Railway 실행 명령어
- [x] `runtime.txt` - Python 버전
- [x] `vercel.json` - Vercel 설정
- [x] `railway.json` - Railway 설정
- [x] `Dockerfile` - Docker 설정

### 3. 보안 확인:
- [ ] 환경변수로 민감한 정보 관리
- [ ] HTTPS 강제 설정
- [ ] CORS 설정 확인

## 🌐 배포 후 접속

배포가 완료되면 다음과 같은 URL로 접속할 수 있습니다:

- **Railway**: `https://your-app-name.up.railway.app`
- **Heroku**: `https://your-app-name.herokuapp.com`
- **Vercel**: `https://your-app-name.vercel.app`
- **Render**: `https://your-app-name.onrender.com`

## ⚠️ 중요 사항

### 실제 GoDaddy 로그인:
- 배포된 버전은 실제 GoDaddy 계정으로 로그인됩니다
- 실제 입찰이 실행될 수 있으니 주의하세요
- 자동 입찰로 인한 손실에 대해 책임지지 않습니다

### 보안:
- 계정 정보는 서버에 저장되지 않습니다
- HTTPS를 통해 안전하게 전송됩니다
- 세션은 브라우저 종료 시 삭제됩니다

### 성능:
- 무료 호스팅은 성능 제한이 있을 수 있습니다
- 30초마다 경매 데이터를 새로고침합니다
- 동시 사용자 수에 제한이 있을 수 있습니다

## 🆘 문제 해결

### 로그인 문제:
1. GoDaddy 계정 정보 확인
2. 2단계 인증 비활성화 (필요시)
3. 브라우저 쿠키 및 캐시 삭제

### 배포 문제:
1. 로그 확인: `heroku logs --tail`
2. 의존성 확인: `real_requirements.txt`
3. 환경변수 확인

### 성능 문제:
1. 무료 플랜 제한 확인
2. 서버 지역 선택
3. 캐싱 설정 최적화

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 배포 플랫폼의 로그
2. 브라우저 개발자 도구
3. 네트워크 연결 상태
