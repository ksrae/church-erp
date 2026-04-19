# Church ERP - 교회 관리 시스템

> **버전**: 0.2.1 | **플랫폼**: Windows / macOS / Linux (데스크톱 앱)

교회 성도 관리, 헌금/회계, 사역 자료실 등을 통합 관리하는 **Tauri + React + TypeScript** 기반 로컬 데스크톱 ERP 시스템입니다. 클라우드 서버 없이 교회 PC에서 독립적으로 운영됩니다.

---

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [주요 기능](#주요-기능)
4. [화면 구성](#화면-구성)
5. [프로젝트 구조](#프로젝트-구조)
6. [데이터 모델](#데이터-모델)
7. [권한 및 인증](#권한-및-인증)
8. [데이터 저장 방식](#데이터-저장-방식)
9. [개발 환경 설정](#개발-환경-설정)
10. [빌드 및 배포](#빌드-및-배포)
11. [보안 설계](#보안-설계)
12. [디자인 시스템](#디자인-시스템)

---

## 프로젝트 개요

### 배경
소규모~중형 한국 교회를 위한 **오프라인 우선(Offline-First)** ERP 솔루션입니다. 별도 서버 구축 없이 교회 담당자의 PC에 설치하여 즉시 사용할 수 있으며, 모든 데이터는 로컬 파일 시스템에 암호화된 형태로 저장됩니다.

### 핵심 특징

| 특징 | 설명 |
|------|------|
| 서버 불필요 | 클라우드/DB 없이 로컬 AppData에 JSON 파일로 저장 |
| 역할 기반 접근 제어 | super / finance / member 3단계 권한 |
| 감사 로그 | 모든 주요 변경 사항 자동 기록 (binary 포맷) |
| 다중 통화 | KRW, USD, EUR, JPY, GBP 지원 |
| 한국어 최적화 | 교구/구역 조직 체계, 다음 주소 API, 한글 IME 지원 |
| 크로스 플랫폼 | Windows .exe / macOS .dmg / Linux .AppImage |

---

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| **UI 프레임워크** | React | 18.2.0 |
| **언어** | TypeScript | 5.3.3 |
| **데스크톱 래퍼** | Tauri (Rust) | 1.5 |
| **빌드 도구** | Vite | 5.1.0 |
| **라우팅** | React Router DOM | 6.22.0 |
| **스타일링** | Vanilla CSS (커스텀 디자인 시스템) | - |
| **아이콘** | Material Symbols (Google Fonts) | - |
| **폰트** | Manrope (숫자/영문), Noto Sans KR (한글) | - |
| **백엔드** | Rust (Tauri commands) | - |
| **데이터 저장** | Tauri Filesystem API + localStorage fallback | - |

---

## 주요 기능

| 모듈 | 기능 |
|------|------|
| **대시보드** | KPI 카드 (성도 수, 수입/지출 합계), 캘린더 이벤트, 빠른 실행 버튼 |
| **성도 관리 (CRM)** | 성도 CRUD, 프로필 사진, 교구/구역 조직도, 다음 주소 검색, 직분/세례/신앙세대주 |
| **회계/헌금 관리** | 계정 과목 관리, 수입/지출 입력, 총계정원장, 월간/연간 보고서, 다중 통화 |
| **자료실** | 설교 영상, 주보 아카이브, 교육 자료 (카테고리 필터, UI 준비됨) |
| **설정** | 교회 정보, 관리자 계정 관리, 통화 설정, 자동 백업 |
| **알림/활동 로그** | 실시간 변경 알림, 읽지 않은 배지, 감사 로그 조회/삭제 |
| **도움말** | 사용자 가이드, FAQ, 문의, 공지사항 |

### 기본 계정 과목

```
자산 (Asset):  1000 현금, 1100 은행예금
수입 (Income): 4000 십일조, 4100 감사헌금, 4200 주일헌금, 4300 선교헌금
지출 (Expense):5000 인건비, 5100 선교비, 5200 교육비, 5300 시설유지비
```

---

## 화면 구성

### 로그인 (`/login`)
- SHA-256 해시 기반 비밀번호 검증
- 한국어 IME 상태 감지 (오입력 방지)
- 자동 로그인 (localStorage 세션 유지)
- 비밀번호 표시/숨김 토글

### 대시보드 (`/`)
- KPI 카드: 전체 성도 수, 당월 수입/지출 합계
- 캘린더 이벤트 (예배/모임/행사/기타 색상 구분)
- 빠른 실행: 성도 등록, 헌금 입력, 지출 입력

### 성도 관리 (`/members`)
- 좌측 트리: 교구 > 구역 탐색기 (접기/펼치기)
- 성도 목록 테이블: 검색, 구역 필터
- CRUD: 신규 등록, 수정, 단건/다건 삭제
- 성도 등록 폼: 기본정보, 교적정보, 주소(다음 팝업), 프로필 사진 업로드

### 회계/헌금 관리 (`/finance`)
- 탭: 총계정원장 / 수입 내역 / 지출 내역 / 보고서
- 날짜 필터 (일별/월별/기간)
- 도넛 차트 (수입/지출 비율 시각화)
- 계정 과목 관리 (추가/수정/삭제)

### 설정 (`/settings`)
- 교회 정보 (교회명, 담임목사, 주소, 연락처)
- 관리자 계정 관리 (역할 배정, 비밀번호 재설정)
- 통화 선택 (KRW/USD/EUR/JPY/GBP)
- 자동 백업 스케줄

### 알림 (`/notifications`)
- 활동 로그 타임라인 (최신순)
- 카테고리 필터 (성도/재정/설정/시스템)
- 로그 삭제 (삭제 자체도 감사 기록)

---

## 프로젝트 구조

```
church-management/
├── src/                              # React/TypeScript 프론트엔드
│   ├── components/
│   │   ├── Layout.tsx               # 앱 셸 (사이드바 + 헤더 + 알림)
│   │   ├── charts/
│   │   │   └── DonutChart.tsx       # 재정 도넛 차트
│   │   ├── common/
│   │   │   ├── CustomSelect.tsx     # 커스텀 드롭다운
│   │   │   ├── DeleteConfirmModal.tsx
│   │   │   └── MemberSelect.tsx     # 성도 선택 피커
│   │   ├── finance/
│   │   │   ├── AccountForm.tsx      # 계정 과목 폼
│   │   │   ├── FinanceHeader.tsx    # 재정 탭 네비게이션
│   │   │   ├── FinanceSidebar.tsx
│   │   │   ├── LedgerView.tsx       # 총계정원장
│   │   │   ├── ReportView.tsx       # 재무 보고서
│   │   │   ├── TransactionFilters.tsx
│   │   │   ├── TransactionForm.tsx  # 수입/지출 입력
│   │   │   ├── TransactionManagementView.tsx
│   │   │   ├── TransactionSummary.tsx
│   │   │   └── TransactionTable.tsx
│   │   └── settings/
│   │       └── AdminManagement.tsx  # 관리자 계정 관리
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Members.tsx
│   │   ├── MemberRegistration.tsx
│   │   ├── Finance.tsx
│   │   ├── Resources.tsx
│   │   ├── Settings.tsx
│   │   ├── Help.tsx
│   │   └── Notifications.tsx
│   ├── styles/
│   │   ├── index.css                # 글로벌 변수 + 리셋
│   │   ├── login.css
│   │   ├── layout.css
│   │   ├── dashboard.css
│   │   └── pages.css
│   ├── types/
│   │   ├── admin.ts                 # 관리자 역할/권한 타입
│   │   └── finance.ts               # 회계 데이터 모델
│   ├── utils/
│   │   ├── adminSecurity.ts         # 비밀번호 해싱 + 바이너리 암호화
│   │   ├── auditLog.ts              # 활동 로그 시스템
│   │   ├── currency.ts              # 다중 통화 포맷
│   │   └── fileStorage.ts           # Tauri 파일 I/O 래퍼
│   ├── App.tsx                      # 라우터 + 인증 가드
│   └── main.tsx
├── src-tauri/                        # Rust 백엔드
│   ├── src/main.rs                  # Tauri 앱 설정 + print_file 커맨드
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json              # 창 크기, 파일 스코프, 권한
├── public/
│   └── church-icon.svg
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 데이터 모델

### AdminUser

```typescript
{
  id: string;            // UUID
  memberId: string;      // 연결된 성도 ID (선택)
  memberName: string;    // 표시 이름
  username: string;      // 로그인 ID
  passwordHash: string;  // SHA-256 hex
  role: "super" | "finance" | "member";
  createdAt: string;     // ISO date
  lastLogin?: string;
}
```

### Member

```typescript
{
  id: string;
  name: string;
  gender: "male" | "female";
  birthDate: string;       // YYYY-MM-DD
  phone: string;
  address: string;
  role: string;            // 직분 (집사, 장로 등)
  zone: string;            // 구역 (1-1 구역 등)
  joinDate: string;
  memo: string;
  profileImage?: string;   // 파일 경로 또는 base64
  status: string;          // 교적 상태
  baptism: string;         // 세례 여부
  familyHead?: string;     // 신앙세대주
  moveDate?: string;       // 전출일
}
```

### Account (계정 과목)

```typescript
{
  id: string;
  code: string;            // 계정 코드 (1000, 4000 등)
  name: string;            // 한글명 (현금, 십일조)
  subName: string;         // 영문명
  type: "asset" | "income" | "expense";
  description?: string;
}
```

### Transaction (거래 내역)

```typescript
{
  id: string;
  accountId: string;       // Account FK
  date: string;            // YYYY-MM-DD
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  memo?: string;
}
```

### ActivityLog (감사 로그)

```typescript
{
  id: string;
  timestamp: string;       // ISO date
  category: "MEMBER" | "FINANCE" | "SETTINGS" | "SYSTEM" | "RESOURCES" | "HELP";
  action: string;          // 예: "Member Created"
  details: string;
  user?: string;           // 로그인 사용자명
}
```

### CalendarEvent

```typescript
{
  id: string;
  title: string;
  date: string;            // YYYY-MM-DD
  eventEndDate?: string;   // 다일 행사용
  time: string;            // HH:MM
  endTime?: string;
  description: string;
  category: "worship" | "meeting" | "event" | "other";
  repeat: "none" | "weekly" | "monthly" | "yearly";
}
```

---

## 권한 및 인증

### 역할별 접근 권한

| 역할 | 접근 가능 페이지 |
|------|----------------|
| `super` | 전체 (`*`) |
| `finance` | 대시보드, 회계/헌금, 설정, 도움말 |
| `member` | 대시보드, 성도 관리, 설정, 도움말 |

### 인증 흐름

```
1. 로그인 → hashPassword(입력값 + salt) → SHA-256
2. admin.dat(XOR 암호화 바이너리)에서 해시 비교
3. 일치 시 localStorage에 {userId, passwordHash, autoLogin, username} 저장
4. App 시작 시 localStorage 확인 → 자동 로그인
5. ProtectedRoute가 rolePermissions 맵으로 경로 접근 제어
6. 로그아웃 → localStorage 삭제 + currentUser 초기화
```

### 기본 관리자 계정

시스템 최초 실행 시 자동 생성됩니다.

- **아이디**: `admin`
- **비밀번호**: `admin`

> **중요**: 초기 로그인 후 즉시 비밀번호를 변경하고, 새 관리자 계정을 생성한 뒤 기본 계정은 사용하지 않는 것을 권장합니다.

---

## 데이터 저장 방식

모든 데이터는 OS AppData 디렉토리 내 로컬 파일로 저장됩니다.

```
AppData/
├── data/
│   ├── admins/
│   │   └── admin.dat          # XOR 암호화 + Base64 (관리자 인증 정보)
│   ├── members/
│   │   └── members.json       # 성도 데이터
│   ├── finance/
│   │   └── finance.json       # 거래 내역 + 계정 과목
│   ├── settings/
│   │   └── settings.json      # 교회 설정
│   ├── events/
│   │   └── events.json        # 캘린더 이벤트
│   └── org_groups/
│       └── org_groups.json    # 교구/구역 조직
├── logs/
│   └── activity_log.bin       # 바이너리 감사 로그
└── images/
    └── [timestamp]_[uuid].ext # 성도 프로필 사진
```

### 백업 구조

자동 백업 시 다음 경로에 저장됩니다:

```
data/{type}/backups/{YYYY}_W{week}/
```

### 이중 저장 모드

- **Tauri 환경 (프로덕션)**: `@tauri-apps/api/fs` 사용
- **브라우저 환경 (개발/테스트)**: localStorage fallback

---

## 개발 환경 설정

### 사전 요구사항

- Node.js 18+
- Rust (stable) + Cargo
- npm 또는 yarn
- [Tauri 사전 요구사항](https://tauri.app/v1/guides/getting-started/prerequisites) (OS별 빌드 도구)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repository-url>
cd church-management

# 2. 의존성 설치
npm install

# 3-A. 웹 개발 서버 (UI 확인용, 파일 저장 기능 제한)
npm run dev

# 3-B. Tauri 개발 모드 (전체 기능, 권장)
npm run tauri dev
```

> Vite 개발 서버는 포트 **1420**을 사용합니다 (Tauri 기본값).

---

## 빌드 및 배포

```bash
# TypeScript 검사 + Vite 번들링
npm run build

# 플랫폼별 설치 파일 생성
npm run tauri build
```

| 플랫폼 | 출력 파일 | 경로 |
|--------|---------|------|
| Windows | `.exe` (NSIS 설치 파일) | `src-tauri/target/release/bundle/nsis/` |
| macOS | `.dmg` | `src-tauri/target/release/bundle/dmg/` |
| Linux | `.AppImage` | `src-tauri/target/release/bundle/appimage/` |

### Tauri 창 설정

| 항목 | 값 |
|------|-----|
| 기본 크기 | 1400 × 800 px |
| 최소 크기 | 1024 × 600 px |
| 앱 ID | `com.church.erp` |

---

## 보안 설계

### 비밀번호 보호

```
입력 비밀번호 + salt("church_erp_2024_secure_salt")
  → SHA-256 해시
  → admin.dat에 XOR 오브퍼스케이션 + Base64 인코딩으로 저장
```

### 감사 로그 (Audit Log)

- 모든 성도/재정/설정 변경 사항 자동 기록
- `logs/activity_log.bin` (바이너리 포맷, 직접 읽기 불가)
- 최신 로그를 배열 앞에 prepend
- 로그 삭제 시 "삭제됨" 항목 자체도 로그에 기록
- Layout 컴포넌트에 `activity-logged` 커스텀 이벤트로 실시간 알림 배지 갱신

### 파일 시스템 접근 범위

Tauri 설정에서 허용된 경로만 접근 가능:

```
$APPDATA/**
$DOCUMENT/**
$RESOURCE/**
```

---

## 디자인 시스템

### 주요 색상

```css
--primary: #16649c;          /* 메인 파랑 */
--primary-dark: #0f4c7a;     /* 다크 블루 */
--background-light: #f3f6f8; /* 배경 */
--sidebar-bg: #21262c;       /* 사이드바 다크 */
```

### 타이포그래피

- **Display**: Manrope (제목, 숫자, 영문)
- **Body**: Noto Sans KR (본문, 한글)

### 주요 컴포넌트

- KPI 카드
- 도넛 차트 (재정 시각화)
- 계층 트리 (교구/구역 탐색기)
- 거래 테이블 (총계정원장)
- 폼 요소 (인풋, 커스텀 셀렉트, 체크박스)
- 삭제 확인 모달

---

## 라이센스

MIT License

---

© 2024 Church ERP System. All rights reserved.
