/**
 * emoji-picker.js - 表情选择器组件
 *
 * 使用方法：
 *   const picker = new EmojiPicker({
 *     trigger: document.getElementById('emojiBtn'),
 *     target: document.getElementById('commentInput'),
 *     onInsert: (emoji) => { ... }
 *   });
 */

// 默认表情分类
const EMOJI_CATEGORIES = [
  { name: '😀', label: '表情', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { name: '👋', label: '手势', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏'] },
  { name: '❤️', label: '情感', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️'] },
  { name: '🐱', label: '动物', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂'] },
  { name: '🍕', label: '食物', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕'] },
  { name: '⚽', label: '活动', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','🤺','⛹️','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴'] },
  { name: '🚗', label: '旅行', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚏','🛣️','🛤️','🛞','⛽','🚨','🚥','🚦','🛑','🚧','⚓','⛵','🛶','🚤','🛳️','⛴️','🛥️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚀','🛸','🚁','🛶','⛵'] },
  { name: '💡', label: '物品', emojis: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','💡','🔦','🕯️','🪔','🧯','🛢️','💰','💴','💵','💶','💷','🪙','💸','💳','🧾'] },
  { name: '🏳️', label: '旗帜', emojis: ['🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🇺🇳','🇦🇫','🇦🇱','🇩🇿','🇦🇩','🇦🇴','🇦🇷','🇦🇲','🇦🇺','🇦🇹','🇦🇿','🇧🇸','🇧🇭','🇧🇩','🇧🇧','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇳','🇨🇴','🇰🇲','🇨🇬','🇨🇷','🇭🇷','🇨🇺','🇨🇾','🇨🇿'] }
];

// 表情 HTML 转义（用于插入到输入框）
function emojiToText(emoji) {
  return emoji;
}

// 自定义表情渲染为 HTML（图片）
function customEmojiHtml(emoji) {
  return `<img src="${emoji.image_url}" alt=":${esc(emoji.name)}:" title=":${esc(emoji.name)}:" class="inline-block w-6 h-6 align-middle" onerror="this.outerHTML=':${esc(emoji.name)}:'">`;
}

// 解析文本中的自定义表情标记 [emoji:name:url] 为 HTML
function renderEmojiInText(text) {
  if (!text) return text;
  // 转义 HTML（防止 XSS）
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // 解析自定义表情标记（支持相对路径和绝对路径）
  return escaped.replace(/\[emoji:([^\]]+?):(\/[^\]]+|https?:\/\/[^\]]+)\]/g, (match, name, url) => {
    return `<img src="${url}" style="display:inline-block;max-width:100px;max-height:100px;vertical-align:middle;border-radius:4px;cursor:pointer" title=":${name}: · 点击添加到我的表情" onclick="collectEmojiFromContent(this, '${url}', '${name}')" onerror="this.outerHTML=':${name}:'">`;
  });
}

// 添加表情到收藏
async function collectEmojiFromContent(imgEl, url, name) {
  // 从 URL 中提取 emoji ID（URL 格式: /uploads/emoji/emoji-{ts}-{rand}.ext）
  // 需要通过 API 查找对应的 emoji ID
  try {
    // 先获取公共表情列表，找到匹配的
    const { emojis } = await api('/api/emoji/public');
    const found = emojis.find(e => e.image_url === url);
    if (!found) {
      toast('表情不存在');
      return;
    }
    await api('/api/emoji/' + found.id + '/collect', { method: 'POST' });
    toast('已添加到我的表情');
    // 添加成功动画
    imgEl.style.outline = '2px solid #4f46e5';
    setTimeout(() => { imgEl.style.outline = ''; }, 1000);
  } catch (e) {
    if (e.message && e.message.includes('已收藏')) {
      toast('已经在我的表情中了');
    } else {
      toast(e.message || '添加失败');
    }
  }
}

class EmojiPicker {
  constructor(options) {
    this.trigger = options.trigger; // 触发按钮
    this.target = options.target;   // 目标输入框 (input 或 textarea)
    this.onInsert = options.onInsert || null; // 插入回调
    this.container = null;
    this.isOpen = false;
    this.currentTab = 'default';
    this.myEmojis = [];
    this.searchQuery = '';

    this.init();
  }

  init() {
    // 创建容器
    this.container = document.createElement('div');
    this.container.className = 'emoji-picker hidden';
    this.container.style.cssText = 'position:absolute;bottom:100%;left:0;z-index:50;width:320px;max-height:350px;background:white;border:1px solid #e5e7eb;border-radius:1rem;box-shadow:0 10px 25px rgba(0,0,0,.1);display:none;flex-direction:column;overflow:hidden;margin-bottom:4px;';

    // 插入到 trigger 的父元素
    this.trigger.parentElement.style.position = 'relative';
    this.trigger.parentElement.appendChild(this.container);

    // 绑定事件
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target) && e.target !== this.trigger) {
        this.close();
      }
    });

    this.render();
    this.loadCustomEmojis();
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.container.style.display = 'flex';
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.container.style.display = 'none';
  }

  async loadCustomEmojis() {
    try {
      const myData = await api('/api/emoji/my').catch(() => ({ emojis: [] }));
      this.myEmojis = myData.emojis || [];
      if (this.isOpen) this.renderContent();
    } catch (e) {}
  }

  render() {
    this.container.innerHTML = `
      <div class="flex border-b border-gray-100 flex-shrink-0">
        <button onclick="this.closest('.emoji-picker').__picker.switchTab('default')" class="flex-1 px-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 tab-default active-tab">😀 表情</button>
        <button onclick="this.closest('.emoji-picker').__picker.switchTab('mine')" class="flex-1 px-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 tab-mine">⭐ 我的</button>
      </div>
      <div class="p-2 border-b border-gray-100 flex-shrink-0">
        <input type="text" placeholder="搜索表情..." class="w-full px-3 py-1.5 bg-gray-50 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-300" oninput="this.closest('.emoji-picker').__picker.search(this.value)">
      </div>
      <div class="emoji-content flex-1 overflow-y-auto p-2"></div>
      <div class="flex-shrink-0 border-t border-gray-100 p-2">
        <button onclick="this.closest('.emoji-picker').__picker.showUpload()" class="w-full py-1.5 text-xs text-primary-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition">+ 上传自定义表情</button>
      </div>
    `;
    this.container.__picker = this;
    this.renderContent();
    this.updateTabStyles();
  }

  renderContent() {
    const content = this.container.querySelector('.emoji-content');
    if (this.currentTab === 'default') {
      this.renderDefaultEmojis(content);
    } else {
      this.renderMyEmojis(content);
    }
  }

  renderDefaultEmojis(container) {
    const q = this.searchQuery.toLowerCase();
    let html = '';
    EMOJI_CATEGORIES.forEach(cat => {
      const filtered = q ? cat.emojis.filter(() => cat.label.includes(q) || cat.name.includes(q)) : cat.emojis;
      if (filtered.length === 0) return;
      html += `<div class="mb-2"><p class="text-[10px] text-gray-400 font-medium px-1 mb-1">${cat.label}</p><div class="flex flex-wrap gap-0.5">`;
      filtered.forEach(emoji => {
        html += `<button onclick="this.closest('.emoji-picker').__picker.insert('${emoji}')" class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition text-lg" title="${emoji}">${emoji}</button>`;
      });
      html += '</div></div>';
    });
    container.innerHTML = html || '<p class="text-xs text-gray-400 text-center py-4">无结果</p>';
  }

  renderMyEmojis(container) {
    if (!this.myEmojis.length) {
      container.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">暂无自定义表情，点击下方上传</p>';
      return;
    }
    let html = '<div class="flex flex-wrap gap-1">';
    this.myEmojis.forEach(emoji => {
      html += `<button onclick="this.closest('.emoji-picker').__picker.insertCustom(${emoji.id}, '${emoji.image_url}', '${esc(emoji.name)}')" class="w-14 h-14 flex items-center justify-center rounded hover:bg-gray-100 transition p-1.5" title=":${esc(emoji.name)}:">
        <img src="${emoji.image_url}" class="max-w-full max-h-full object-contain">
      </button>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  switchTab(tab) {
    this.currentTab = tab;
    this.searchQuery = '';
    const searchInput = this.container.querySelector('input');
    if (searchInput) searchInput.value = '';
    this.renderContent();
    this.updateTabStyles();
  }

  updateTabStyles() {
    ['default', 'mine'].forEach(tab => {
      const btn = this.container.querySelector(`.tab-${tab}`);
      if (btn) {
        if (tab === this.currentTab) {
          btn.classList.add('text-primary-600', 'border-b-2', 'border-primary-600');
          btn.classList.remove('text-gray-500');
        } else {
          btn.classList.remove('text-primary-600', 'border-b-2', 'border-primary-600');
          btn.classList.add('text-gray-500');
        }
      }
    });
  }

  search(query) {
    this.searchQuery = query;
    this.renderContent();
  }

  insert(emoji) {
    if (this.target) {
      const start = this.target.selectionStart;
      const end = this.target.selectionEnd;
      const value = this.target.value;
      this.target.value = value.slice(0, start) + emoji + value.slice(end);
      this.target.selectionStart = this.target.selectionEnd = start + emoji.length;
      this.target.focus();
    }
    if (this.onInsert) this.onInsert(emoji);
  }

  insertCustom(id, url, name) {
    // 自定义表情用标记格式 [emoji:name:url]，渲染时转为图片
    const tag = `[emoji:${name}:${url}]`;
    if (this.target) {
      const start = this.target.selectionStart;
      const end = this.target.selectionEnd;
      const value = this.target.value;
      this.target.value = value.slice(0, start) + tag + value.slice(end);
      this.target.selectionStart = this.target.selectionEnd = start + tag.length;
      this.target.focus();
    }
    if (this.onInsert) this.onInsert(tag);
  }

  showUpload() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 fade-in">
        <h3 class="text-lg font-bold mb-4">上传自定义表情</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">选择图片（JPG/PNG/GIF，最大 50MB，自动压缩）</label>
            <input id="emojiUploadFile" type="file" accept="image/*" class="w-full text-sm">
          </div>
          <div id="emojiUploadPreview" class="hidden w-16 h-16 rounded-lg overflow-hidden border border-gray-200"></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button onclick="this.closest('.fixed').remove()" class="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">取消</button>
          <button onclick="this.closest('.fixed').__picker.doUpload(this.closest('.fixed'))" class="flex-1 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700">上传</button>
        </div>
      </div>
    `;
    modal.__picker = this;
    document.body.appendChild(modal);

    const fileInput = modal.querySelector('#emojiUploadFile');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) { toast('文件不能超过50MB'); fileInput.value = ''; return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = modal.querySelector('#emojiUploadPreview');
        preview.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover">`;
        preview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }

  async doUpload(modal) {
    const fileInput = modal.querySelector('#emojiUploadFile');
    if (!fileInput.files[0]) { toast('请选择图片'); return; }

    try {
      const compressed = await compressEmojiImage(fileInput.files[0]);
      await api('/api/emoji', {
        method: 'POST',
        body: JSON.stringify({ imageData: compressed })
      });
      modal.remove();
      toast('表情上传成功');
      await this.loadCustomEmojis();
      this.switchTab('mine');
    } catch (err) { toast(err.message); }
  }
}

// 导出
/**
 * 压缩表情图片
 * - GIF 动图：直接读取不压缩（保留动画）
 * - 其他图片：canvas 缩放到 300x300 以内 + 质量压缩
 */
function compressEmojiImage(file) {
  return new Promise((resolve, reject) => {
    // GIF 直接读取，不经过 canvas（会丢失动画）
    if (file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 300;
        let w = img.width;
        let h = img.height;

        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        let quality = 0.85;
        let result = canvas.toDataURL('image/jpeg', quality);

        while (result.length > 500 * 1024 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

window.EmojiPicker = EmojiPicker;
window.EMOJI_CATEGORIES = EMOJI_CATEGORIES;
window.renderEmojiInText = renderEmojiInText;
window.customEmojiHtml = customEmojiHtml;
window.collectEmojiFromContent = collectEmojiFromContent;
