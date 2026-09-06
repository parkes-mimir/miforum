/**
 * change-password.js - 修改密码弹窗组件
 *
 * 提供密码修改功能，包含密码强度检测。
 * 支持强制修改密码场景（首次登录使用默认密码时）。
 *
 * 依赖：Alpine.js, common.js (api)
 */

document.addEventListener('alpine:init', () => {
  /** 修改密码弹窗组件 */
  window.changePasswordModal = Alpine.data('changePasswordModal', () => ({
    open: false,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    passwordStrength: { score: 0, label: '', color: '#e5e7eb' },

    /** 显示弹窗并重置表单 */
    show() {
      this.open = true;
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.passwordStrength = { score: 0, label: '', color: '#e5e7eb' };
    },

    hide() {
      this.open = false;
    },

    /** 更新密码强度指示器 */
    updateStrength() {
      const p = this.newPassword;
      if (!p) { this.passwordStrength = { score: 0, label: '', color: '#e5e7eb' }; return; }
      let score = 0;
      if (p.length >= 8) score++;
      if (p.length >= 12) score++;
      const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(p)).length;
      if (types >= 2) score++;
      if (types >= 3) score++;
      const levels = [
        { label: '非常弱', color: '#ef4444' },
        { label: '弱', color: '#f97316' },
        { label: '一般', color: '#eab308' },
        { label: '强', color: '#22c55e' },
        { label: '非常强', color: '#10b981' }
      ];
      this.passwordStrength = levels[Math.min(4, score)];
    },

    /** 提交密码修改 */
    async submit() {
      if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
        Alpine.store('toast').show('请填写所有字段');
        return;
      }
      if (this.newPassword.length < 6) {
        Alpine.store('toast').show('新密码至少6位');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        Alpine.store('toast').show('两次输入的密码不一致');
        return;
      }
      if (this.oldPassword === this.newPassword) {
        Alpine.store('toast').show('新密码不能与旧密码相同');
        return;
      }

      try {
        await api('/api/change-password', {
          method: 'POST',
          body: JSON.stringify({
            old_password: this.oldPassword,
            new_password: this.newPassword
          })
        });
        Alpine.store('auth').user.force_password_change = false;
        this.hide();
        Alpine.store('toast').show('密码修改成功！');
      } catch (e) {
        Alpine.store('toast').show(e.message);
      }
    }
  }));
});

/**
 * 注入修改密码弹窗到页面
 * 在 Alpine.js 初始化前调用
 */
function injectChangePasswordModal() {
  const html = `
    <div x-data="changePasswordModal()" x-show="open" x-transition.opacity class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" style="display:none">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 fade-in">
        <div class="text-center mb-5">
          <div class="w-16 h-16 mx-auto mb-3 bg-primary-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-1">修改密码</h3>
          <p class="text-sm text-gray-500">检测到您正在使用默认密码，为了账号安全，请立即修改密码</p>
        </div>
        <div class="space-y-3 mb-5">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">当前密码</label>
            <input x-model="oldPassword" type="password" placeholder="输入当前密码" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">新密码</label>
            <input x-model="newPassword" type="password" placeholder="至少6位" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition" @input="updateStrength()">
            <div x-show="newPassword" class="mt-2">
              <div class="flex gap-1 mb-1">
                <template x-for="i in 4" :key="i">
                  <div class="h-1 flex-1 rounded-full transition-all duration-300" :style="'background-color:' + (i <= passwordStrength.score ? passwordStrength.color : '#e5e7eb')"></div>
                </template>
              </div>
              <p class="text-xs" :style="'color:' + passwordStrength.color" x-text="passwordStrength.label"></p>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">确认新密码</label>
            <input x-model="confirmPassword" type="password" placeholder="再次输入新密码" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition">
          </div>
        </div>
        <button @click="submit()" class="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition">修改密码</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}
