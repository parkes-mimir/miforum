// ============================================================
// Common utility functions shared across forum, post, shop, profile
// ============================================================

/** HTML escape (XSS prevention) */
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

/** Toast notification (requires #toastContainer div) */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast-in px-4 py-2.5 bg-gray-900 text-white text-sm rounded-xl shadow-lg';
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2500);
}

/** ISO time → relative time (X分钟前 / X小时前 / YYYY年M月D日) */
function relTime(iso) {
  const d = Date.now() - new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z')).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + '分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '小时前';
  const date = new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'));
  return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
}

/** Generic JSON API fetch wrapper */
async function api(url, opts) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

/** Render avatar (img or initial letter fallback), with optional frame glow */
function avatarHtml(url, letter, size, frame) {
  const frameStyles = {
    gold: 'linear-gradient(135deg, #fde047 0%, #eab308 50%, #d97706 100%)',
    silver: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%)',
    blue: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
    purple: 'linear-gradient(135deg, #d8b4fe 0%, #a855f7 50%, #7e22ce 100%)'
  };
  let inner;
  if (url) inner = `<img src="${url}" class="${size} rounded-full object-cover">`;
  else inner = `<div class="${size} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">${esc(letter)}</div>`;
  if (frame && frameStyles[frame]) {
    return `<div style="background:${frameStyles[frame]};padding:2px;border-radius:9999px;display:inline-flex">${inner}</div>`;
  }
  return inner;
}

/** Password strength detection → { score: 0-4, label, color } */
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'bg-gray-200' };
  let score = 0;
  const checks = {
    length: password.length >= 8,
    long: password.length >= 12,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^a-zA-Z0-9]/.test(password)
  };
  if (checks.length) score++;
  if (checks.long) score++;
  const types = [checks.lowercase, checks.uppercase, checks.numbers, checks.symbols].filter(Boolean).length;
  if (types >= 2) score++;
  if (types >= 3) score++;
  score = Math.min(4, score);
  const levels = [
    { label: '非常弱', color: '#ef4444' },
    { label: '弱', color: '#f97316' },
    { label: '一般', color: '#eab308' },
    { label: '强', color: '#22c55e' },
    { label: '非常强', color: '#10b981' }
  ];
  return { score, ...levels[score] };
}

/** Check password strength and update UI bars */
function checkPasswordStrength(password, prefix) {
  const el = document.getElementById(prefix + '-strength');
  if (!password) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const { score, label, color } = getPasswordStrength(password);
  for (let i = 1; i <= 4; i++) {
    document.getElementById(prefix + '-bar-' + i).style.backgroundColor = i <= score ? color : '#e5e7eb';
  }
  const textEl = document.getElementById(prefix + '-text');
  textEl.textContent = label;
  textEl.style.color = color;
}
