// ================================================================
// cnation 4x4 DRUM – Firebase Firestore 랭킹 모듈
// Version 1.0.4
// ================================================================

(function() {
    'use strict';

    // ------------------------------------------------------------
    // 1. Firebase 설정 (사용자 환경에 맞게 수정)
    // ------------------------------------------------------------
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    // ------------------------------------------------------------
    // 2. Firebase 초기화 (CDN 사용)
    // ------------------------------------------------------------
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK가 로드되지 않았습니다. CDN을 추가하세요.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    const COLLECTION = 'cnation-4x4drum-scores';
    const DOC_44 = 'mode44';
    const DOC_88 = 'mode88';
    const TOP_N = 10;

    // ------------------------------------------------------------
    // 3. 내부 헬퍼
    // ------------------------------------------------------------
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // ------------------------------------------------------------
    // 4. 랭킹 로드 (UI 표시)
    // ------------------------------------------------------------
    window.loadRankingFirebase = function() {
        const container = document.getElementById('ranking-content');
        container.innerHTML = '<div style="text-align:center;color:#8a7aaa;">로딩 중...</div>';

        Promise.all([
            db.collection(COLLECTION).doc(DOC_44).get(),
            db.collection(COLLECTION).doc(DOC_88).get()
        ]).then(([snap44, snap88]) => {
            const data44 = snap44.exists ? snap44.data() : { scores: [] };
            const data88 = snap88.exists ? snap88.data() : { scores: [] };

            let html = '';

            // 4/4
            html += '<div class="rank-mode-title">🎵 4/4 모드</div>';
            html += buildRankTable(data44.scores || []);

            // 8/8
            html += '<div class="rank-mode-title" style="margin-top:16px;">🎵 8/8 모드</div>';
            html += buildRankTable(data88.scores || []);

            container.innerHTML = html;
        }).catch(err => {
            console.error('랭킹 로드 실패:', err);
            container.innerHTML = '<div style="text-align:center;color:#ff4763;">랭킹을 불러오지 못했습니다.</div>';
        });
    };

    function buildRankTable(scores) {
        if (!scores || scores.length === 0) {
            return '<div class="rank-empty">아직 기록이 없습니다.</div>';
        }

        // 점수 내림차순 정렬
        const sorted = [...scores].sort((a, b) => b.score - a.score);
        const top = sorted.slice(0, TOP_N);

        let html = '<div class="rank-table-wrap"><table class="rank-table"><thead><tr>' +
            '<th>순위</th><th>이름</th><th style="text-align:right;">점수</th>' +
            '</tr></thead><tbody>';

        top.forEach((item, i) => {
            const rank = i + 1;
            let medal = '';
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';
            else medal = '#' + rank;

            const name = escapeHtml(item.name || '익명');
            const score = item.score || 0;

            html += '<tr>' +
                '<td class="rank-num">' + medal + '</td>' +
                '<td class="rank-name">' + name + '</td>' +
                '<td class="rank-score">' + score + '</td>' +
                '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    }

    // ------------------------------------------------------------
    // 5. 랭킹 체크 (게임 종료 시 호출)
    // ------------------------------------------------------------
    window.checkRankingFirebase = function(mode, score) {
        const docId = (mode === '44') ? DOC_44 : DOC_88;

        db.collection(COLLECTION).doc(docId).get().then(snap => {
            let scores = [];
            if (snap.exists) {
                const data = snap.data();
                scores = data.scores || [];
            }

            // Top 10 진입 가능 여부
            const sorted = [...scores].sort((a, b) => b.score - a.score);
            const top = sorted.slice(0, TOP_N);

            let canEnter = false;
            if (top.length < TOP_N) {
                canEnter = true;
            } else {
                const lowest = top[top.length - 1];
                if (score > lowest.score) {
                    canEnter = true;
                }
            }

            if (canEnter) {
                // 닉네임 입력 필요
                if (typeof window.__game !== 'undefined' && window.__game.onRankingCheck) {
                    window.__game.onRankingCheck(true);
                }
                // 임시 저장
                window.__pendingRank = { mode, score, docId };
            } else {
                // 진입 실패
                if (typeof window.__game !== 'undefined' && window.__game.onRankingCheck) {
                    window.__game.onRankingCheck(false);
                }
            }
        }).catch(err => {
            console.error('랭킹 체크 실패:', err);
        });
    };

    // ------------------------------------------------------------
    // 6. 랭킹 제출 (닉네임 입력 후)
    // ------------------------------------------------------------
    window.submitRankingFirebase = function(name) {
        const pending = window.__pendingRank;
        if (!pending) {
            alert('등록할 랭킹 정보가 없습니다.');
            return;
        }

        const { mode, score, docId } = pending;

        db.collection(COLLECTION).doc(docId).get().then(snap => {
            let scores = [];
            if (snap.exists) {
                const data = snap.data();
                scores = data.scores || [];
            }

            // 새 항목 추가
            scores.push({ name: name.trim(), score: score });

            // 점수 내림차순 정렬 후 Top 10 유지
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, TOP_N);

            // 저장
            return db.collection(COLLECTION).doc(docId).set({ scores });
        }).then(() => {
            alert('✨ 랭킹 등록 완료!');
            window.__pendingRank = null;
            // 닉네임 오버레이 닫기
            document.getElementById('nick-overlay').classList.remove('active');
            // 게임오버 화면 표시
            if (typeof window.__game !== 'undefined' && window.__game.state.status === 'gameover') {
                document.getElementById('gameover-overlay').classList.add('active');
            } else {
                window.__game.goToMenu();
            }
        }).catch(err => {
            console.error('랭킹 저장 실패:', err);
            alert('랭킹 저장에 실패했습니다.');
        });
    };

    // ------------------------------------------------------------
    // 7. 랭킹 초기화 (관리자)
    // ------------------------------------------------------------
    window.resetRankingFirebase = function() {
        if (!confirm('정말로 모든 랭킹 데이터를 초기화하시겠습니까?')) return;

        Promise.all([
            db.collection(COLLECTION).doc(DOC_44).set({ scores: [] }),
            db.collection(COLLECTION).doc(DOC_88).set({ scores: [] })
        ]).then(() => {
            alert('✅ 랭킹이 초기화되었습니다.');
            // 랭킹 화면 새로고침
            if (typeof window.loadRankingFirebase === 'function') {
                window.loadRankingFirebase();
            }
        }).catch(err => {
            console.error('초기화 실패:', err);
            alert('초기화에 실패했습니다.');
        });
    };

    console.log('Firebase 랭킹 모듈 로드 완료 (v1.0.4)');
})();