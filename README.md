# Church ERP - 교회 관리 시스템

교회 성도 관리, 헌금/회계, 사역 자료실 등을 통합 관리하는 **Tauri + React + TypeScript** 기반 데스크톱 ERP 시스템입니다.

## ✨ 주요 기능

### 📊 대시보드
- 주일예배 출석 현황
- 헌금 통계
- 새가족 등록 현황
- 주간 일정 관리
- 빠른 실행 버튼 (성도 등록, 헌금 입력, 지출 품의)

### 👥 성도 관리 (CRM)
- 성도 신규 등록/수정/삭제
- 교구/구역별 조직도 관리
- 사진 등록
- 교적 정보 (직분, 세례, 신앙세대주 등)
- 소속 설정 및 메모

### 💰 회계/헌금 관리
- 총계정원장 조회
- 월간 재정 흐름 차트
- 수입/지출 상세 내역
- PDF/Excel 내보내기
- 연간 예산 집행률 현황

### 📚 사역/교육 자료실
- 설교 영상 관리
- 주보 아카이브
- 교육 자료 업로드
- 카테고리별 필터링
- 그리드/리스트 뷰 전환

### 🔔 시스템 활동 로그 (알림)
- 주요 변경 사항 실시간 알림 (성도/재정/설정)
- 활동 로그 자동 기록 및 감사(Audit) 기능
- 읽지 않은 알림 배지 표시
- 로그 영구 삭제 및 관리

### ❓ 고객 센터 및 도움말
- 사용자 가이드
- 자주 묻는 질문
- 온라인 문의
- 공지사항

## 🛠️ 기술 스택

- **Frontend**: React 18 + TypeScript
- **Styling**: Vanilla CSS (커스텀 디자인 시스템)
- **Routing**: React Router v6
- **Desktop**: Tauri 1.5
- **Build Tool**: Vite 5
- **Icons**: Material Symbols
- **Fonts**: Manrope, Noto Sans KR

## 📁 프로젝트 구조

```
church-management/
├── src/
│   ├── components/          # 재사용 컴포넌트
│   │   └── Layout.tsx       # 앱 레이아웃 (사이드바 + 헤더)
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── Login.tsx        # 로그인 페이지
│   │   ├── Dashboard.tsx    # 대시보드
│   │   ├── Members.tsx      # 성도 목록
│   │   ├── MemberRegistration.tsx  # 성도 등록
│   │   ├── Finance.tsx      # 회계/헌금 관리
│   │   ├── Resources.tsx    # 자료실
│   │   └── Help.tsx         # 도움말
│   ├── styles/              # CSS 스타일
│   │   ├── index.css        # 글로벌 스타일 + 변수
│   │   ├── login.css        # 로그인 페이지
│   │   ├── layout.css       # 레이아웃
│   │   ├── dashboard.css    # 대시보드
│   │   └── pages.css        # 기타 페이지
│   ├── App.tsx              # 메인 앱 (라우팅)
│   └── main.tsx             # 진입점
├── src-tauri/               # Tauri 백엔드
│   ├── src/main.rs          # Rust 메인
│   ├── Cargo.toml           # Rust 의존성
│   └── tauri.conf.json      # Tauri 설정
├── public/
│   └── church-icon.svg      # 앱 아이콘
├── sample/                  # 레퍼런스 디자인
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+
- Rust (Tauri 빌드용)
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (웹)
npm run dev

# Tauri 개발 모드 (데스크톱 앱)
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

### 로그인 (보안 주의)

시스템 최초 실행 시 기본 관리자 계정이 생성됩니다.

- **아이디**: `admin`
- **비밀번호**: `admin`

⚠️ **중요**: 초기 로그인 후 보안을 위해 **즉시 비밀번호를 변경**해주시기 바랍니다. 또한 새로운 관리자 계정을 생성하고 기본 계정은 사용하지 않는 것을 권장합니다.

## 📱 스크린샷

### 로그인 화면
![Login](./sample/관리자_로그인_화면_(login)/screen.png)

### 대시보드
![Dashboard](./sample/교회_관리_erp_통합_대시보드_(admin_home)_1/screen.png)

### 성도 등록
![Member Registration](./sample/성도_및_조직_관리_화면_(crm)_1/screen.png)

### 회계 관리
![Finance](./sample/회계_및_헌금_통합_관리_화면_(finance)_1/screen.png)

### 자료실
![Resources](./sample/설교_및_사역_자료실_관리_(resources)_1/screen.png)

## 🎨 디자인 시스템

### 색상

```css
--primary: #16649c;         /* 메인 파랑 */
--primary-dark: #0f4c7a;    /* 다크 블루 */
--background-light: #f3f6f8; /* 배경 */
--sidebar-bg: #21262c;      /* 사이드바 다크 */
```

### 타이포그래피

- **Display**: Manrope (제목, 숫자)
- **Body**: Noto Sans KR (본문, 한글)

### 컴포넌트

- 카드 (KPI, 이벤트, 차트)
- 폼 요소 (인풋, 셀렉트, 체크박스)
- 테이블 (원장)
- 버튼 (Primary, Outline)
- 네비게이션 (사이드바)

## 📄 라이센스

MIT License

---

© 2024 Church ERP System. All rights reserved.
