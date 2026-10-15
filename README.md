# Selector Clicker

一个 Chrome / Microsoft Edge（Manifest V3）扩展：检测符合 CSS 选择器的页面元素，并在元素可见且未禁用时自动点击。它适用于广告关闭按钮、遮罩关闭按钮等重复性页面操作。

## 安装

1. 打开 `chrome://extensions` 或 `edge://extensions`。
2. 打开“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录 `auto-element-clicker`。

## 使用

1. 在任意网页打开扩展弹窗。
2. 每行填入一个 CSS 选择器，例如：

   ```css
   .ad-close [aria-label="Close ad"] #popup .close;
   ```

3. 点击“保存设置”，然后开启右上角开关。

设置会在已打开页面中立即生效。扩展会在 DOM 更新后和设定的扫描间隔到达时检查元素；同一个元素会在冷却时间内最多点击一次。

## 测试

需要 Node.js 18 或更高版本。进入扩展目录后运行：

```powershell
npm test
```

如果系统未安装 `npm`，可直接运行：

```powershell
node --test tests/content.test.js tests/manifest.test.js
```

测试不依赖浏览器或第三方包，覆盖以下行为：

- Manifest V3 的内容脚本、弹窗和 service worker 声明。
- 页面配置加载后点击可见的匹配元素。
- 不点击隐藏、禁用或已从页面移除的元素。
- 同一元素在冷却时间内不会重复点击。
- 无效选择器不会中断其余有效选择器的扫描。
- 从扩展设置停用后不再点击元素。

## 注意

- 选择器会应用到所有普通网页，请使用足够具体的选择器，例如 `.advertisement .close`，避免误点页面中的正常按钮。
- 浏览器内部页面、扩展商店、PDF 查看器等受保护页面无法注入内容脚本。
- 当前版本不处理跨域 iframe 内的广告元素。
