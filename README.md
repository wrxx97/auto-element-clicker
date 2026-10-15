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
   .ad-close
   [aria-label="Close ad"]
   #popup .close
   ```

3. 点击“保存设置”，然后开启右上角开关。

设置会在已打开页面中立即生效。扩展会在 DOM 更新后和设定的扫描间隔到达时检查元素；同一个元素会在冷却时间内最多点击一次。

## 注意

- 选择器会应用到所有普通网页，请使用足够具体的选择器，例如 `.advertisement .close`，避免误点页面中的正常按钮。
- 浏览器内部页面、扩展商店、PDF 查看器等受保护页面无法注入内容脚本。
- 当前版本不处理跨域 iframe 内的广告元素。
