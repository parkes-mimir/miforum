/**
 * lightbox.js - 图片查看器组件
 *
 * 提供全屏图片查看功能，点击背景或关闭按钮关闭。
 * 使用 Alpine.store('lightbox') 控制显示状态。
 *
 * 依赖：Alpine.js
 */

document.addEventListener('alpine:init', () => {
  /** Lightbox 状态存储 */
  Alpine.store('lightbox', { open: false, src: '' });
});

/**
 * 打开图片查看器
 * @param {string} url - 图片 URL
 */
function openLightbox(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  Alpine.store('lightbox').src = url;
  Alpine.store('lightbox').open = true;
}

/**
 * 注入图片查看器到页面
 * 在 Alpine.js 初始化前调用
 */
function injectLightbox() {
  const html = `
    <div x-data="{ open: false, src: '' }" x-show="$store.lightbox.open" x-transition.opacity @click="$store.lightbox.open=false" @keydown.escape.window="$store.lightbox.open=false" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" style="display:none" role="dialog" aria-modal="true" aria-label="图片预览">
      <button @click="$store.lightbox.open=false" aria-label="关闭" class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
      <img class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" :src="$store.lightbox.src" @click.stop alt="预览图片">
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}
