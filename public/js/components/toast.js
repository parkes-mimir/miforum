/**
 * toast.js - Toast 提示组件
 *
 * 提供全局消息提示功能，支持自动消失。
 * 使用方式：Alpine.store('toast').show('消息内容')
 *
 * 依赖：Alpine.js
 */

document.addEventListener('alpine:init', () => {
  // 注册 toast 容器组件
  window.toastContainer = Alpine.data('toastContainer', () => ({
    toasts: [],

    /** 添加一条 toast 消息 */
    add(message) {
      const id = Date.now();
      this.toasts.push({ id, message });
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 2500);
    }
  }));
});

/**
 * 注入 Toast 容器到页面（自动调用）
 * 在 Alpine.js 初始化前调用，将 HTML 插入到 body 末尾
 */
function injectToast() {
  const html = `
    <div x-data="toastContainer()" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] space-y-2">
      <template x-for="t in toasts" :key="t.id">
        <div x-text="t.message" x-transition class="toast-in px-4 py-2.5 bg-gray-900 text-white text-sm rounded-xl shadow-lg"></div>
      </template>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}
