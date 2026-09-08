/**
 * auth-modal.js - 登录/注册弹窗组件
 *
 * 提供用户认证弹窗，支持登录和注册两个标签页。
 * 使用方式：x-data="authModal()" 或通过 Alpine.store('auth').showLogin = true 触发
 *
 * 依赖：Alpine.js, common.js (api, getPasswordStrength)
 */

document.addEventListener('alpine:init', () => {
  /** 认证弹窗组件 */
  window.authModal = Alpine.data('authModal', () => ({
    open: false,
    tab: 'login',
    loginEmail: '',
    loginPassword: '',
    regUsername: '',
    regEmail: '',
    regPassword: '',
    regCode: '',
    codeCooldown: 0,
    _codeTimer: null,

    /** 初始化：监听 showLogin 事件 */
    init() {
      this.$watch('$store.auth.showLogin', (val) => {
        if (val) { this.open = true; Alpine.store('auth').showLogin = false; }
      });
    },

    show() { this.open = true; },
    hide() { this.open = false; },

    /** 注册密码强度计算 */
    get regPasswordStrength() {
      return getPasswordStrength(this.regPassword);
    },

    /** 执行登录 */
    async doLogin() {
      if (!this.loginEmail.trim() || !this.loginPassword) { Alpine.store('toast').show('请填写邮箱和密码'); return; }
      try {
        const { user } = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: this.loginEmail.trim(), password: this.loginPassword }) });
        Alpine.store('auth').user = user;
        this.hide();
        Alpine.store('toast').show('登录成功！');
        window.dispatchEvent(new CustomEvent('auth-changed'));
        if (user.force_password_change) {
          setTimeout(() => { const el = document.querySelector('[x-data*="changePasswordModal"]'); if (el && el.__x) el.__x.$data.show(); }, 500);
        }
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    /** 执行注册 */
    async doRegister() {
      if (!this.regUsername.trim() || !this.regEmail.trim() || !this.regPassword || !this.regCode.trim()) { Alpine.store('toast').show('请填写所有字段'); return; }
      if (this.regPassword.length < 6) { Alpine.store('toast').show('密码至少6位'); return; }
      try {
        const { user } = await api('/api/register', { method: 'POST', body: JSON.stringify({ username: this.regUsername.trim(), email: this.regEmail.trim(), password: this.regPassword, code: this.regCode.trim() }) });
        Alpine.store('auth').user = user;
        this.hide();
        Alpine.store('toast').show('注册成功！');
        window.dispatchEvent(new CustomEvent('auth-changed'));
      } catch (e) { Alpine.store('toast').show(e.message); }
    },

    /** 发送验证码 */
    async sendCode() {
      const email = this.regEmail.trim();
      if (!email) { Alpine.store('toast').show('请先填写邮箱'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Alpine.store('toast').show('邮箱格式不正确'); return; }
      if (this.codeCooldown > 0) return;
      try {
        await api('/api/send-code', { method: 'POST', body: JSON.stringify({ email, type: 'register' }) });
        Alpine.store('toast').show('验证码已发送到邮箱');
        this.codeCooldown = 60;
        this._codeTimer = setInterval(() => {
          this.codeCooldown--;
          if (this.codeCooldown <= 0) clearInterval(this._codeTimer);
        }, 1000);
      } catch (e) { Alpine.store('toast').show(e.message); }
    }
  }));
});

/**
 * 注入登录/注册弹窗到页面
 * 在 Alpine.js 初始化前调用
 */
function injectAuthModal() {
  const html = `
    <div x-data="authModal()" x-show="open" x-transition.opacity @click.self="hide()" @keydown.escape.window="if(open) hide()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" style="display:none" role="dialog" aria-modal="true" aria-label="登录或注册">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 fade-in">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-bold" id="auth-modal-title">欢迎</h2>
          <button @click="hide()" aria-label="关闭" class="p-1 rounded-lg hover:bg-gray-100"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="flex mb-5 bg-gray-100 rounded-xl p-1">
          <button class="flex-1 py-2 text-sm font-medium rounded-lg transition" @click="tab='login'" :class="tab==='login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'">登录</button>
          <button class="flex-1 py-2 text-sm font-medium rounded-lg transition" @click="tab='register'" :class="tab==='register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'">注册</button>
        </div>
        <div class="space-y-3" x-show="tab==='login'">
          <input class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition" x-model="loginEmail" type="email" placeholder="you@example.com" @keydown.enter="doLogin()">
          <input class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition" x-model="loginPassword" type="password" placeholder="输入密码" @keydown.enter="doLogin()">
          <button @click="doLogin()" class="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition">登录</button>
        </div>
        <div class="space-y-3" x-show="tab==='register'">
          <input class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition" x-model="regUsername" type="text" placeholder="你的昵称">
          <input class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition" x-model="regEmail" type="email" placeholder="you@example.com">
          <input class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition" x-model="regPassword" type="password" placeholder="至少 6 位">
          <div class="mt-2" x-show="regPassword">
            <div class="flex gap-1 mb-1">
              <template x-for="i in 4" :key="i">
                <div class="h-1 flex-1 rounded-full transition-all duration-300" :style="'background-color:' + (i <= regPasswordStrength.score ? regPasswordStrength.color : '#e5e7eb')"></div>
              </template>
            </div>
            <p class="text-xs" :style="'color:' + regPasswordStrength.color" x-text="regPasswordStrength.label"></p>
          </div>
          <div class="flex gap-2">
            <input class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition" x-model="regCode" type="text" placeholder="输入验证码" maxlength="6" @keydown.enter="doRegister()">
            <button class="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition whitespace-nowrap" @click="sendCode()" :disabled="codeCooldown > 0" x-text="codeCooldown > 0 ? codeCooldown + 's' : '发送验证码'"></button>
          </div>
          <button @click="doRegister()" class="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition">注册</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}
