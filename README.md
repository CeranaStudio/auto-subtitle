# Auto Subtitle Generator

This Next.js application allows users to upload audio files and generate videos with subtitles. An optional background image can be provided; otherwise, the video will have a black background with white text subtitles.

## Features

- Audio file upload
- Optional background image upload
- Automatic speech-to-text using OpenAI's Whisper API
- Video generation with embedded subtitles
- Download option for generated videos

## Prerequisites

- Node.js & Bun
- OpenAI API key
- FFmpeg

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Create a `.env.local` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Run the development server:
   ```bash
   bun dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. Upload an audio file (required)
2. Upload a background image (optional)
3. Click "Generate Video"
4. Wait for processing
5. View and download the generated video

## Technical Details

The application uses:
- Next.js App Router for the frontend and API routes
- OpenAI's Whisper API for speech-to-text
- FFmpeg for video generation with subtitles
- UUID for unique file naming

## License

[MIT](https://choosealicense.com/licenses/mit/)
