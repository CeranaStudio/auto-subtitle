# Auto Subtitle Generator

A modern Next.js application that automatically generates videos with subtitles from audio files using AI-powered transcription. Perfect for content creators, educators, and anyone looking to enhance video accessibility with professional-quality subtitles.

## ✨ Features

- **🎵 Audio Processing**: Support for MP3, WAV, and M4A audio files with automatic transcription
- **🖼️ Custom Backgrounds**: Add optional background images to enhance visual appeal
- **🤖 AI-Powered Transcription**: Automatic speech-to-text using OpenAI's Whisper API
- **✂️ Subtitle Editor**: Advanced subtitle editing with timing adjustments and text modifications
- **🎬 Video Generation**: Create professional videos with perfectly synchronized subtitles
- **📱 Responsive Design**: Modern, mobile-first interface built with shadcn/ui and Tailwind CSS
- **⚡ Real-time Processing**: Live progress tracking with detailed processing steps
- **📥 Easy Export**: Download generated videos in multiple formats
- **🐳 Docker Support**: Complete containerization with ffmpeg pre-installed
- **🔧 Environment Validation**: Built-in API key and dependency checks

## 🚀 Quick Start

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/auto-subtitle.git
   cd auto-subtitle
   ```

2. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Install dependencies:**
   ```bash
   bun install
   ```

4. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Start development server:**
   ```bash
   bun dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Deployment

For production deployment or isolated development environment:

```bash
# Using Docker Compose (recommended)
docker-compose -f docker/docker-compose.yml up --build

# Or build manually
docker build -f docker/Dockerfile -t auto-subtitle .
docker run -p 3000:3000 -e OPENAI_API_KEY=your_key auto-subtitle
```

📋 See the [Docker documentation](./docker/README.md) for detailed setup instructions.

## 🎬 How to Use

1. **🎵 Upload Audio**: Select your audio file (MP3, WAV, or M4A)
2. **🖼️ Add Background** (Optional): Upload a background image for visual enhancement
3. **⚙️ Configure Settings**: Adjust subtitle appearance and timing preferences
4. **🚀 Generate**: Click "Generate Video" to start the AI transcription process
5. **✏️ Edit Subtitles**: Use the built-in editor to fine-tune text and timing
6. **🎬 Preview & Download**: Review your video and download the final result

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality UI components
- **[React Hook Form](https://react-hook-form.com/)** - Performant form handling
- **[Zod](https://zod.dev/)** - Runtime type validation

### Backend & Processing
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager
- **[OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)** - AI-powered transcription
- **[FFmpeg](https://ffmpeg.org/)** - Video processing and subtitle rendering
- **Next.js API Routes** - Serverless backend functions
- **Edge Runtime** - Optimized for performance

### DevOps & Deployment
- **[Docker](https://www.docker.com/)** - Containerization with multi-stage builds
- **[Docker Compose](https://docs.docker.com/compose/)** - Development environment orchestration
- **Alpine Linux** - Lightweight base images
- **Health Checks** - Container monitoring and reliability

## 📋 Project Structure

```
auto-subtitle/
├── app/                          # Next.js App Router
│   ├── api/                      # Backend API routes
│   │   ├── generate/             # Video generation endpoint
│   │   ├── subtitles/            # Subtitle processing
│   │   └── env-check/            # Environment validation
│   ├── components/               # App-specific components
│   │   ├── SubtitleEditor.tsx    # Advanced subtitle editing
│   │   ├── ProcessingSteps.tsx   # Progress tracking
│   │   └── EnvironmentCheck.tsx  # API validation
│   ├── lib/                      # App utilities
│   ├── utils/                    # Helper functions
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main application
│   └── globals.css               # Global styles
├── components/                   # Reusable UI components
│   └── ui/                       # shadcn/ui components
├── docker/                       # Docker configuration
│   ├── Dockerfile                # Production Docker image
│   ├── Dockerfile.alternative    # Alternative build strategy
│   ├── docker-compose.yml        # Container orchestration
│   ├── build-docker.sh           # Build helper script
│   └── README.md                 # Docker documentation
├── lib/                          # Shared utilities and libraries
├── public/                       # Static assets
├── types/                        # TypeScript definitions
├── .dockerignore                 # Docker build exclusions
├── bun.lockb                     # Bun dependency lock
├── next.config.ts                # Next.js configuration
└── tailwind.config.ts            # Tailwind CSS configuration
```

## 🔧 Configuration

### Environment Variables

Required environment variables:

- `OPENAI_API_KEY` - Your OpenAI API key for Whisper transcription
- `NODE_ENV` - Environment mode (`development` | `production`)

### Next.js Configuration

The app is configured with:
- **Standalone output** for optimal Docker deployment
- **External packages** configuration for ffmpeg compatibility
- **App Router** for modern React patterns

## 🐳 Docker Details

This project includes comprehensive Docker support:

- **Multi-stage builds** for optimized production images
- **Bun runtime** for faster performance
- **FFmpeg pre-installed** for video processing
- **Security best practices** with non-root user
- **Health checks** for container monitoring
- **Volume mounts** for persistent file storage

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests if applicable
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to your branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Use TypeScript for type safety
- Follow the existing code style and patterns
- Add appropriate error handling
- Update documentation for new features
- Test Docker builds before submitting

## 📄 License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).

## 🙏 Acknowledgments

- **[OpenAI](https://openai.com/)** - For the powerful Whisper API
- **[FFmpeg](https://ffmpeg.org/)** - For robust video processing
- **[Bun](https://bun.sh/)** - For lightning-fast JavaScript runtime
- **[shadcn/ui](https://ui.shadcn.com/)** - For beautiful UI components
- **[Vercel](https://vercel.com/)** - For Next.js framework and deployment platform

---

<div align="center">

**[🚀 Get Started](#-quick-start) • [📚 Documentation](./docker/README.md) • [🐛 Report Bug](../../issues) • [💡 Request Feature](../../issues)**

Made with ❤️ for content creators worldwide

</div>
