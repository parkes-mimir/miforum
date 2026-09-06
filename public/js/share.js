/**
 * share.js - 帖子分享功能
 *
 * 优先使用原生 Web Share API，不支持时回退到复制链接
 */

/**
 * 分享帖子
 * @param {Object} post - { id, title, content }
 * @param {Event} event - 点击事件
 */
function sharePost(post, event) {
  if (event) event.stopPropagation();

  const postUrl = `${location.origin}/post.html?id=${post.id}`;
  const title = post.title || 'MiForum 帖子';
  const desc = (post.content || '').slice(0, 100);

  // 原生分享（移动端浏览器支持）
  if (navigator.share) {
    navigator.share({ title, text: desc, url: postUrl }).catch(() => {});
    return;
  }

  // 回退：复制链接
  copyToClipboard(postUrl).then(ok => {
    toast(ok ? '链接已复制' : '复制失败');
  });
}

/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

window.sharePost = sharePost;
