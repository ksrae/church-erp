/**
 * 슈퍼유저 초기 설정 스크립트
 * 실행: node scripts/setup-superuser.mjs
 *
 * Firebase CLI 로그인 상태에서 실행하세요.
 * Firestore에 config/superUser 문서를 생성합니다.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdlkSLfEi3xYIDxaQ1f9xjYbccMFqjiMk",
  authDomain: "zion-manager.firebaseapp.com",
  projectId: "zion-manager",
  storageBucket: "zion-manager.firebasestorage.app",
  messagingSenderId: "1048507266169",
  appId: "1:1048507266169:web:1ec848281a016b303cd0a8",
};

// 슈퍼유저 이메일 — 변경 시 여기를 수정하거나 Firebase Console에서 직접 수정
const SUPER_USER_EMAIL = "farmyon@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setup() {
  try {
    console.log("🔧 Church Portal 슈퍼유저 설정을 시작합니다...\n");

    const configRef = doc(db, "config", "superUser");
    const existing = await getDoc(configRef);

    if (existing.exists()) {
      const currentEmail = existing.data().email;
      console.log(`ℹ️  config/superUser 문서가 이미 존재합니다.`);
      console.log(`   현재 슈퍼유저: ${currentEmail}`);

      if (currentEmail === SUPER_USER_EMAIL) {
        console.log("✅ 이미 올바르게 설정되어 있습니다.\n");
        process.exit(0);
      }

      console.log(`   → ${SUPER_USER_EMAIL} 으로 업데이트합니다.`);
    }

    await setDoc(configRef, {
      email: SUPER_USER_EMAIL,
      updatedAt: new Date().toISOString(),
      note: "슈퍼유저 이메일 변경 시 이 문서의 email 필드를 수정하세요.",
    });

    console.log(`✅ config/superUser 생성 완료!`);
    console.log(`   슈퍼유저 이메일: ${SUPER_USER_EMAIL}`);
    console.log(`\n🚀 이제 ${SUPER_USER_EMAIL} 계정으로 로그인하면 슈퍼유저 백오피스에 접근할 수 있습니다.`);
    console.log(`   URL: https://zion-manager.web.app/admin/login\n`);

  } catch (error) {
    console.error("❌ 오류가 발생했습니다:", error.message);
    console.log("\n💡 Firestore 보안 규칙으로 인해 실패한 경우:");
    console.log("   Firebase Console에서 직접 생성하세요:");
    console.log("   https://console.firebase.google.com/project/zion-manager/firestore");
    console.log("   → config 컬렉션 → superUser 문서 → email: farmyon@gmail.com\n");
  }

  process.exit(0);
}

setup();
