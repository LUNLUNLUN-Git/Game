# 森林保衛戰 Roguelike 倖存者

一款以森林童話美術風格打造的 2D Roguelike 倖存者遊戲。  
專案使用 React + Vite 製作，包含首頁角色選擇、即時戰鬥、等級提升、教學百科、暫停與結算畫面。

## 功能特色

- 三位森林守衛可切換遊玩
- 森林風格 HUD、首頁與升級介面
- 多種技能、角色絕招與敵人圖鑑
- 支援本機 `localhost` 開發預覽
- 支援建置成可直接點擊的單檔預覽版本

## 本機執行

### 需求

- Node.js 18 以上

### 開發模式

```bash
npm install
npm run dev
```

開啟：

`http://127.0.0.1:3000/`

### 建置

```bash
npm run build
```

建置完成後可使用：

- `dist/` 作為輸出資產
- 專案根目錄的 `index.html` 作為可直接點擊的單檔預覽入口

## 專案結構

```text
src/
  assets/        遊戲使用中的 UI 與角色素材
  game/          遊戲邏輯、渲染與音效系統
  App.tsx        主介面與畫面切換
public/          對外靜態檔案，例如 favicon
scripts/         建置與單檔預覽整理腳本
封存/            已停用但保留的圖片素材
```

## 備註

- `封存/` 僅保留未使用的圖片素材，不放程式碼與文件。
- `public/favicon.ico` 與 `public/favicon-preview.png` 為目前使用中的樹甲騎士 LOGO 圖示資產。
