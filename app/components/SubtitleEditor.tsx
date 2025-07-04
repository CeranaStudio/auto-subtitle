"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Edit3, 
  Plus, 
  Trash2, 
  Clock,
  Type,
  CheckCircle,
  X,
  ChevronDown,
  PlayCircle
} from "lucide-react";
import { toast } from "sonner";
import { downloadSubtitles as downloadSubtitleWithFormat } from "../lib/subtitle-converter";

interface SubtitleEntry {
  id: string;
  startTime: string;
  endTime: string;
  text: string;
}

interface SubtitleEditorProps {
  subtitlesUrl: string;
  currentTime?: number;
}

export interface SubtitleEditorRef {
  getSubtitlesContent: () => string;
}

export const SubtitleEditor = forwardRef<SubtitleEditorRef, SubtitleEditorProps>(({ 
  subtitlesUrl,
  currentTime = 0
}, ref) => {
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    text: ""
  });
  const [showSubtitleFormats, setShowSubtitleFormats] = useState(false);
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add effect to handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSubtitleFormats) {
        const target = event.target as HTMLElement;
        const dropdown = target.closest('.subtitle-format-dropdown');
        if (!dropdown) {
          setShowSubtitleFormats(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSubtitleFormats]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getSubtitlesContent: () => generateVTT(subtitles)
  }));

  useEffect(() => {
    const fetchSubtitles = async () => {
      try {
        setLoading(true);
        const response = await fetch(subtitlesUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch subtitles");
        }
        
        const vttContent = await response.text();
        const parsedSubtitles = parseVTT(vttContent);
        setSubtitles(parsedSubtitles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load subtitles");
        console.error("Error loading subtitles:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubtitles();
  }, [subtitlesUrl]);

  // Effect to highlight active subtitle based on current time
  useEffect(() => {
    if (currentTime > 0 && subtitles.length > 0) {
      const activeSubtitle = subtitles.find(sub => {
        const startSeconds = timeToSeconds(sub.startTime);
        const endSeconds = timeToSeconds(sub.endTime);
        return currentTime >= startSeconds && currentTime <= endSeconds;
      });
      
      setActiveSubtitleId(activeSubtitle?.id ?? null);
      
      // Auto-scroll to active subtitle only if user is not scrolling
      if (activeSubtitle?.id && !userScrolling) {
        const element = document.getElementById(`subtitle-${activeSubtitle.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, subtitles, userScrolling]);

  // Handle user scroll
  const handleScroll = () => {
    setUserScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set timeout to reset scrolling flag
    scrollTimeoutRef.current = setTimeout(() => {
      setUserScrolling(false);
    }, 3000); // Resume auto-scroll after 3 seconds of no user scrolling
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Parse VTT format into structured data
  const parseVTT = (vttContent: string): SubtitleEntry[] => {
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
            id: currentEntry.id ?? entries.length.toString(),
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
            currentEntry = { id: line };
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
                id: currentEntry.id ?? entries.length.toString(),
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
        id: currentEntry.id ?? entries.length.toString(),
        startTime: currentEntry.startTime,
        endTime: currentEntry.endTime!,
        text: textBuffer.join(' ')
      });
    }
    
    return entries;
  };

  // Convert subtitles back to VTT format
  const generateVTT = (subtitles: SubtitleEntry[]): string => {
    let vtt = "WEBVTT\n\n";
    
    subtitles.forEach((subtitle, index) => {
      vtt += `${subtitle.id || index + 1}\n`;
      vtt += `${subtitle.startTime} --> ${subtitle.endTime}\n`;
      vtt += `${subtitle.text}\n\n`;
    });
    
    return vtt;
  };

  // Time format utilities
  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    }
    return 0;
  };

  const secondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
  };

  const formatDisplayTime = (timestamp: string): string => {
    const parts = timestamp.split(':');
    if (parts.length === 3) {
      const seconds = parts[2].split('.')[0];
      return `${parts[1]}:${seconds}`;
    }
    return timestamp;
  };

  // Edit operations
  const startEdit = (subtitle: SubtitleEntry) => {
    setEditingId(subtitle.id);
    setEditForm({
      startTime: subtitle.startTime,
      endTime: subtitle.endTime,
      text: subtitle.text
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ startTime: "", endTime: "", text: "" });
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    const updatedSubtitles = subtitles.map(sub => 
      sub.id === editingId 
        ? { ...sub, ...editForm }
        : sub
    );
    
    setSubtitles(updatedSubtitles);
    setEditingId(null);
    setEditForm({ startTime: "", endTime: "", text: "" });
    toast.success("字幕已更新");
  };

  const deleteSubtitle = (id: string) => {
    const updatedSubtitles = subtitles.filter(sub => sub.id !== id);
    setSubtitles(updatedSubtitles);
    toast.success("字幕已刪除");
  };

  const addNewSubtitle = () => {
    const lastSubtitle = subtitles[subtitles.length - 1];
    const newStartTime = lastSubtitle 
      ? secondsToTime(timeToSeconds(lastSubtitle.endTime) + 1)
      : "00:00:00.000";
    const newEndTime = secondsToTime(timeToSeconds(newStartTime) + 3);
    
    const newSubtitle: SubtitleEntry = {
      id: Date.now().toString(),
      startTime: newStartTime,
      endTime: newEndTime,
      text: "新字幕文字"
    };
    
    setSubtitles([...subtitles, newSubtitle]);
    setEditingId(newSubtitle.id);
    setEditForm({
      startTime: newSubtitle.startTime,
      endTime: newSubtitle.endTime,
      text: newSubtitle.text
    });
  };

  const handleDownload = async (format: string = 'vtt') => {
    try {
      // Get current content
      const vttContent = generateVTT(subtitles);
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const tempUrl = URL.createObjectURL(blob);
      
      // Use the converter to download in different formats
      await downloadSubtitleWithFormat(tempUrl, format);
      URL.revokeObjectURL(tempUrl);
      
      toast.success(`字幕已下載為 ${format.toUpperCase()} 格式`);
      setShowSubtitleFormats(false);
    } catch (error) {
      toast.error("下載失敗: " + (error instanceof Error ? error.message : "未知錯誤"));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex justify-center items-center h-32">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 w-24 bg-muted rounded mb-2"></div>
            <div className="h-3 w-40 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-destructive">
          <p>載入字幕時發生錯誤: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              字幕編輯器
              {currentTime > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  (播放時間: {secondsToTime(currentTime).substring(3, 8)})
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addNewSubtitle}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                新增字幕
              </Button>
              <div className="relative subtitle-format-dropdown">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubtitleFormats(!showSubtitleFormats)}
                  className="flex items-center gap-2"
                >
                  下載字幕
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {showSubtitleFormats && (
                  <div className="absolute top-full mt-1 left-0 bg-background border rounded-md shadow-lg z-10 py-1 min-w-[150px]">
                    <button
                      onClick={() => handleDownload('vtt')}
                      className="w-full px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      WebVTT (.vtt)
                    </button>
                    <button
                      onClick={() => handleDownload('srt')}
                      className="w-full px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      SubRip (.srt)
                    </button>
                    <button
                      onClick={() => handleDownload('txt')}
                      className="w-full px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      純文字 (.txt)
                    </button>
                    <button
                      onClick={() => handleDownload('ass')}
                      className="w-full px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      ASS/SSA (.ass)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Subtitles List */}
          <div 
            className="max-h-96 overflow-auto p-4 scroll-smooth"
            onScroll={handleScroll}
          >
            <div className="space-y-3">
              {subtitles.map((subtitle, index) => (
                <div key={subtitle.id} className="group">
                  {editingId === subtitle.id ? (
                    // Edit Mode
                    <div className="p-4 bg-muted/50 rounded-lg border-2 border-primary">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium">開始時間</Label>
                            <Input
                              value={editForm.startTime}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, startTime: e.target.value})}
                              placeholder="00:00:00.000"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">結束時間</Label>
                            <Input
                              value={editForm.endTime}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, endTime: e.target.value})}
                              placeholder="00:00:03.000"
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">字幕文字</Label>
                          <textarea
                            value={editForm.text}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({...editForm, text: e.target.value})}
                            placeholder="輸入字幕文字..."
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            儲存
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="flex items-center gap-1">
                            <X className="h-3 w-3" />
                            取消
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div 
                      id={`subtitle-${subtitle.id}`}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${
                        activeSubtitleId === subtitle.id 
                          ? 'bg-primary/20 border-l-4 border-primary' 
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 min-w-0">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          activeSubtitleId === subtitle.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}>
                          {activeSubtitleId === subtitle.id ? (
                            <PlayCircle className="h-3 w-3" />
                          ) : (
                            `#${index + 1}`
                          )}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className={`h-3 w-3 ${
                            activeSubtitleId === subtitle.id
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          }`} />
                          <span className={`text-xs font-mono ${
                            activeSubtitleId === subtitle.id
                              ? 'text-primary font-semibold'
                              : 'text-muted-foreground'
                          }`}>
                            {formatDisplayTime(subtitle.startTime)} → {formatDisplayTime(subtitle.endTime)}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed break-words ${
                          activeSubtitleId === subtitle.id
                            ? 'font-medium'
                            : ''
                        }`}>{subtitle.text}</p>
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(subtitle)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSubtitle(subtitle.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {index < subtitles.length - 1 && <Separator className="my-2 opacity-50" />}
                </div>
              ))}
              
              {subtitles.length === 0 && (
                <div className="text-center text-muted-foreground p-8">
                  <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">沒有字幕</p>
                  <p className="text-sm mb-4">點擊&ldquo;新增字幕&rdquo;開始建立第一條字幕</p>
                  <Button onClick={addNewSubtitle} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    新增第一條字幕
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

SubtitleEditor.displayName = 'SubtitleEditor';

export default SubtitleEditor; 