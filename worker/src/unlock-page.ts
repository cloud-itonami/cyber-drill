/**
 * src/unlock-page.ts — The 401 / unlock landing page served when the
 * request has no valid session cookie and no `?key=` query string.
 *
 * Single-purpose: explain the gate and provide a form to submit a key.
 * No styling framework — inline CSS keeps the response under 4 KB.
 */

export function unlockPageHtml(opts: { error?: string } = {}): string {
  const err = opts.error
    ? `<p class="err" role="alert">${escapeHtml(opts.error)}</p>`
    : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>cyber-drill — アクセスキーが必要です</title>
<style>
  :root { color-scheme: light; }
  html,body { margin:0; padding:0; background:#f0ead6; font-family:Nunito,system-ui,sans-serif; color:#26303d; }
  main { max-width: 480px; margin: 10vh auto 0; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p  { line-height: 1.6; }
  form { display:flex; gap:8px; margin-top: 24px; }
  input[type=text] {
    flex: 1; padding: 14px 16px; border-radius: 12px; border: 2px solid #cbd2dc;
    font-size: 16px; font-family: monospace; background: #fff;
  }
  button {
    padding: 14px 22px; border: none; border-radius: 12px; cursor: pointer;
    background: #ff8a3d; color: #fff; font-weight: 700; font-size: 16px;
  }
  button:active { transform: translateY(1px); }
  .err  { background: #ffe6e6; color: #c63d3d; padding: 10px 14px; border-radius: 10px; font-size: 14px; }
  .hint { margin-top: 18px; font-size: 13px; color: #6b7180; }
  footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid #d8d0b8; font-size: 12px; color: #6b7180; }
</style>
</head>
<body>
<main>
  <h1>🔐 cyber-drill — アクセスキーが必要です</h1>
  <p>このページは契約済み顧客向けの限定公開です。発行されたアクセスキーを入力してください。</p>
  ${err}
  <form method="GET" action="/">
    <input type="text" name="key" autocomplete="off" autocapitalize="off"
           spellcheck="false" placeholder="sk_drill_…" required />
    <button type="submit">解錠</button>
  </form>
  <p class="hint">キーが手元にない場合は発行元 (etzhayyim) にお問い合わせください。キーは 24 時間 cookie に保存され、以降はキーなしで再訪できます。</p>
  <footer>etzhayyim cyber-drill · 半導体・電子材料プラント サイバー攻撃 初動演習</footer>
</main>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
