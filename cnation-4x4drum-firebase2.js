/**
 * cnation 4x4 DRUM - Firebase 랭킹 모듈
 * 
 * 사용 전 아래 firebaseConfig를 본인 프로젝트 값으로 교체하세요.
 * Firestore 컬렉션: cnation-4x4drum-scores
 * 문서: mode44, mode88
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화 (이미 초기화된 경우 방지)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const COLLECTION = 'cnation-4x4drum-scores';
const ADMIN_PASSWORD = '1257';

function getDocId(mode) {
  return mode === '44' ? 'mode44' : 'mode88';
}

async function loadScores(mode) {
  try {
    const docRef = db.collection(COLLECTION).doc(getDocId(mode));
    const doc = await docRef.get();
    if (doc.exists && doc.data().scores) {
      return doc.data().scores;
    }
    return [];
  } catch (error) {
    console.warn('랭킹을 불러오지 못했습니다.', error);
    return [];
  }
}

async function submitScore(mode, name, score) {
  try {
    const docId = getDocId(mode);
    const docRef = db.collection(COLLECTION).doc(docId);
    const doc = await docRef.get();

    let scores = [];
    if (doc.exists && doc.data().scores) {
      scores = doc.data().scores;
    }

    // Top 10 진입 조건 확인
    if (scores.length >= 10 && score <= scores[scores.length - 1].score) {
      return false; // 순위권 밖
    }

    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);

    await docRef.set({ scores }, { merge: true });
    return true;
  } catch (error) {
    console.warn('점수 제출 실패', error);
    return false;
  }
}

async function resetRankings(password) {
  if (password !== ADMIN_PASSWORD) {
    return false;
  }
  try {
    await db.collection(COLLECTION).doc('mode44').set({ scores: [] });
    await db.collection(COLLECTION).doc('mode88').set({ scores: [] });
    return true;
  } catch (error) {
    console.warn('랭킹 초기화 실패', error);
    return false;
  }
}

// 전역에서 사용할 수 있도록 노출
window.CNRanking = {
  loadScores,
  submitScore,
  resetRankings
};