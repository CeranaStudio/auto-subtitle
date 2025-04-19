"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ClockIcon, Type } from "lucide-react";

interface SubtitleEntry {
  id: string;
  startTime: string;
  endTime: string;
  text: string;
}

interface SubtitlesViewerProps {
  subtitlesUrl: string;
}

export const SubtitlesViewer = ({ subtitlesUrl }: SubtitlesViewerProps) => {
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    // State machine: 0: Expecting ID or Timestamp, 1: Expecting Timestamp, 2: Expecting Text
    let state = 0; 

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header or reset state on blank lines between cues
      if (line === 'WEBVTT') continue;
      if (line === '') {
        if (textBuffer.length > 0 && currentEntry.startTime) {
           // End of a cue block due to blank line
          entries.push({
            id: currentEntry.id ?? entries.length.toString(), // Use parsed ID or generate one
            startTime: currentEntry.startTime!,
            endTime: currentEntry.endTime!,
            text: textBuffer.join(' ')
          });
          textBuffer = [];
          currentEntry = {};
        }
        state = 0; // Expecting ID or Timestamp after blank line
        continue;
      }

      switch (state) {
        case 0: // Expecting ID or Timestamp
          if (line.includes('-->')) {
            // Found timestamp line directly
            const [startTime, endTime] = line.split('-->').map(t => t.trim());
            currentEntry = { startTime, endTime };
            state = 2; // Expecting text next
          } else {
            // Assume it's an ID line
            currentEntry = { id: line };
            state = 1; // Expecting timestamp next
          }
          break;
        case 1: // Expecting Timestamp (must follow ID)
          if (line.includes('-->')) {
            const [startTime, endTime] = line.split('-->').map(t => t.trim());
            currentEntry = { ...currentEntry, startTime, endTime };
            state = 2; // Expecting text next
          } else {
            // Invalid format: Expected timestamp after ID, but got something else. Reset.
            console.warn("VTT Parse Warning: Expected timestamp after ID line, got:", line);
            currentEntry = {};
            textBuffer = [];
            state = 0;
             // Re-evaluate the current line in state 0
             i--; 
          }
          break;
        case 2: // Expecting Text
          if (line.includes('-->')) {
             // Found a new timestamp unexpectedly, means previous cue ended without blank line
             if (textBuffer.length > 0 && currentEntry.startTime) {
                entries.push({
                   id: currentEntry.id ?? entries.length.toString(),
                   startTime: currentEntry.startTime!,
                   endTime: currentEntry.endTime!,
                   text: textBuffer.join(' ')
                });
            }
            textBuffer = [];
            // Process the new timestamp line
            const [startTime, endTime] = line.split('-->').map(t => t.trim());
            // Check if the previous line might have been an ID for *this* cue
            const potentialIdLine = lines[i-1]?.trim();
            if (potentialIdLine && !potentialIdLine.includes('-->') && potentialIdLine !== '' && lines[i-2]?.trim() === '') {
               currentEntry = { id: potentialIdLine, startTime, endTime };
            } else {
               currentEntry = { startTime, endTime }; // No ID found or format unexpected
            }
            state = 2; // Still expecting text for the *new* cue
          } else {
            // Append text line to buffer
            textBuffer.push(line);
            // State remains 2, expecting more text or blank line
          }
          break;
      }
    }
    
    // Add the very last entry if exists
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

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    // If format is already HH:MM:SS.mmm, convert to MM:SS format
    if (timestamp.includes(':')) {
      const parts = timestamp.split(':');
      if (parts.length === 3) {
        const seconds = parts[2].split('.')[0];
        return `${parts[1]}:${seconds}`;
      }
    }
    return timestamp;
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
          <p>Error loading subtitles: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-md flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Subtitles
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="timeline">
          <div className="px-4">
            <TabsList className="w-full max-w-[400px] mb-2">
              <TabsTrigger value="timeline" className="flex-1">
                <ClockIcon className="mr-2 h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-1">
                <Type className="mr-2 h-4 w-4" />
                Text
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="timeline" className="p-0">
            <div className="max-h-[300px] overflow-y-auto p-4">
              {subtitles.length > 0 ? (
                <div className="space-y-3">
                  {subtitles.map((subtitle, index) => (
                    <div key={subtitle.id} className="group">
                      <div className="flex items-start gap-2">
                        <div className="text-xs font-mono text-muted-foreground pt-1 w-16 shrink-0">
                          {formatTime(subtitle.startTime)}
                        </div>
                        <div className="flex-1 rounded p-2 text-sm bg-muted/30 group-hover:bg-muted transition-colors">
                          {subtitle.text}
                        </div>
                      </div>
                      {index < subtitles.length - 1 && <Separator className="my-2 opacity-50" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-4">No subtitles found</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="text" className="p-0">
            <div className="max-h-[300px] overflow-y-auto p-4">
              {subtitles.length > 0 ? (
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {subtitles.map(subtitle => subtitle.text).join('\n\n')}
                </p>
              ) : (
                <p className="text-center text-muted-foreground p-4">No subtitles found</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SubtitlesViewer; 