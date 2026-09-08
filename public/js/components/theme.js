/**
 * theme.js - 主题系统（亮色/暗色 + 多色主题）
 *
 * 三层配合实现零闪烁主题持久化：
 *   1. 服务端 EJS 直出 data-theme/data-color 到 <html> 标签
 *   2. JS 从 DOM 读取并同步到 Alpine store
 *   3. 切换时立即改 DOM + localStorage（游客兜底）+ fetch 同步服务器（登录用户）
 *
 * 使用方式：
 *   $store.theme.toggleDark()  - 切换暗色模式
 *   $store.theme.setColor(c)   - 切换主题色
 *   $store.theme.isDark         - 是否暗色模式
 *   $store.theme.color          - 当前主题色
 */

// ============================================================
// 主题色定义
// ============================================================
const THEME_COLORS = {
  purple: { c50:'#faf5ff',c100:'#f3e8ff',c200:'#e9d5ff',c300:'#d8b4fe',c400:'#c084fc',c500:'#a855f7',c600:'#9333ea',c700:'#7e22ce',c800:'#6b21a8',c900:'#581c87' },
  blue:   { c50:'#eff6ff',c100:'#dbeafe',c200:'#bfdbfe',c300:'#93c5fd',c400:'#60a5fa',c500:'#3b82f6',c600:'#2563eb',c700:'#1d4ed8',c800:'#1e40af',c900:'#1e3a8a' },
  green:  { c50:'#f0fdf4',c100:'#dcfce7',c200:'#bbf7d0',c300:'#86efac',c400:'#4ade80',c500:'#22c55e',c600:'#16a34a',c700:'#15803d',c800:'#166534',c900:'#14532d' },
  orange: { c50:'#fff7ed',c100:'#ffedd5',c200:'#fed7aa',c300:'#fdba74',c400:'#fb923c',c500:'#f97316',c600:'#ea580c',c700:'#c2410c',c800:'#9a3412',c900:'#7c2d12' },
  rose:   { c50:'#fff1f2',c100:'#ffe4e6',c200:'#fecdd3',c300:'#fda4af',c400:'#fb7185',c500:'#f43f5e',c600:'#e11d48',c700:'#be123c',c800:'#9f1239',c900:'#881337' }
};

// 亮色/暗色模式变量
const LIGHT_VARS = { '--bg':'#f0f2f5','--card':'#ffffff','--hdr':'rgba(255,255,255,0.8)','--bdr':'#e5e7eb','--txt':'#1f2937','--txt2':'#4b5563','--txt3':'#9ca3af' };
const DARK_VARS  = { '--bg':'#1a1a2e','--card':'#1e293b','--hdr':'rgba(26,26,46,0.9)','--bdr':'#334155','--txt':'#f1f5f9','--txt2':'#cbd5e1','--txt3':'#64748b' };

// ============================================================
// 注入 CSS 规则（仅执行一次）
// ============================================================
let _styleInjected = false;
function injectThemeCSS() {
  if (_styleInjected) return;
  _styleInjected = true;

  const css = `
    /* 主色调覆盖 Tailwind */
    .bg-primary-50  { background-color: var(--c50) !important; }
    .bg-primary-100 { background-color: var(--c100) !important; }
    .bg-primary-600 { background-color: var(--c600) !important; }
    .bg-primary-700 { background-color: var(--c700) !important; }
    .text-primary-500 { color: var(--c500) !important; }
    .text-primary-600 { color: var(--c600) !important; }
    .text-primary-700 { color: var(--c700) !important; }
    .from-primary-500 { --tw-gradient-from: var(--c500) !important; }
    .from-primary-600 { --tw-gradient-from: var(--c600) !important; }
    .to-primary-700   { --tw-gradient-to: var(--c700) !important; }
    .ring-primary-300 { --tw-ring-color: var(--c300) !important; }
    .border-primary-300 { border-color: var(--c300) !important; }

    /* 暗色模式覆盖 */
    [data-theme="dark"] body { background: var(--bg); color: var(--txt); }
    [data-theme="dark"] .bg-white { background-color: var(--card); }
    [data-theme="dark"] .bg-gray-50 { background-color: #1e293b; }
    [data-theme="dark"] .bg-gray-100 { background-color: #16213e; }
    [data-theme="dark"] .bg-gray-200 { background-color: #334155; }
    [data-theme="dark"] .border-gray-100,
    [data-theme="dark"] .border-gray-200 { border-color: var(--bdr); }
    [data-theme="dark"] .text-gray-800,
    [data-theme="dark"] .text-gray-900 { color: var(--txt); }
    [data-theme="dark"] .text-gray-600,
    [data-theme="dark"] .text-gray-700 { color: var(--txt2); }
    [data-theme="dark"] .text-gray-500 { color: var(--txt3); }
    [data-theme="dark"] .text-gray-400 { color: #64748b; }
    [data-theme="dark"] header { background-color: var(--hdr); border-color: var(--bdr); }
    [data-theme="dark"] aside { background-color: var(--card); border-color: var(--bdr); }
    [data-theme="dark"] input,
    [data-theme="dark"] textarea,
    [data-theme="dark"] select { background-color: var(--card); color: var(--txt); border-color: var(--bdr); }
    [data-theme="dark"] .skeleton { background: linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%) !important; }
    [data-theme="dark"] ::-webkit-scrollbar-thumb { background: #475569; }
    [data-theme="dark"] ::-webkit-scrollbar-track { background: #1e293b; }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// ============================================================
// API 同步（防抖 500ms）
// ============================================================
let _syncTimer = null;
function syncToServer(theme, color) {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, themeColor: color })
    }).catch(() => {});
  }, 500);
}

// ============================================================
// Alpine.js Store
// ============================================================
document.addEventListener('alpine:init', () => {
  Alpine.store('theme', {
    isDark: false,
    color: 'purple',

    /** 初始化：从服务端直出的 DOM 属性读取，回退到 localStorage */
    init() {
      injectThemeCSS();

      const html = document.documentElement;
      const serverTheme = html.getAttribute('data-theme');
      const serverColor = html.getAttribute('data-color');

      if (serverTheme && serverTheme !== 'auto') {
        // 服务端已直出具体主题
        this.isDark = serverTheme === 'dark';
        this.color = serverColor || 'purple';
      } else if (serverTheme === 'auto') {
        // auto 模式：跟随系统偏好
        this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.color = serverColor || 'purple';
      } else {
        // 游客回退：读 localStorage
        const saved = localStorage.getItem('miforum-theme');
        if (saved) {
          try {
            const { dark, color } = JSON.parse(saved);
            this.isDark = !!dark;
            this.color = color || 'purple';
          } catch (e) {
            this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          }
        } else {
          this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      }

      // 监听系统主题变化（仅 auto 模式生效）
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'auto' || !theme) {
          this.isDark = e.matches;
          this._apply();
        }
      });

      this._apply();
    },

    /** 切换暗色模式 */
    toggleDark() {
      this.isDark = !this.isDark;
      this._save();
      this._apply();
    },

    /** 设置主题色 */
    setColor(color) {
      this.color = color;
      this._save();
      this._apply();
    },

    /** 保存偏好：localStorage（游客兜底）+ 服务端同步（登录用户） */
    _save() {
      const themeValue = this.isDark ? 'dark' : 'light';
      localStorage.setItem('miforum-theme', JSON.stringify({
        dark: this.isDark,
        color: this.color
      }));
      // 同步到服务器（登录用户会存 DB，未登录 401 静默失败）
      syncToServer(themeValue, this.color);
    },

    /** 应用主题到 DOM */
    _apply() {
      const html = document.documentElement;

      // 设置 data 属性（供 CSS 选择器使用）
      html.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
      html.setAttribute('data-color', this.color);

      // 设置 CSS 变量
      const colors = THEME_COLORS[this.color] || THEME_COLORS.purple;
      Object.entries(colors).forEach(([k, v]) => html.style.setProperty('--' + k, v));

      const vars = this.isDark ? DARK_VARS : LIGHT_VARS;
      Object.entries(vars).forEach(([k, v]) => html.style.setProperty(k, v));

      // 更新 theme-color meta 标签（PWA 状态栏颜色）
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', this.isDark ? '#1a1a2e' : '#4f46e5');
    }
  });
});
