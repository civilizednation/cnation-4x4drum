// 랭킹 리셋 관리자 비밀번호를 서버(Vercel 환경변수)에서만 비교한다.
// 실제 비밀번호 값은 이 파일에도, 클라이언트로 보내는 응답에도 절대 포함되지 않는다 — true/false만 응답.
// Vercel 프로젝트 Settings > Environment Variables 에 RANKING_RESET_PASSWORD 값을 설정해야 동작한다.
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    const expected = process.env.RANKING_RESET_PASSWORD;
    if (!expected) {
        res.status(500).json({ ok: false, error: 'Server not configured' });
        return;
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    const input = typeof body?.password === 'string' ? body.password : '';

    res.status(200).json({ ok: input === expected });
};
