import { spawn } from 'child_process';
import { VideoGenerationError } from '../utils/error-handling';
import path from 'path';

// Define video dimensions
export type VideoDimension = '480p' | '720p' | '1080p';

export const DIMENSIONS = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 }
};

// Subtitle styling options
export interface SubtitleOptions {
  position: number; // 1=left, 2=center, 3=right
  outline: number;  // 0-5, strength of outline
  fontSize: number; // Font size in pixels
}

const DEFAULT_SUBTITLE_OPTIONS: SubtitleOptions = {
  position: 2,
  outline: 3,
  fontSize: 24
};

const escapePath = (p: string) => p.replace(/:/g, '\\:');

/**
 * Generate video with subtitles using ffmpeg
 * 
 * @param audioPath Path to audio file
 * @param subtitlesPath Path to VTT subtitles
 * @param imagePath Optional path to background image
 * @param outputPath Path to output video
 * @param dimension Video dimension (480p, 720p, 1080p)
 * @param subtitleOptions Options for subtitle styling
 */
export const generateVideoWithSubtitles = async (
  audioPath: string,
  subtitlesPath: string,
  imagePath: string | null,
  outputPath: string,
  dimension: VideoDimension = '720p',
  subtitleOptions?: Partial<SubtitleOptions>
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const { width, height } = DIMENSIONS[dimension];
    const escapedSub = escapePath(path.resolve(subtitlesPath));
    
    // Combine default options with provided options
    const options = { ...DEFAULT_SUBTITLE_OPTIONS, ...subtitleOptions };
    
    // Build subtitle style string
    const subtitleStyle = [
      `FontName=Noto Sans`,
      `FontSize=${options.fontSize}`,
      `Alignment=${options.position}`, // 1=left, 2=center, 3=right
      `OutlineColour=&H80000000`, // More transparent black outline (80 instead of 40)
      `BorderStyle=3`, // Outline and shadow
      options.outline > 0 ? `Outline=${options.outline}` : '', // Outline width
      `Shadow=0`, // No shadow to avoid doubling
      `MarginV=20` // Vertical margin from bottom
    ].filter(Boolean).join(',');
    
    let filters: string;

    if (imagePath) {
      // 'fit' mode - scale to fit inside canvas with black padding
      filters = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,subtitles=${escapedSub}:force_style='${subtitleStyle}'`;
    } else {
      filters = `subtitles=${escapedSub}:force_style='${subtitleStyle}'`;
    }

    const ffmpegArgs = imagePath
      ? [
          '-loop', '1',
          '-i', imagePath,
          '-i', audioPath,
          '-vf', filters,
          '-c:v', 'libx264',
          '-tune', 'stillimage',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-pix_fmt', 'yuv420p',
          '-shortest',
          outputPath
        ]
      : [
          '-f', 'lavfi',
          '-i', `color=c=black:s=${width}x${height}:r=25`,
          '-i', audioPath,
          '-vf', filters,
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-pix_fmt', 'yuv420p',
          '-shortest',
          outputPath
        ];

    console.log('FFmpeg args:', ffmpegArgs.join(' '));

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let err = '';
    ffmpeg.stderr.on('data', d => {
      const s = d.toString();
      console.log('ffmpeg:', s);
      err += s;
    });
    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new VideoGenerationError(`FFmpeg exited ${code}: ${err}`));
    });
    ffmpeg.on('error', e => reject(new VideoGenerationError(`FFmpeg error: ${e.message}`)));
  });
}; 