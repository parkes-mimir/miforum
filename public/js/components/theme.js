/**
 * theme.js - 主题切换组件
 *
 * 管理亮色/暗色模式和主题色切换。
 * 偏好存储在 localStorage 中。
 *
 * 使用方式：
 *   $store.theme.toggleDark()  - 切换暗色模式
 *   $store.theme.setColor(c)   - 切换主题色
 *   $store.theme.isDark         - 是否暗色模式
 *   $store.theme.color          - 当前主题色
 */

document.addEventListener('alpine:init', () => {
  Alpine.store('theme', {
    isDark: false,
    color: 'purple',

    /** 初始化：从 localStorage 读取偏好，监听系统主题变化 */
    init() {
      // 读取 localStorage
      const saved = localStorage.getItem('miforum-theme');
      if (saved) {
        try {
          const { dark, color } = JSON.parse(saved);
          this.isDark = !!dark;
          this.color = color || 'blue';
        } catch (e) {}
      } else {
        // 跟随系统偏好
        this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      // 监听系统主题变化
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('miforum-theme')) {
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

    /** 保存偏好到 localStorage */
    _save() {
      localStorage.setItem('miforum-theme', JSON.stringify({
        dark: this.isDark,
        color: this.color
      }));
    },

    /** 应用主题到 DOM */
    _apply() {
      const html = document.documentElement;
      html.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
      html.setAttribute('data-color', this.color);
    }
  });
});
