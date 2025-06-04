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

export const POST = async (request: NextRequest) => {
  // Create unique ID for this request
  const requestId = uuidv4();
  console.log(`[${requestId}] Starting new request processing`);
  
  const { uploadDir, outputDir } = generatePaths(requestId);
  console.log(`[${requestId}] Generated paths - uploadDir: ${uploadDir}, outputDir: ${outputDir}`);
  
  try {
    // Check if OpenAI API key is configured
    console.log(`[${requestId}] Checking OpenAI API key configuration`);
    if (!isOpenAIKeyConfigured()) {
      console.error(`[${requestId}] OpenAI API key not configured`);
      throw new ApiKeyMissingError();
    }
    console.log(`[${requestId}] OpenAI API key is configured`);

    console.log(`[${requestId}] Parsing form data`);
    const formData = await request.formData();
    const mode = formData.get('mode') as string ?? 'audio';
    console.log(`[${requestId}] Mode: ${mode}`);
    
    const dimensionValue = formData.get('dimension') as string ?? '720p';
    console.log(`[${requestId}] Dimension value: ${dimensionValue}`);
    
    // Get subtitle settings
    const subtitlePosition = parseInt(formData.get('subtitlePosition') as string ?? '2');
    const subtitleOutline = parseInt(formData.get('subtitleOutline') as string ?? '3');
    const subtitleSize = parseInt(formData.get('subtitleSize') as string ?? '24');
    console.log(`[${requestId}] Subtitle settings - position: ${subtitlePosition}, outline: ${subtitleOutline}, size: ${subtitleSize}`);
    
    // Check if using existing subtitles
    const existingSubtitlesUrl = formData.get('existingSubtitlesUrl') as string | null;
    console.log(`[${requestId}] Existing subtitles URL: ${existingSubtitlesUrl ?? 'none'}`);
    
    // Validate dimension
    const dimension = ['480p', '720p', '1080p'].includes(dimensionValue) 
      ? dimensionValue as VideoDimension 
      : '720p';
    console.log(`[${requestId}] Final dimension: ${dimension}`);
    
    // Create directories
    console.log(`[${requestId}] Creating directories`);
    await createDirectories(uploadDir, outputDir);
    console.log(`[${requestId}] Directories created successfully`);
    
    try {
      let audioPath = '';
      let subtitlesPath = '';
      let imagePath: string | null = null;
      
      // If using existing subtitles, download them
      if (existingSubtitlesUrl) {
        console.log(`[${requestId}] Processing existing subtitles`);
        subtitlesPath = path.join(uploadDir, 'subtitles.vtt');
        console.log(`[${requestId}] Subtitles path: ${subtitlesPath}`);
        
        // Handle local file system paths
        if (existingSubtitlesUrl.startsWith('/uploads/')) {
          console.log(`[${requestId}] Reading local subtitles file`);
          // This is a local file path from our system
          const sourcePath = path.join(process.cwd(), 'public', existingSubtitlesUrl);
          console.log(`[${requestId}] Source path: ${sourcePath}`);
          
          try {
            const subtitlesContent = await fs.promises.readFile(sourcePath, 'utf-8');
            console.log(`[${requestId}] Read ${subtitlesContent.length} characters from subtitles file`);
            await fs.promises.writeFile(subtitlesPath, subtitlesContent);
            console.log(`[${requestId}] Subtitles file copied successfully`);
          } catch (error) {
            console.error(`[${requestId}] Error reading subtitles:`, error);
            throw new Error('無法讀取字幕檔案: ' + (error instanceof Error ? error.message : '未知錯誤'));
          }
        } else {
          console.log(`[${requestId}] Fetching external subtitles URL`);
          // For external URLs, fetch via HTTP
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
          const fullUrl = baseUrl + existingSubtitlesUrl;
          console.log(`[${requestId}] Fetching from: ${fullUrl}`);
          
          const subtitlesResponse = await fetch(fullUrl);
          
          if (!subtitlesResponse.ok) {
            console.error(`[${requestId}] Failed to fetch subtitles - status: ${subtitlesResponse.status}`);
            throw new Error('無法取得字幕檔案');
          }
          
          const subtitlesContent = await subtitlesResponse.text();
          console.log(`[${requestId}] Fetched ${subtitlesContent.length} characters from external URL`);
          await fs.promises.writeFile(subtitlesPath, subtitlesContent);
          console.log(`[${requestId}] External subtitles saved successfully`);
        }
      }
      
      if (mode === 'audio') {
        console.log(`[${requestId}] Processing audio + image mode`);
        // Audio + Image mode
        const audioFile = formData.get('audio') as File;
        const imageFile = formData.get('image') as File | null;
        
        if (!audioFile) {
          console.error(`[${requestId}] No audio file provided`);
          return NextResponse.json(
            { error: 'Audio file is required' },
            { status: 400 }
          );
        }
        
        console.log(`[${requestId}] Audio file: ${audioFile.name}, size: ${audioFile.size} bytes`);
        console.log(`[${requestId}] Image file: ${imageFile ? `${imageFile.name}, size: ${imageFile.size} bytes` : 'none'}`);
        
        // Validate audio file size
        if (audioFile.size > 50 * 1024 * 1024) { // 50MB limit
          console.error(`[${requestId}] Audio file too large: ${audioFile.size} bytes`);
          throw new Error('Audio file is too large. Maximum size is 50MB.');
        }

        // Save audio file
        console.log(`[${requestId}] Saving audio file`);
        const audioExt = path.extname(audioFile.name) ?? '.mp3';
        audioPath = await saveFileToDisk(
          audioFile,
          uploadDir,
          `audio${audioExt}`
        );
        console.log(`[${requestId}] Audio saved to: ${audioPath}`);

        // Save image file if provided
        if (imageFile) {
          console.log(`[${requestId}] Saving image file`);
          const imageExt = path.extname(imageFile.name) ?? '.jpg';
          imagePath = await saveFileToDisk(
            imageFile,
            uploadDir,
            `image${imageExt}`
          );
          console.log(`[${requestId}] Image saved to: ${imagePath}`);
        }
        
        // Only transcribe if not using existing subtitles
        if (!existingSubtitlesUrl) {
          console.log(`[${requestId}] Starting audio transcription`);
          // Transcribe the audio file
          const transcription = await transcribeAudio(audioPath);
          console.log(`[${requestId}] Transcription completed, length: ${transcription.length} characters`);

          // Save the generated subtitles
          subtitlesPath = path.join(uploadDir, 'subtitles.vtt');
          await fs.promises.writeFile(subtitlesPath, transcription);
          console.log(`[${requestId}] Subtitles saved to: ${subtitlesPath}`);
        } else {
          console.log(`[${requestId}] Skipping transcription - using existing subtitles`);
        }
      } else {
        console.log(`[${requestId}] Processing video mode`);
        // Video mode
        const videoFile = formData.get('video') as File;
        
        if (!videoFile) {
          console.error(`[${requestId}] No video file provided`);
          return NextResponse.json(
            { error: 'Video file is required' },
            { status: 400 }
          );
        }

        console.log(`[${requestId}] Video file: ${videoFile.name}, size: ${videoFile.size} bytes`);

        // Validate video file size
        if (videoFile.size > 100 * 1024 * 1024) { // 100MB limit
          console.error(`[${requestId}] Video file too large: ${videoFile.size} bytes`);
          throw new Error('Video file is too large. Maximum size is 100MB.');
        }

        // Save video file
        console.log(`[${requestId}] Saving video file`);
        const videoExt = path.extname(videoFile.name) ?? '.mp4';
        const videoPath = await saveFileToDisk(
          videoFile,
          uploadDir,
          `video${videoExt}`
        );
        console.log(`[${requestId}] Video saved to: ${videoPath}`);
        
        // Only extract audio and transcribe if not using existing subtitles
        if (!existingSubtitlesUrl) {
          console.log(`[${requestId}] Extracting audio from video`);
          // Extract audio from video
          audioPath = path.join(uploadDir, 'extracted_audio.mp3');
          console.log(`[${requestId}] Audio extraction target: ${audioPath}`);
          
          // Run ffmpeg to extract audio
          await new Promise<void>((resolve, reject) => {
            const ffmpegArgs = [
              '-i', videoPath,
              '-q:a', '0',
              '-map', 'a',
              audioPath
            ];
            console.log(`[${requestId}] FFmpeg audio extraction args: ${ffmpegArgs.join(' ')}`);
            
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            ffmpeg.stderr.on('data', (data) => {
              console.log(`[${requestId}] FFmpeg audio extraction: ${data.toString()}`);
            });
            
            ffmpeg.on('close', code => {
              console.log(`[${requestId}] FFmpeg audio extraction finished with code: ${code}`);
              if (code === 0) {
                console.log(`[${requestId}] Audio extraction successful`);
                resolve();
              } else {
                console.error(`[${requestId}] Audio extraction failed with code: ${code}`);
                reject(new Error(`Failed to extract audio from video (code ${code})`));
              }
            });
            
            ffmpeg.on('error', err => {
              console.error(`[${requestId}] FFmpeg audio extraction error:`, err);
              reject(new Error(`Failed to extract audio: ${err.message}`));
            });
          });
          
          console.log(`[${requestId}] Starting transcription of extracted audio`);
          // Transcribe the extracted audio
          const transcription = await transcribeAudio(audioPath);
          console.log(`[${requestId}] Transcription completed, length: ${transcription.length} characters`);

          // Save the generated subtitles
          subtitlesPath = path.join(uploadDir, 'subtitles.vtt');
          await fs.promises.writeFile(subtitlesPath, transcription);
          console.log(`[${requestId}] Subtitles saved to: ${subtitlesPath}`);
        } else {
          console.log(`[${requestId}] Skipping audio extraction and transcription - using existing subtitles`);
        }
        
        console.log(`[${requestId}] Starting video subtitle overlay process`);
        // Generate video with subtitles by treating the original video as input
        const outputPath = path.join(outputDir, 'output.mp4');
        console.log(`[${requestId}] Video output path: ${outputPath}`);
        
        await new Promise<void>((resolve, reject) => {
          // Build ffmpeg args for adding subtitles to video
          const subtitleStyle = [
            'FontName=Helvetica',
            `FontSize=${subtitleSize}`,
            `Alignment=${subtitlePosition}`, 
            'OutlineColour=&H80000000',
            'BorderStyle=3',
            subtitleOutline > 0 ? `Outline=${subtitleOutline}` : '',
            'Shadow=0',
            'MarginV=20'
          ].filter(Boolean).join(',');
          
          console.log(`[${requestId}] Subtitle style: ${subtitleStyle}`);
          
          const ffmpegArgs = [
            '-i', videoPath,
            '-vf', `subtitles=${path.resolve(subtitlesPath)}:force_style='${subtitleStyle}'`,
            '-c:a', 'copy',
            '-c:v', 'libx264',
            '-preset', 'medium',
            outputPath
          ];
          
          console.log(`[${requestId}] FFmpeg video subtitling args: ${ffmpegArgs.join(' ')}`);
          
          const ffmpeg = spawn('ffmpeg', ffmpegArgs);
          let err = '';
          
          ffmpeg.stderr.on('data', d => {
            const s = d.toString();
            console.log(`[${requestId}] FFmpeg video subtitling: ${s}`);
            err += s;
          });
          
          ffmpeg.on('close', code => {
            console.log(`[${requestId}] FFmpeg video subtitling finished with code: ${code}`);
            if (code === 0) {
              console.log(`[${requestId}] Video subtitling successful`);
              resolve();
            } else {
              console.error(`[${requestId}] Video subtitling failed with code: ${code}, error: ${err}`);
              reject(new Error(`FFmpeg exited with code ${code}: ${err}`));
            }
          });
          
          ffmpeg.on('error', e => {
            console.error(`[${requestId}] FFmpeg video subtitling error:`, e);
            reject(new Error(`FFmpeg error: ${e.message}`));
          });
        });
        
        // Return the URL to the generated video and subtitles
        const videoUrl = `/outputs/${requestId}/output.mp4`;
        const subtitlesUrl = `/uploads/${requestId}/subtitles.vtt`;
        
        console.log(`[${requestId}] Video mode completed successfully - videoUrl: ${videoUrl}, subtitlesUrl: ${subtitlesUrl}`);
        
        return NextResponse.json({ 
          videoUrl,
          subtitlesUrl 
        });
      }

      console.log(`[${requestId}] Starting video generation for audio mode`);
      // For audio mode, generate the video with ffmpeg
      const outputPath = path.join(outputDir, 'output.mp4');
      console.log(`[${requestId}] Audio mode output path: ${outputPath}`);
      
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
      console.log(`[${requestId}] Video generation completed successfully`);

      // Return the URL to the generated video
      const videoUrl = `/outputs/${requestId}/output.mp4`;
      const subtitlesUrl = `/uploads/${requestId}/subtitles.vtt`;
      
      console.log(`[${requestId}] Audio mode completed successfully - videoUrl: ${videoUrl}, subtitlesUrl: ${subtitlesUrl}`);
      
      return NextResponse.json({ 
        videoUrl,
        subtitlesUrl 
      });
    } catch (error) {
      console.error(`[${requestId}] Error in processing block:`, error);
      // Clean up directories in case of error
      console.log(`[${requestId}] Cleaning up directories due to error`);
      await cleanupDirectories(uploadDir, outputDir);
      console.log(`[${requestId}] Cleanup completed`);
      throw error;
    }
    
  } catch (error) {
    console.error(`[${requestId}] Final error handler:`, error);
    
    if (error instanceof ApiKeyMissingError) {
      console.error(`[${requestId}] API key missing error`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (error instanceof Error) {
      console.error(`[${requestId}] Known error: ${error.message}`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.error(`[${requestId}] Unknown error type`);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
};