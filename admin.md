# Church Portal — 관리자 가이드

**배포 URL:** https://zion-manager.web.app  
**Firebase 프로젝트:** `zion-manager`  
**버전:** 0.3

---

## 1. 슈퍼유저 초기 설정 (최초 1회)

### 1-1. Firebase Console에서 superUser 문서 생성

1. https://console.firebase.google.com/project/zion-manager/firestore 접속
2. **데이터** 탭 → `+ 컬렉션 시작` 클릭
3. 컬렉션 ID: `config`
4. 문서 ID: `superUser`
5. 필드 추가:
   - 필드명: `email` / 유형: `string` / 값: `farmyon@gmail.com`
6. 저장

> **이 문서가 없으면 슈퍼유저로 로그인이 불가능합니다.**  
> 이메일을 변경하려면 Firebase Console에서 이 문서의 `email` 값만 수정하면 됩니다.

### 1-2. Google 로그인 제공업체 활성화

1. https://console.firebase.google.com/project/zion-manager/authentication/providers 접속
2. **Google** 클릭 → 사용 설정 **ON** → 지원 이메일 입력 → 저장

### 1-3. 슈퍼유저로 첫 로그인

1. https://zion-manager.web.app/admin/login 접속
2. "Google 계정으로 로그인" 클릭
3. `farmyon@gmail.com` 계정으로 로그인
4. 자동으로 `/admin/super/churches` 페이지로 이동

---

## 2. 전체 서비스 구조

```
https://zion-manager.web.app
│
├── /                        ← 공개 포탈 메인
├── /bulletins               ← 주보 목록 (공개)
├── /notices                 ← 공지사항 (공개)
├── /schedule                ← 교회 일정 (공개)
│
├── /admin/login             ← 관리자 구글 로그인
│
├── /admin/super             ← 슈퍼유저 전용 (farmyon@gmail.com)
│   ├── /churches            ← 교회 생성 + 라이선스 키 관리
│   └── /portal              ← 포탈 공지/뉴스 관리
│
├── /admin/church/setup      ← 라이선스 키 입력 (최초 1회)
│
└── /admin/church            ← 교회 관리자 (라이선스 등록 후)
    ├── /                    ← 대시보드
    ├── /members             ← 성도 관리
    ├── /finance             ← 재정/회계
    ├── /worship             ← 예배 관리
    ├── /announcements       ← 공지/소식 관리
    ├── /notifications       ← 활동 로그
    └── /settings            ← 교회 설정
```

---

## 3. 역할별 권한

| 역할 | 진입 조건 | 접근 가능 페이지 |
|------|-----------|----------------|
| 일반 방문자 | 없음 (누구나) | 포탈 전체 (`/`, `/bulletins`, `/notices`, `/schedule`) |
| 슈퍼유저 | `config/superUser.email` 일치 | `/admin/super/*` |
| 교회 관리자 | 라이선스 키 등록 완료 | `/admin/church/*` |
| 라이선스 미등록 | 구글 로그인 완료 | `/admin/church/setup` (키 입력 화면만) |

---

## 4. 교회 추가 및 라이선스 키 발급 절차

1. `/admin/super/churches` 에서 **"교회 추가"** 버튼 클릭
2. 교회 이름, 담임목사명, 주소 등 입력 후 저장
3. 자동으로 라이선스 키 생성 (형식: `XXXXXX-XXXXXX-XXXXXX-XXXXXX`)
4. 복사 아이콘으로 키 복사 → 교회 담당자에게 이메일 등으로 전달
5. 교회 담당자가 `/admin/login` → 구글 로그인 → 라이선스 키 입력

### 라이선스 키 재발급

- 키가 유출되었거나 재발급이 필요한 경우 **"키 재발급"** 버튼 클릭
- 기존 키는 즉시 무효화, 새 키 생성
- 교회 관리자의 기존 접근은 유지됨 (UID 기반이므로)

### 교회 비활성화/삭제

- **비활성화**: 포탈에 노출되지 않고 신규 라이선스 등록 불가 (기존 관리자는 접근 가능)
- **삭제**: 교회 레코드 삭제, 라이선스 즉시 무효화

---

## 5. Firestore 데이터 구조

```
Firestore
│
├── config/
│   └── superUser          { email: "farmyon@gmail.com" }
│                           ← 이메일 변경 시 이 문서만 수정
│
├── churches/
│   └── {churchId}         { name, licenseKey, isActive, createdAt,
│                            pastorName, address, phone, email, ... }
│
├── churchAdmins/
│   └── {uid}              { uid, email, displayName, churchId,
│                            createdAt, lastLogin }
│
├── portalPosts/           ← 슈퍼유저가 작성하는 전체 포탈 공지/뉴스
│   └── {postId}           { title, content, type, isPublished, isPinned }
│
├── worshipInstances/      ← 교회 예배 세부 내역 (공개된 것은 포탈 표시)
│   └── {instanceId}       { date, type, title, preacher, order,
│                            bulletinFileUrl, isPublished }
│
├── worshipSchedules/      ← 예배 반복 스케줄
│   └── {scheduleId}       { name, type, recurrence, startDate, exceptions }
│
├── announcements/         ← 교회 공지사항 (published는 포탈 표시)
│   └── {announcementId}   { title, content, category, status, churchId }
│
├── activityLogs/          ← 관리자 활동 로그
│
└── churchData/
    └── {churchId}/
        ├── members        ← 성도 데이터
        ├── finance        ← 재정 데이터
        ├── events         ← 달력 일정
        ├── org_groups     ← 교구/구역 조직도
        └── settings       ← 교회 설정
```

---

## 6. 포탈 "내 교회" 기능

- 일반 방문자가 포탈에서 교회를 선택하면 해당 교회의 소식이 상단에 우선 표시
- 선택 정보는 브라우저 `localStorage`에 저장 (`church_portal_my_church`)
- 로그인 불필요, 교회 변경 언제든 가능

---

## 7. 배포 명령어

```bash
# 빌드 + Firebase Hosting + Firestore 규칙 동시 배포
npm run deploy

# 또는 개별 배포
npm run build
firebase deploy --project zion-manager
```

---

## 8. 로컬 개발

```bash
npm install
npm run dev
# http://localhost:3000 접속
```

---

## 9. 주요 파일 경로

| 파일 | 설명 |
|------|------|
| `src/firebase.ts` | Firebase 앱 초기화 + SDK config |
| `src/App.tsx` | 전체 라우트 구성 + AuthContext |
| `src/utils/adminSecurity.ts` | Google 로그인, 슈퍼유저 판별, 교회관리자 CRUD |
| `src/utils/fileStorage.ts` | Firestore 데이터 저장/로드 (churchId 기반 분리) |
| `src/pages/super/` | 슈퍼유저 백오피스 페이지 |
| `src/pages/church/` | 교회 관리자 페이지 |
| `src/pages/portal/` | 공개 포탈 페이지 |
| `src/types/church.ts` | Church, ChurchAdmin, PortalPost 타입 |
| `firestore.rules` | Firestore 보안 규칙 |
| `firebase.json` | Firebase Hosting + Firestore 배포 설정 |
