import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { FileProcessingError } from '../utils/error-handling';

/**
 * Validate image files
 * Check image dimensions and common errors
 */
export const validateImageFile = (file: File): boolean => {
  // Check file size
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new FileProcessingError("Image file is too large. Please use an image smaller than 10MB.");
  }
  
  // Check MIME type
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    throw new FileProcessingError("Invalid image format. Please use JPG, PNG, GIF, or WebP images.");
  }
  
  return true;
};

/**
 * Save uploaded file to disk
 */
export const saveFileToDisk = async (
  file: File,
  dir: string,
  filename: string
): Promise<string> => {
  try {
    // Validate image files
    if (filename.startsWith('image') && file.type.startsWith('image/')) {
      validateImageFile(file);
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);
    return filePath;
  } catch (error) {
    throw new FileProcessingError(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Create necessary directories for file processing
 */
export const createDirectories = async (
  ...dirs: string[]
): Promise<void> => {
  for (const dir of dirs) {
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      throw new FileProcessingError(`Failed to create directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Clean up directories when processing fails
 */
export const cleanupDirectories = async (
  ...dirs: string[]
): Promise<void> => {
  for (const dir of dirs) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to clean up directory ${dir}:`, error);
    }
  }
};

/**
 * Generate file paths for a request
 */
export const generatePaths = (requestId: string): {
  uploadDir: string;
  outputDir: string;
} => {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', requestId);
  const outputDir = path.join(process.cwd(), 'public', 'outputs', requestId);
  
  return {
    uploadDir,
    outputDir
  };
}; 