// Firebase 설정 (사용자 자신의 프로젝트 정보로 교체 필요)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcd1234efgh5678"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const COLLECTION_NAME = 'cnation-4x4drum-scores';
const DOC_MODE44 = 'mode44';
const DOC_MODE88 = 'mode88';

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function loadRankings() {
  const mode44Ref = db.collection(COLLECTION_NAME).doc(DOC_MODE44);
  const mode88Ref = db.collection(COLLECTION_NAME).doc(DOC_MODE88);

  try {
    const [snap44, snap88] = await Promise.all([mode44Ref.get(), mode88Ref.get()]);
    const data44 = snap44.data()?.scores || [];
    const data88 = snap88.data()?.scores || [];

    renderRankings('mode44List', data44);
    renderRankings('mode88List', data88);
  } catch (e) {
    console.error("랭킹 로드 실패:", e);
  }
}

function renderRankings(listId, scores) {
  const list = document.getElementById(listId);
  list.innerHTML = '';

  scores.slice(0, 10).forEach((entry, index) => {
    const li = document.createElement('li');
    let medal = '';
    if (index === 0) medal = '🥇';
    else if (index === 1) medal = '🥈';
    else if (index === 2) medal = '🥉';
    li.innerHTML = `${medal} ${index + 1}. ${escapeHtml(entry.name)} - ${entry.score}`;
    list.appendChild(li);
  });
}

async function checkTopTen(mode, score) {
  const docId = mode === '44' ? DOC_MODE44 : DOC_MODE88;
  const ref = db.collection(COLLECTION_NAME).doc(docId);
  const snapshot = await ref.get();
  const data = snapshot.data();
  const scores = data?.scores || [];

  if (scores.length < 10 || score > scores[scores.length - 1].score) {
    document.getElementById(NAME_ENTRY_SCREEN_ID).classList.remove('hidden');
  }
}

async function submitScore(mode, name, score) {
  const docId = mode === '44' ? DOC_MODE44 : DOC_MODE88;
  const ref = db.collection(COLLECTION_NAME).doc(docId);
  const snapshot = await ref.get();
  const data = snapshot.data();
  const scores = data?.scores || [];

  scores.push({ name, score });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(10);

  await ref.set({ scores });
}

async function resetRankings() {
  await Promise.all([
    db.collection(COLLECTION_NAME).doc(DOC_MODE44).set({ scores: [] }),
    db.collection(COLLECTION_NAME).doc(DOC_MODE88).set({ scores: [] })
  ]);
  alert('랭킹이 초기화되었습니다.');
  location.reload();
}