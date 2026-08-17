/*
  cnation 4x4 DRUM - Firebase Ranking Adapter
  Version 1.0.5

  Firestore structure:
    collection: cnation-4x4drum-scores
      document: mode44
        { scores: [{ name:"PLAYER", score:1234 }] }
      document: mode88
        { scores: [{ name:"PLAYER", score:1234 }] }

  IMPORTANT
  1) 아래 firebaseConfig 값을 실제 Firebase 프로젝트 값으로 교체해야 온라인 랭킹이 활성화됩니다.
  2) 관리자 비밀번호를 브라우저 JS에 두는 방식은 Beta 편의를 위한 것이며 보안 방식이 아닙니다.
     실제 서비스에서는 Firebase Authentication / Cloud Functions 등 서버 측 검증으로 옮기세요.
*/

const APP_VERSION = '1.0.5';
const COLLECTION = 'cnation-4x4drum-scores';
const ADMIN_PASSWORD = '1257';

const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

let db = null;
let firestoreFns = null;

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

function sanitizeName(name) {
  return String(name ?? '').trim().slice(0,20);
}

function sanitizeScores(scores) {
  if (!Array.isArray(scores)) return [];
  return scores
    .map((s,idx)=>({
      name:sanitizeName(s?.name),
      score:Number.isFinite(Number(s?.score)) ? Math.max(0,Math.floor(Number(s.score))) : 0,
      _order:idx
    }))
    .filter(s=>s.name)
    .sort((a,b)=>b.score-a.score || a._order-b._order)
    .slice(0,10)
    .map(({name,score})=>({name,score}));
}

function docNameForMode(mode) {
  if (String(mode)==='44') return 'mode44';
  if (String(mode)==='88') return 'mode88';
  throw new Error(`지원하지 않는 모드입니다: ${mode}`);
}

async function initFirebase() {
  if (!hasFirebaseConfig()) {
    console.info(`[4x4 DRUM ${APP_VERSION}] Firebase config is empty. Online ranking disabled.`);
    return;
  }

  const [{ initializeApp }, fs] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js')
  ]);

  const app = initializeApp(firebaseConfig);
  db = fs.getFirestore(app);
  firestoreFns = fs;
}

async function readScores(mode) {
  if (!db || !firestoreFns) return [];
  const ref = firestoreFns.doc(db,COLLECTION,docNameForMode(mode));
  const snap = await firestoreFns.getDoc(ref);
  if (!snap.exists()) return [];
  return sanitizeScores(snap.data()?.scores);
}

async function getTop10(mode) {
  return readScores(mode);
}

async function qualifies(mode, score) {
  const numericScore = Math.max(0,Math.floor(Number(score)||0));
  const scores = await readScores(mode);
  if (scores.length < 10) return true;
  return numericScore > scores[9].score;
}

async function submitScore(mode, name, score) {
  if (!db || !firestoreFns) throw new Error('Firebase가 설정되지 않았습니다.');

  const cleanName = sanitizeName(name);
  const numericScore = Math.max(0,Math.floor(Number(score)||0));

  if (!cleanName) throw new Error('닉네임이 비어 있습니다.');

  const ref = firestoreFns.doc(db,COLLECTION,docNameForMode(mode));

  return firestoreFns.runTransaction(db,async tx=>{
    const snap = await tx.get(ref);
    const current = snap.exists() ? sanitizeScores(snap.data()?.scores) : [];

    // 등록 순간 다시 Top10 여부 판정. 동점은 기존 기록 우선.
    if (current.length >= 10 && numericScore <= current[9].score) {
      return false;
    }

    const next = sanitizeScores([
      ...current,
      { name:cleanName, score:numericScore }
    ]);

    tx.set(ref,{ scores:next },{ merge:false });
    return true;
  });
}

async function resetAll(password) {
  if (String(password) !== ADMIN_PASSWORD) {
    throw new Error('관리자 비밀번호가 올바르지 않습니다.');
  }
  if (!db || !firestoreFns) {
    throw new Error('Firebase가 설정되지 않았습니다.');
  }

  const ref44 = firestoreFns.doc(db,COLLECTION,'mode44');
  const ref88 = firestoreFns.doc(db,COLLECTION,'mode88');

  const batch = firestoreFns.writeBatch(db);
  batch.set(ref44,{scores:[]},{merge:false});
  batch.set(ref88,{scores:[]},{merge:false});
  await batch.commit();
}

window.CNationRankingReady = (async()=>{
  try {
    await initFirebase();

    window.CNationRanking = Object.freeze({
      version:APP_VERSION,
      isConfigured:()=>Boolean(db && firestoreFns),
      getTop10,
      qualifies,
      submitScore,
      resetAll
    });

    return window.CNationRanking;
  } catch(err) {
    console.error('CNationRanking initialization failed:',err);

    window.CNationRanking = Object.freeze({
      version:APP_VERSION,
      isConfigured:()=>false,
      getTop10:async()=>[],
      qualifies:async()=>false,
      submitScore:async()=>{ throw err; },
      resetAll:async()=>{ throw err; }
    });

    return window.CNationRanking;
  }
})();
