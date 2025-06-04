"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
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
  Download
} from "lucide-react";
import { toast } from "sonner";

interface SubtitleEntry {
  id: string;
  startTime: string;
  endTime: string;
  text: string;
}

interface SubtitleEditorProps {
  subtitlesUrl: string;
}

export interface SubtitleEditorRef {
  getSubtitlesContent: () => string;
}

export const SubtitleEditor = forwardRef<SubtitleEditorRef, SubtitleEditorProps>(({ 
  subtitlesUrl
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

  // Download subtitles
  const downloadSubtitles = () => {
    const vttContent = generateVTT(subtitles);
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subtitles.vtt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("字幕檔案已下載");
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadSubtitles}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                下載字幕
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Subtitles List */}
          <div className="max-h-96 overflow-auto p-4">
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
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col items-center gap-1 min-w-0">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                          #{index + 1}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatDisplayTime(subtitle.startTime)} → {formatDisplayTime(subtitle.endTime)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed break-words">{subtitle.text}</p>
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