/**
 * share.js - 帖子分享功能
 *
 * 优先使用原生 Web Share API（HTTPS + 现代浏览器），
 * 不支持时复制链接并提示用户使用浏览器分享菜单
 */

/**
 * 分享帖子
 * @param {Object} post - { id, title, content }
 * @param {Event} event - 点击事件
 */
function sharePost(post, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const postUrl = `${location.origin}/post.html?id=${post.id}`;
  const title = post.title || 'MiForum 帖子';
  const desc = (post.content || '').slice(0, 100);

  // 原生分享（需要 HTTPS + 现代浏览器）
  if (navigator.share) {
    navigator.share({ title, text: desc, url: postUrl })
      .then(() => {})
      .catch(err => {
        if (err.name !== 'AbortError') {
          fallbackShare(postUrl);
        }
      });
    return;
  }

  // 不支持原生分享，走降级方案
  fallbackShare(postUrl);
}

/**
 * 降级分享：复制链接 + 提示
 */
function fallbackShare(url) {
  // 先复制链接到剪贴板
  copyToClipboard(url).then(ok => {
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    const isQQ = /QQ\//i.test(navigator.userAgent);

    let msg = ok ? '链接已复制' : '';
    if (isWeChat) {
      msg += (ok ? '，' : '') + '请点击右上角 ··· 分享给朋友';
    } else if (isQQ) {
      msg += (ok ? '，' : '') + '请点击右上角 ··· 分享';
    } else {
      msg += (ok ? '，' : '') + '请粘贴到聊天窗口分享';
    }

    Alpine.store('toast').show(msg, 4000);
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
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

window.sharePost = sharePost;
