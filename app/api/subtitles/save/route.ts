import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const POST = async (request: NextRequest) => {
  try {
    const { vttContent } = await request.json();
    
    if (!vttContent) {
      return NextResponse.json(
        { error: 'VTT content is required' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `subtitles_${timestamp}.vtt`;
    const filepath = join(uploadsDir, filename);

    // Write the VTT content to file
    await writeFile(filepath, vttContent, 'utf8');

    // Return the public URL
    const subtitlesUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      subtitlesUrl,
      message: '字幕已成功儲存'
    });

  } catch (error) {
    console.error('Error saving subtitles:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save subtitles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}; 