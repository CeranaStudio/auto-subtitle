import { OpenAI } from 'openai';
import fs from 'fs';
import { TranscriptionError } from '../utils/error-handling';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define interface for transcription segments
interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

// Define interface for text chunks
interface TextChunk {
  text: string;
  start: number;
  end: number;
}

/**
 * Transcribe audio file using OpenAI's Whisper API
 * 
 * @param audioPath Path to audio file
 * @returns VTT format subtitles
 */
export const transcribeAudio = async (audioPath: string): Promise<string> => {
  try {
    // First get a JSON transcription with timestamps for better control
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      // Instruct Whisper to use "am"/"pm" instead of "a.m."/"p.m." to avoid mid‑sentence dots being treated as sentence breaks
      prompt: 'When transcribing, prefer using "am" and "pm" instead of "a.m." or "p.m.". Keep contractions and quotation marks intact.'
    });
    
    // Extract segments and full text with narrowed typing
    const segments = (transcription as { segments?: TranscriptionSegment[] }).segments ?? [];
    const fullText = (transcription as { text?: string }).text ?? '';
    
    // Convert the JSON transcription to optimized VTT
    return createOptimizedVTT(segments, fullText);
  } catch (error) {
    if (error instanceof Error) {
      throw new TranscriptionError(`Failed to transcribe audio: ${error.message}`);
    }
    throw new TranscriptionError('Failed to transcribe audio: Unknown error');
  }
};

/**
 * Create optimized VTT subtitles from transcription segments
 * 
 * @param segments Transcription segments from Whisper API
 * @param fullText Full transcription text (used as fallback)
 * @returns VTT format subtitles
 */
function createOptimizedVTT(segments: TranscriptionSegment[], fullText: string): string {
  if (!segments || segments.length === 0) {
    // Fallback: split the full text into chunks of approximately 50 characters
    return createBasicVTT(fullText);
  }
  
  let vtt = 'WEBVTT\n\n';
  let segmentIndex = 1;
  
  // Process each segment and create smaller chunks for better readability
  segments.forEach(segment => {
    if (!segment.start || !segment.end || !segment.text) return;
    
    const text = segment.text.trim();
    const duration = segment.end - segment.start;
    const startTime = segment.start;
    
    if (text.length <= 70 || duration < 4.0) {
      // Short enough, keep as is
      vtt += formatVTTSegment(segmentIndex++, startTime, segment.end, text);
    } else {
      // Split into smaller chunks based on punctuation and length
      const chunks = splitTextIntoChunks(text, duration, startTime);
      chunks.forEach(chunk => {
        vtt += formatVTTSegment(segmentIndex++, chunk.start, chunk.end, chunk.text);
      });
    }
  });
  
  return vtt;
}

/**
 * Create a basic VTT file by splitting text into even chunks
 * Fallback when segment information is not available
 */
function createBasicVTT(fullText: string): string {
  let vtt = 'WEBVTT\n\n';
  const words = fullText.split(' ');
  const chunkSize = 7; // ~7 words per line
  let index = 1;
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    const startTime = i / words.length * 100; // Approximation
    const endTime = Math.min((i + chunkSize) / words.length * 100, 100); // Approximation
    
    vtt += formatVTTSegment(
      index++, 
      startTime, 
      endTime, 
      chunk
    );
  }
  
  return vtt;
}

/**
 * Split longer text into smaller, more readable chunks
 */
function splitTextIntoChunks(text: string, duration: number, startTime: number): TextChunk[] {
  const chunks: TextChunk[] = [];

  // 1. Sanitize common time abbreviations so they do not contain dots (e.g. p.m. -> pm)
  const sanitized = text.replace(/\b([AaPp])\.?m\./g, (_, p) => `${p.toLowerCase()}m`);

  // 2. Split on punctuation marks that usually denote sentence or phrase boundaries.
  //    We split on '.', '?', '!' and ',' followed by whitespace.
  //    Apostrophes (') and quotes (") are intentionally ignored.
  const rawChunks = sanitized.split(/(?<=[.!?,])\s+/);

  if (rawChunks.length === 1) {
    // No punctuation was found; fall back to previous word/char splitting strategy.
    return legacyChunking(sanitized, duration, startTime);
  }

  const timePerCharacter = duration / sanitized.length;
  let currentStart = startTime;

  rawChunks.forEach(sentence => {
    const trimmed = sentence.trim();
    if (!trimmed) return;

    // If the sentence is very long, further split by character count (~60 chars)
    if (trimmed.length > 60) {
      const subChunks = legacyChunking(trimmed, trimmed.length * timePerCharacter, currentStart);
      subChunks.forEach(sc => chunks.push(sc));
      // Update currentStart based on the last subChunk
      if (subChunks.length > 0) currentStart = subChunks[subChunks.length - 1].end;
    } else {
      const sentenceDuration = trimmed.length * timePerCharacter;
      const endTime = currentStart + sentenceDuration;
      chunks.push({
        text: trimmed,
        start: currentStart,
        end: endTime
      });
      currentStart = endTime;
    }
  });

  return chunks;
}

// Helper: original character-count splitting to use as fallback or further subdivision
function legacyChunking(text: string, duration: number, startTime: number): TextChunk[] {
  const maxCharsPerLine = 60;
  const words = text.split(' ');
  const timePerCharacter = duration / text.length;

  const result: TextChunk[] = [];
  let currentChunk = '';
  let currentStart = startTime;
  let charCount = 0;

  words.forEach((word, idx) => {
    if (currentChunk && (charCount + word.length + 1) > maxCharsPerLine) {
      const chunkDuration = charCount * timePerCharacter;
      const endTime = currentStart + chunkDuration;
      result.push({ text: currentChunk.trim(), start: currentStart, end: endTime });
      currentStart = endTime;
      currentChunk = word;
      charCount = word.length;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + word;
      charCount += (currentChunk ? 1 : 0) + word.length;
    }

    // Final flushing
    if (idx === words.length - 1 && currentChunk) {
      result.push({ text: currentChunk.trim(), start: currentStart, end: startTime + duration });
    }
  });

  return result;
}

/**
 * Format a VTT segment with proper timestamp formatting
 */
function formatVTTSegment(index: number, start: number, end: number, text: string): string {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };
  
  return `${index}\n${formatTime(start)} --> ${formatTime(end)}\n${text}\n\n`;
} 