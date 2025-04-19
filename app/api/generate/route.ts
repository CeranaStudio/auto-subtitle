import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { spawn } from 'child_process';

import { 
  isOpenAIKeyConfigured, 
  ApiKeyMissingError
} from '@/app/utils/error-handling';

import {
  saveFileToDisk,
  createDirectories,
  cleanupDirectories,
  generatePaths
} from '@/app/lib/file-processing';

import { generateVideoWithSubtitles, VideoDimension } from '@/app/lib/video-processing';
import { transcribeAudio } from '@/app/lib/transcription';

export async function POST(request: NextRequest) {
  // Create unique ID for this request
  const requestId = uuidv4();
  const { uploadDir, outputDir } = generatePaths(requestId);
  
  try {
    // Check if OpenAI API key is configured
    if (!isOpenAIKeyConfigured()) {
      throw new ApiKeyMissingError();
    }

    const formData = await request.formData();
    const mode = formData.get('mode') as string || 'audio';
    
    const dimensionValue = formData.get('dimension') as string || '720p';
    
    // Get subtitle settings
    const subtitlePosition = parseInt(formData.get('subtitlePosition') as string || '2');
    const subtitleOutline = parseInt(formData.get('subtitleOutline') as string || '3');
    const subtitleSize = parseInt(formData.get('subtitleSize') as string || '24');
    
    // Validate dimension
    const dimension = ['480p', '720p', '1080p'].includes(dimensionValue) 
      ? dimensionValue as VideoDimension 
      : '720p';
    
    // Create directories
    await createDirectories(uploadDir, outputDir);
    
    try {
      let audioPath = '';
      let subtitlesPath = '';
      let imagePath: string | null = null;
      
      if (mode === 'audio') {
        // Audio + Image mode
        const audioFile = formData.get('audio') as File;
        const imageFile = formData.get('image') as File | null;
        
        if (!audioFile) {
          return NextResponse.json(
            { error: 'Audio file is required' },
            { status: 400 }
          );
        }
        
        // Validate audio file size
        if (audioFile.size > 50 * 1024 * 1024) { // 50MB limit
          throw new Error('Audio file is too large. Maximum size is 50MB.');
        }

        // Save audio file
        const audioExt = path.extname(audioFile.name) || '.mp3';
        audioPath = await saveFileToDisk(
          audioFile,
          uploadDir,
          `audio${audioExt}`
        );

        // Save image file if provided
        if (imageFile) {
          const imageExt = path.extname(imageFile.name) || '.jpg';
          imagePath = await saveFileToDisk(
            imageFile,
            uploadDir,
            `image${imageExt}`
          );
        }
        
        // Transcribe the audio file
        const transcription = await transcribeAudio(audioPath);

        // Save the generated subtitles
        subtitlesPath = path.join(uploadDir, 'subtitles.vtt');
        await fs.promises.writeFile(subtitlesPath, transcription);
      } else {
        // Video mode
        const videoFile = formData.get('video') as File;
        
        if (!videoFile) {
          return NextResponse.json(
            { error: 'Video file is required' },
            { status: 400 }
          );
        }

        // Validate video file size
        if (videoFile.size > 100 * 1024 * 1024) { // 100MB limit
          throw new Error('Video file is too large. Maximum size is 100MB.');
        }

        // Save video file
        const videoExt = path.extname(videoFile.name) || '.mp4';
        const videoPath = await saveFileToDisk(
          videoFile,
          uploadDir,
          `video${videoExt}`
        );
        
        // Extract audio from video
        audioPath = path.join(uploadDir, 'extracted_audio.mp3');
        
        // Run ffmpeg to extract audio
        await new Promise<void>((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-q:a', '0',
            '-map', 'a',
            audioPath
          ]);
          
          ffmpeg.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Failed to extract audio from video (code ${code})`));
          });
          
          ffmpeg.on('error', err => {
            reject(new Error(`Failed to extract audio: ${err.message}`));
          });
        });
        
        // Transcribe the extracted audio
        const transcription = await transcribeAudio(audioPath);

        // Save the generated subtitles
        subtitlesPath = path.join(uploadDir, 'subtitles.vtt');
        await fs.promises.writeFile(subtitlesPath, transcription);
        
        // Generate video with subtitles by treating the original video as input
        const outputPath = path.join(outputDir, 'output.mp4');
        
        await new Promise<void>((resolve, reject) => {
          // Build ffmpeg args for adding subtitles to video
          const subtitleStyle = [
            'FontName=Noto Sans',
            `FontSize=${subtitleSize}`,
            `Alignment=${subtitlePosition}`, 
            'OutlineColour=&H80000000',
            'BorderStyle=3',
            subtitleOutline > 0 ? `Outline=${subtitleOutline}` : '',
            'Shadow=0',
            'MarginV=20'
          ].filter(Boolean).join(',');
          
          const ffmpegArgs = [
            '-i', videoPath,
            '-vf', `subtitles=${path.resolve(subtitlesPath)}:force_style='${subtitleStyle}'`,
            '-c:a', 'copy',
            '-c:v', 'libx264',
            '-preset', 'medium',
            outputPath
          ];
          
          console.log('FFmpeg args for video subtitling:', ffmpegArgs.join(' '));
          
          const ffmpeg = spawn('ffmpeg', ffmpegArgs);
          let err = '';
          
          ffmpeg.stderr.on('data', d => {
            const s = d.toString();
            console.log('ffmpeg:', s);
            err += s;
          });
          
          ffmpeg.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}: ${err}`));
          });
          
          ffmpeg.on('error', e => {
            reject(new Error(`FFmpeg error: ${e.message}`));
          });
        });
        
        // Return the URL to the generated video and subtitles
        const videoUrl = `/outputs/${requestId}/output.mp4`;
        const subtitlesUrl = `/uploads/${requestId}/subtitles.vtt`;
        
        return NextResponse.json({ 
          videoUrl,
          subtitlesUrl 
        });
      }

      // For audio mode, generate the video with ffmpeg
      const outputPath = path.join(outputDir, 'output.mp4');
      await generateVideoWithSubtitles(
        audioPath, 
        subtitlesPath, 
        imagePath, 
        outputPath, 
        dimension, 
        {
          position: subtitlePosition,
          outline: subtitleOutline,
          fontSize: subtitleSize
        }
      );

      // Return the URL to the generated video
      const videoUrl = `/outputs/${requestId}/output.mp4`;
      const subtitlesUrl = `/uploads/${requestId}/subtitles.vtt`;
      
      return NextResponse.json({ 
        videoUrl,
        subtitlesUrl 
      });
    } catch (error) {
      // Clean up directories in case of error
      await cleanupDirectories(uploadDir, outputDir);
      throw error;
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    if (error instanceof ApiKeyMissingError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 