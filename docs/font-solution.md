# 字體處理解決方案

## 問題背景

在 macOS 系統上使用 FFmpeg 處理字幕時，遇到以下問題：
- FFmpeg 嘗試訪問系統保護的字體文件（如 PingFangUI.ttc）
- 這些字體位於 `/System/Library/PrivateFrameworks/FontServices.framework/Resources/Reserved/` 目錄
- 該目錄受到系統保護，即使有管理員權限也無法訪問
- 導致 FFmpeg 反覆嘗試訪問並產生大量錯誤日誌

## 解決方案

### 1. 使用可靠的系統默認字體

將所有字幕渲染統一使用 `Helvetica` 字體，該字體：
- 在 macOS 系統中位於可訪問的 `/System/Library/Fonts/` 目錄
- 是系統默認字體，幾乎所有系統都有
- FFmpeg 可以正常訪問和使用

### 2. 簡化字體選擇邏輯

移除了複雜的字體掃描和選擇邏輯：
- 不再嘗試從 `public/fonts` 目錄加載自定義字體
- 不再嘗試訪問受保護的系統字體
- 直接指定 Helvetica 作為字體名稱，讓 FFmpeg 自動處理

### 3. 實現細節

在 `video-processing.ts` 中：
```typescript
const subtitleFilter = `subtitles=${escapedPath}:force_style='FontName=Helvetica,FontSize=${options.fontSize},...'`;
```

在 API route 中也做了相同的修改，確保一致性。

## 優點

1. **可靠性提升**：避免了權限問題和字體訪問錯誤
2. **性能提升**：減少了不必要的字體文件掃描和錯誤重試
3. **跨平台兼容**：Helvetica 在大多數系統上都可用
4. **維護簡單**：無需管理自定義字體文件

## 如果需要自定義字體

如果將來需要使用自定義字體，建議：
1. 將字體文件放在 `public/fonts` 目錄
2. 使用 `.ttf` 格式而非 `.ttc` 格式
3. 確保字體文件有正確的讀取權限
4. 在 FFmpeg 命令中使用 `fontsdir` 參數指定字體目錄 