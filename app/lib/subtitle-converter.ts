interface SubtitleEntry {
  startTime: string;
  endTime: string;
  text: string;
}

// 時間格式轉換工具
const timeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
  }
  return 0;
};

const secondsToSRTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(3).replace('.', ',');
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
};

// 解析 VTT 格式
export const parseVTT = (vttContent: string): SubtitleEntry[] => {
  const lines = vttContent.split('\n');
  const entries: SubtitleEntry[] = [];
  let currentEntry: Partial<SubtitleEntry> = {};
  let textBuffer: string[] = [];
  let state = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'WEBVTT') continue;
    if (line === '') {
      if (textBuffer.length > 0 && currentEntry.startTime) {
        entries.push({
          startTime: currentEntry.startTime!,
          endTime: currentEntry.endTime!,
          text: textBuffer.join(' ')
        });
        textBuffer = [];
        currentEntry = {};
      }
      state = 0;
      continue;
    }

    switch (state) {
      case 0:
        if (line.includes('-->')) {
          const [startTime, endTime] = line.split('-->').map(t => t.trim());
          currentEntry = { startTime, endTime };
          state = 2;
        } else {
          state = 1;
        }
        break;
      case 1:
        if (line.includes('-->')) {
          const [startTime, endTime] = line.split('-->').map(t => t.trim());
          currentEntry = { ...currentEntry, startTime, endTime };
          state = 2;
        } else {
          currentEntry = {};
          textBuffer = [];
          state = 0;
          i--;
        }
        break;
      case 2:
        if (line.includes('-->')) {
          if (textBuffer.length > 0 && currentEntry.startTime) {
            entries.push({
              startTime: currentEntry.startTime!,
              endTime: currentEntry.endTime!,
              text: textBuffer.join(' ')
            });
          }
          textBuffer = [];
          const [startTime, endTime] = line.split('-->').map(t => t.trim());
          currentEntry = { startTime, endTime };
          state = 2;
        } else {
          textBuffer.push(line);
        }
        break;
    }
  }
  
  if (textBuffer.length > 0 && currentEntry.startTime) {
    entries.push({
      startTime: currentEntry.startTime,
      endTime: currentEntry.endTime!,
      text: textBuffer.join(' ')
    });
  }
  
  return entries;
};

// 轉換為 VTT 格式
export const convertToVTT = (entries: SubtitleEntry[]): string => {
  let vtt = "WEBVTT\n\n";
  
  entries.forEach((entry, index) => {
    vtt += `${index + 1}\n`;
    vtt += `${entry.startTime} --> ${entry.endTime}\n`;
    vtt += `${entry.text}\n\n`;
  });
  
  return vtt;
};

// 轉換為 SRT 格式
export const convertToSRT = (entries: SubtitleEntry[]): string => {
  let srt = "";
  
  entries.forEach((entry, index) => {
    // 轉換時間格式 (VTT: 00:00:00.000 -> SRT: 00:00:00,000)
    const startSeconds = timeToSeconds(entry.startTime);
    const endSeconds = timeToSeconds(entry.endTime);
    
    srt += `${index + 1}\n`;
    srt += `${secondsToSRTTime(startSeconds)} --> ${secondsToSRTTime(endSeconds)}\n`;
    srt += `${entry.text}\n\n`;
  });
  
  return srt.trim();
};

// 轉換為純文字格式
export const convertToTXT = (entries: SubtitleEntry[]): string => {
  return entries.map(entry => entry.text).join('\n\n');
};

// 轉換為 ASS 格式
export const convertToASS = (entries: SubtitleEntry[]): string => {
  let ass = `[Script Info]
Title: Converted Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  entries.forEach(entry => {
    // 轉換時間格式 (VTT: 00:00:00.000 -> ASS: 0:00:00.00)
    const convertTime = (time: string) => {
      const seconds = timeToSeconds(time);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = (seconds % 60).toFixed(2);
      return `${h}:${m.toString().padStart(2, '0')}:${s.padStart(5, '0')}`;
    };
    
    ass += `Dialogue: 0,${convertTime(entry.startTime)},${convertTime(entry.endTime)},Default,,0,0,0,,${entry.text}\n`;
  });
  
  return ass;
};

// 主要的下載函數
export const downloadSubtitles = async (subtitlesUrl: string, format: string) => {
  try {
    const response = await fetch(subtitlesUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch subtitles');
    }
    
    const vttContent = await response.text();
    const entries = parseVTT(vttContent);
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    switch (format) {
      case 'srt':
        content = convertToSRT(entries);
        filename = 'subtitles.srt';
        mimeType = 'text/plain';
        break;
      case 'txt':
        content = convertToTXT(entries);
        filename = 'subtitles.txt';
        mimeType = 'text/plain';
        break;
      case 'ass':
        content = convertToASS(entries);
        filename = 'subtitles.ass';
        mimeType = 'text/plain';
        break;
      case 'vtt':
      default:
        content = vttContent;
        filename = 'subtitles.vtt';
        mimeType = 'text/vtt';
        break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}; 