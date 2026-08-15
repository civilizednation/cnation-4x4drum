import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTwOAC_LrrKH8CKepUOTf0pyd9qRv4y_8",
  authDomain: "cnation-project.firebaseapp.com",
  projectId: "cnation-project",
  storageBucket: "cnation-project.firebasestorage.app",
  messagingSenderId: "1004154104261",
  appId: "1:1004154104261:web:0eac4c7ded38262ae5c3ac",
  measurementId: "G-7PW1NSP5EQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const SCORE_COL = "cnation-4x4drum-scores";
const ADMIN_PW = "1257";

const MODE_INFO = [
  { key: "mode44", name: "4분의 4박자", color: "#42e5ff" },
  { key: "mode88", name: "8분의 8박자", color: "#ffd23f" }
];

window.cnationDrumCachedScores = { mode44: [], mode88: [] };

function escapeHtml(str){
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- 랭킹 미리 불러오기 ---------- */
window.cnationDrumPreloadRankings = async function(){
  try {
    const promises = MODE_INFO.map(m => getDoc(doc(db, SCORE_COL, m.key)));
    const snaps = await Promise.all(promises);
    snaps.forEach((snap, idx) => {
      const key = MODE_INFO[idx].key;
      if (snap.exists() && snap.data().scores){
        window.cnationDrumCachedScores[key] = snap.data().scores;
      }
    });
  } catch (e){
    console.error("cnation-4x4drum ranking preload error:", e);
  }
};
window.cnationDrumPreloadRankings();

/* ---------- 랭킹 화면 렌더링 (4/4, 8/8 각각 Top 10 카드) ---------- */
function renderModeCard(info){
  const scores = window.cnationDrumCachedScores[info.key] || [];
  let rows = "";
  if (scores.length > 0){
    scores.forEach((s, i) => {
      const icon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i+1) + "위";
      rows += `<tr>
        <td style="padding:7px 4px;border-bottom:1px solid #2c2447;color:#f2ecff;">${icon}</td>
        <td style="padding:7px 4px;border-bottom:1px solid #2c2447;color:#f2ecff;">${escapeHtml(s.name)}</td>
        <td style="padding:7px 4px;border-bottom:1px solid #2c2447;color:${info.color};font-weight:700;">${s.score}</td>
      </tr>`;
    });
  } else {
    rows = `<tr><td colspan="3" style="padding:16px;color:#9686b8;font-size:12px;">아직 등록된 랭킹이 없습니다</td></tr>`;
  }
  return `<div style="background:#211a35;border:1.5px solid ${info.color};border-radius:16px;padding:16px;margin-bottom:16px;">
    <div style="font-family:'Malgun Gothic','맑은 고딕',Arial,sans-serif;font-weight:700;font-size:16px;letter-spacing:.02em;color:${info.color};text-align:center;margin-bottom:10px;">${info.name}</div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="color:#9686b8;font-size:12px;">
        <th style="padding:6px 4px;border-bottom:1px solid #3a2c5c;">순위</th>
        <th style="padding:6px 4px;border-bottom:1px solid #3a2c5c;">이름</th>
        <th style="padding:6px 4px;border-bottom:1px solid #3a2c5c;">점수</th>
      </tr>
      ${rows}
    </table>
  </div>`;
}

window.cnationDrumRenderRanking = function(){
  const container = document.getElementById('rankingContent');
  if (!container) return;
  container.innerHTML = MODE_INFO.map(renderModeCard).join('');
};

window.cnationDrumShowRanking = function(){
  const startOverlay = document.getElementById('startOverlay');
  const rankingOverlay = document.getElementById('rankingOverlay');
  if (startOverlay) startOverlay.hidden = true;
  if (rankingOverlay) rankingOverlay.hidden = false;
  window.cnationDrumRenderRanking();
};

window.cnationDrumCloseRanking = function(){
  const startOverlay = document.getElementById('startOverlay');
  const rankingOverlay = document.getElementById('rankingOverlay');
  if (rankingOverlay) rankingOverlay.hidden = true;
  if (startOverlay) startOverlay.hidden = false;
};

window.cnationDrumResetRanking = async function(){
  const pw = prompt("관리자 비밀번호를 입력하세요:");
  if (pw === ADMIN_PW){
    for (const m of MODE_INFO){
      await setDoc(doc(db, SCORE_COL, m.key), { scores: [] });
      window.cnationDrumCachedScores[m.key] = [];
    }
    alert("전체 랭킹이 성공적으로 초기화되었습니다.");
    window.cnationDrumRenderRanking();
  } else if (pw !== null){
    alert("비밀번호가 틀렸습니다.");
  }
};

/* ---------- 점수 등록 ---------- */
window.cnationDrumHandleScore = function(score, modeKey){
  if (score <= 0) return;
  const topScores = window.cnationDrumCachedScores[modeKey] || [];
  let isHighScore = false;
  if (topScores.length < 10){
    isHighScore = true;
  } else {
    const minScore = topScores[topScores.length - 1].score;
    if (score > minScore) isHighScore = true;
  }
  if (isHighScore){
    window.cnationDrumPendingScore = score;
    window.cnationDrumPendingMode = modeKey;
    const input = document.getElementById('promptInput');
    if (input) input.value = '';
    const promptOverlay = document.getElementById('promptOverlay');
    if (promptOverlay) promptOverlay.hidden = false;
  }
};

window.cnationDrumSubmitName = async function(){
  const input = document.getElementById('promptInput');
  let name = input ? input.value.trim() : '';
  if (!name){ alert("이름을 입력해주세요!"); return; }
  name = name.substring(0, 20);

  const promptOverlay = document.getElementById('promptOverlay');
  if (promptOverlay) promptOverlay.hidden = true;

  try {
    const modeKey = window.cnationDrumPendingMode;
    const docRef = doc(db, SCORE_COL, modeKey);
    const snap = await getDoc(docRef);
    let latestScores = [];
    if (snap.exists() && snap.data().scores){
      latestScores = snap.data().scores;
    }
    latestScores.push({ name, score: window.cnationDrumPendingScore });
    latestScores.sort((a, b) => b.score - a.score);
    latestScores = latestScores.slice(0, 10);

    await setDoc(docRef, { scores: latestScores });
    window.cnationDrumCachedScores[modeKey] = latestScores;

    const rankingOverlay = document.getElementById('rankingOverlay');
    if (rankingOverlay && !rankingOverlay.hidden){
      window.cnationDrumRenderRanking();
    }
  } catch (e){
    console.error("cnation-4x4drum score save error:", e);
    alert("랭킹 등록 중 통신 오류가 발생했습니다. 네트워크 상태를 확인해주세요.");
  }
};

window.cnationDrumCancelName = function(){
  const promptOverlay = document.getElementById('promptOverlay');
  if (promptOverlay) promptOverlay.hidden = true;
};
