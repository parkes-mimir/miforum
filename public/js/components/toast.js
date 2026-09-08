/**
 * toast.js - Toast 提示组件
 *
 * 提供全局消息提示功能，支持自动消失。
 * 使用方式：Alpine.store('toast').show('消息内容')
 *
 * 依赖：Alpine.js
 */

document.addEventListener('alpine:init', () => {
  // toast store 已在 stores/app.js 中定义
  // 此文件仅提供 injectToast() 注入函数
});

/**
 * 注入 Toast 容器到页面（自动调用）
 * 在 Alpine.js 初始化前调用，将 HTML 插入到 body 末尾
 * 使用 $store.toast 的 message/visible 属性
 */
function injectToast() {
  const html = `
    <div x-data class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] space-y-2">
      <div x-show="$store.toast.visible" x-text="$store.toast.message" x-transition class="toast-in px-4 py-2.5 bg-gray-900 text-white text-sm rounded-xl shadow-lg" role="alert" aria-live="polite"></div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}
