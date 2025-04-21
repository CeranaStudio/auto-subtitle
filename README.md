# Auto Subtitle Generator

A modern Next.js application that automatically generates videos with subtitles from audio files. Perfect for content creators, educators, and anyone looking to enhance video accessibility.

## ✨ Features

- **Audio Processing**: Upload MP3, WAV, or M4A audio files for transcription
- **Customizable Background**: Add optional background images to enhance visual appeal
- **AI-Powered Transcription**: Automatic speech-to-text conversion using OpenAI's Whisper API
- **Video Generation**: Create videos with perfectly timed subtitles
- **Responsive UI**: Modern interface built with shadcn/ui and Tailwind CSS
- **Download Options**: Easily save generated videos for sharing

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Bun](https://bun.sh/) package manager
- [OpenAI API key](https://platform.openai.com/api-keys)
- FFmpeg (installed automatically through dependencies)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/auto-subtitle.git
   cd auto-subtitle
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development server:
   ```bash
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎬 How to Use

1. **Upload Audio**: Select an audio file (required)
2. **Add Background**: Upload a background image (optional)
3. **Generate**: Click the "Generate Video" button
4. **Processing**: Wait for the transcription and video rendering to complete
5. **Download**: View the preview and download your video

## 🛠️ Tech Stack

- **Frontend**: 
  - [Next.js 15](https://nextjs.org/) with App Router
  - [React 19](https://react.dev/)
  - [Tailwind CSS 4](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/) components
  - TypeScript

- **Backend & Processing**:
  - [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text) for transcription
  - [FFmpeg](https://ffmpeg.org/) for video generation
  - Edge Runtime API routes for serverless functions

- **Utilities**:
  - [Zod](https://zod.dev/) for validation
  - [React Hook Form](https://react-hook-form.com/) for form handling
  - UUID for unique file identification

## 📋 Project Structure

```
auto-subtitle/
├── app/                  # Next.js App Router
│   ├── api/              # API routes for backend processing
│   ├── components/       # App-specific UI components
│   └── page.tsx          # Main application page
├── components/           # Reusable UI components
├── lib/                  # Utility functions and libraries
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

[MIT](https://choosealicense.com/licenses/mit/)

## 🙏 Acknowledgements

- [OpenAI](https://openai.com/) for the Whisper API
- [FFmpeg](https://ffmpeg.org/) for video processing capabilities
- [shadcn/ui](https://ui.shadcn.com/) for UI components
