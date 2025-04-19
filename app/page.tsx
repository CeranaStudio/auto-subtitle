"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import EnvironmentCheck from "./components/EnvironmentCheck";
import ProcessingSteps from "./components/ProcessingSteps";
import SubtitlesViewer from "./components/SubtitlesViewer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { 
  VideoIcon, 
  ImageIcon, 
  AudioLines,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  X,
  Upload
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Home = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [subtitlesUrl, setSubtitlesUrl] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [dimension, setDimension] = useState<string>("720p");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [subtitlePosition, setSubtitlePosition] = useState<number>(2); // Default center position
  const [subtitleOutline, setSubtitleOutline] = useState<number>(3); // Default outline style
  const [subtitleSize, setSubtitleSize] = useState<number>(24); // Default font size
  const [subtitleText, setSubtitleText] = useState<string>("預覽字幕效果");
  const [inputMode, setInputMode] = useState<string>("audio"); // "audio" or "video"

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [audioPreviewUrl, imagePreviewUrl, videoPreviewUrl]);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAudioFile(file);
    
    if (file) {
      // Revoke old URL if exists
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      // Create new URL
      const url = URL.createObjectURL(file);
      setAudioPreviewUrl(url);
    } else {
      setAudioPreviewUrl("");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    
    if (file) {
      // Revoke old URL if exists
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      // Create new URL
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    } else {
      setImagePreviewUrl("");
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setVideoFile(file);
    
    if (file) {
      // Revoke old URL if exists
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      // Create new URL
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
    } else {
      setVideoPreviewUrl("");
    }
  };

  const handleModeChange = (value: string) => {
    setInputMode(value);
    // Reset state when switching modes
    if (value === "audio") {
      setVideoFile(null);
      setVideoPreviewUrl("");
    } else {
      setAudioFile(null);
      setImageFile(null);
      setAudioPreviewUrl("");
      setImagePreviewUrl("");
    }
    // Reset error and output
    setError("");
    setVideoUrl("");
    setSubtitlesUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMode === "audio" && !audioFile) {
      toast.error("Please upload an audio file");
      setError("Please upload an audio file");
      return;
    }
    
    if (inputMode === "video" && !videoFile) {
      toast.error("Please upload a video file");
      setError("Please upload a video file");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setVideoUrl("");
    setSubtitlesUrl("");
    setProgress(0);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 1000);
    
    try {
      const formData = new FormData();
      
      if (inputMode === "audio") {
        formData.append("audio", audioFile!);
        if (imageFile) formData.append("image", imageFile);
        formData.append("mode", "audio");
      } else {
        formData.append("video", videoFile!);
        formData.append("mode", "video");
      }
      
      formData.append("dimension", dimension);
      formData.append("subtitlePosition", subtitlePosition.toString());
      formData.append("subtitleOutline", subtitleOutline.toString());
      formData.append("subtitleSize", subtitleSize.toString());
      
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || response.statusText;
        
        // Check if it's a video processing error
        if (errorMessage.includes("FFmpeg") || errorMessage.includes("dimensions")) {
          if (imageFile && inputMode === "audio") {
            throw new Error("There was an issue with the image. Please try a different image with standard dimensions.");
          } else if (videoFile && inputMode === "video") {
            throw new Error("There was an issue with the video. Please try a different video file.");
          } else {
            throw new Error("There was an issue processing the media. Please try again.");
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setVideoUrl(data.videoUrl);
      setSubtitlesUrl(data.subtitlesUrl);
      setProgress(100);
      toast.success("Video successfully generated!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const getPositionIcon = () => {
    switch(subtitlePosition) {
      case 1: return <AlignLeft className="h-4 w-4" />;
      case 2: return <AlignCenter className="h-4 w-4" />;
      case 3: return <AlignRight className="h-4 w-4" />;
      default: return <AlignJustify className="h-4 w-4" />;
    }
  };

  // Calculate subtitle style for preview
  const subtitleStyle = useMemo(() => {
    // Get dimensions based on selected resolution
    const dimensions = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 }
    }[dimension] || { width: 1280, height: 720 };
    
    // Calculate scale factor for the preview container
    // This makes font size relative to the selected output resolution
    const previewWidth = 100; // 100% of container width
    const scaleFactor = previewWidth / dimensions.width;
    
    const textAlign = subtitlePosition === 1 ? 'left' : subtitlePosition === 3 ? 'right' : 'center';
    const width = subtitlePosition === 2 ? '80%' : '90%';
    const left = subtitlePosition === 1 ? '5%' : subtitlePosition === 3 ? 'auto' : '10%';
    const right = subtitlePosition === 3 ? '5%' : 'auto';
    
    // Scale font size according to selected output resolution
    const scaledFontSize = Math.round(subtitleSize * scaleFactor * 100) / 100;
    
    return {
      position: 'absolute' as const, 
      bottom: '20px',
      left,
      right,
      width,
      textAlign: textAlign as 'left' | 'center' | 'right',
      fontSize: `${scaledFontSize}vw`, // Use vw units for responsive scaling
      color: 'white',
      fontFamily: '"Noto Sans", sans-serif',
      fontWeight: 500,
      textShadow: subtitleOutline > 0 
        ? `0 0 ${subtitleOutline * scaleFactor * 2}vw black, 0 0 ${subtitleOutline * scaleFactor}vw black` 
        : 'none',
      padding: '6px',
      lineHeight: 1.2,
      zIndex: 10
    };
  }, [subtitlePosition, subtitleOutline, subtitleSize, dimension]);
  
  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <EnvironmentCheck />
      
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Left column: Control panel */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-xl">Configure Your Video</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="audio" value={inputMode} onValueChange={handleModeChange} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="audio" className="flex items-center gap-2">
                  <AudioLines className="h-4 w-4" />
                  Audio + Image
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <VideoIcon className="h-4 w-4" />
                  Video
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {inputMode === "audio" ? (
                /* Audio + Image mode */
                <>
                  <div className="space-y-2">
                    <Label htmlFor="audio-file" className="flex items-center gap-2">
                      <AudioLines className="h-4 w-4" /> 
                      Audio File <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          id="audio-file"
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioChange}
                          disabled={isLoading}
                          required
                        />
                      </div>
                      {audioFile && (
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          type="button"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            setAudioFile(null);
                            setAudioPreviewUrl("");
                          }}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear audio</span>
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A, AAC (max 50MB)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image-file" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Background Image <span className="text-xs text-muted-foreground">(optional)</span>
                    </Label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          id="image-file"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageChange}
                          disabled={isLoading}
                        />
                      </div>
                      {imageFile && (
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          type="button"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreviewUrl("");
                          }}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear image</span>
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WebP (max 10MB)</p>
                  </div>
                </>
              ) : (
                /* Video mode */
                <div className="space-y-2">
                  <Label htmlFor="video-file" className="flex items-center gap-2">
                    <VideoIcon className="h-4 w-4" /> 
                    Video File <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        id="video-file"
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    {videoFile && (
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        type="button"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          setVideoFile(null);
                          setVideoPreviewUrl("");
                        }}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear video</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM (max 100MB)</p>
                </div>
              )}
              
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <VideoIcon className="h-4 w-4" />
                  Output Resolution <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <RadioGroup 
                  defaultValue="720p" 
                  value={dimension} 
                  onValueChange={setDimension}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="480p" id="480p" />
                    <Label htmlFor="480p" className="cursor-pointer">480p</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="720p" id="720p" />
                    <Label htmlFor="720p" className="cursor-pointer">720p</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1080p" id="1080p" />
                    <Label htmlFor="1080p" className="cursor-pointer">1080p</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-3 pt-2">
                <Label className="flex items-center gap-2">
                  {getPositionIcon()}
                  Subtitle Position
                </Label>
                <RadioGroup 
                  value={subtitlePosition.toString()} 
                  onValueChange={(value) => setSubtitlePosition(parseInt(value))}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="left" />
                    <Label htmlFor="left" className="cursor-pointer">Left</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="center" />
                    <Label htmlFor="center" className="cursor-pointer">Center</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="right" />
                    <Label htmlFor="right" className="cursor-pointer">Right</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-3 pt-2">
                <Label>Font Size: {subtitleSize}px</Label>
                <Slider 
                  value={[subtitleSize]}
                  min={16}
                  max={48}
                  step={2}
                  onValueChange={(value: number[]) => setSubtitleSize(value[0])}
                />
              </div>
              
              <div className="space-y-3 pt-2">
                <Label>Outline Strength: {subtitleOutline}</Label>
                <Slider 
                  value={[subtitleOutline]}
                  min={0}
                  max={5}
                  step={1}
                  onValueChange={(value: number[]) => setSubtitleOutline(value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  {subtitleOutline === 0 ? "No outline" : subtitleOutline === 1 ? "Thin outline" : subtitleOutline >= 4 ? "Heavy outline" : "Medium outline"}
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <Label htmlFor="subtitle-text">Subtitle Preview Text</Label>
                <Input
                  id="subtitle-text"
                  value={subtitleText}
                  onChange={(e) => setSubtitleText(e.target.value)}
                  placeholder="Enter text for subtitle preview"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isLoading || (inputMode === "audio" && !audioFile) || (inputMode === "video" && !videoFile)}
              >
                {isLoading ? "Processing..." : (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Generate Subtitled Video
                  </span>
                )}
              </Button>
              
              {/* Subtitles Preview */}
              {subtitlesUrl && (
                <div className="mt-4">
                  <SubtitlesViewer subtitlesUrl={subtitlesUrl} />
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        
        {/* Right column: Preview & Progress */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-xl">Preview & Output</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview based on input mode */}
            {inputMode === "audio" ? (
              /* Image Preview with Subtitle Overlay */
              imagePreviewUrl ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Preview with Subtitles <span className="text-xs text-muted-foreground">({dimension})</span></h3>
                  <div 
                    className="relative bg-black overflow-hidden rounded-md" 
                    style={{ 
                      aspectRatio: dimension === '480p' ? '854/480' : dimension === '1080p' ? '1920/1080' : '1280/720'
                    }}
                  >
                    <Image 
                      src={imagePreviewUrl} 
                      alt="Background preview" 
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div style={subtitleStyle}>
                      {subtitleText || "預覽字幕效果"}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Preview scaled to match {dimension} output ({dimension === '480p' ? '854×480' : dimension === '1080p' ? '1920×1080' : '1280×720'})
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Subtitle Preview <span className="text-xs text-muted-foreground">({dimension})</span></h3>
                  <div 
                    className="relative bg-black overflow-hidden rounded-md flex items-center justify-center" 
                    style={{ 
                      aspectRatio: dimension === '480p' ? '854/480' : dimension === '1080p' ? '1920/1080' : '1280/720'
                    }}
                  >
                    <div style={subtitleStyle}>
                      {subtitleText || "預覽字幕效果"}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Preview scaled to match {dimension} output ({dimension === '480p' ? '854×480' : dimension === '1080p' ? '1920×1080' : '1280×720'})
                  </p>
                </div>
              )
            ) : (
              /* Video Preview with Subtitle Overlay */
              videoPreviewUrl ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Video Preview</h3>
                  <div className="relative bg-black overflow-hidden rounded-md">
                    <video 
                      src={videoPreviewUrl} 
                      controls 
                      className="w-full" 
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Original video (subtitles will be overlaid during processing)
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium">Subtitle Style Preview</h3>
                    <div 
                      className="relative bg-black overflow-hidden rounded-md mt-2" 
                      style={{ 
                        aspectRatio: dimension === '480p' ? '854/480' : dimension === '1080p' ? '1920/1080' : '1280/720'
                      }}
                    >
                      <div style={subtitleStyle}>
                        {subtitleText || "預覽字幕效果"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Video Preview</h3>
                  <div 
                    className="bg-black/10 border border-dashed border-muted-foreground/50 rounded-md flex flex-col items-center justify-center p-6"
                    style={{ 
                      aspectRatio: dimension === '480p' ? '854/480' : dimension === '1080p' ? '1920/1080' : '1280/720' 
                    }}
                  >
                    <VideoIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Upload a video to see preview</p>
                  </div>
                </div>
              )
            )}
            
            {/* Audio Preview (Audio mode only) */}
            {inputMode === "audio" && audioPreviewUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Audio Preview</h3>
                <audio controls className="w-full" src={audioPreviewUrl}></audio>
              </div>
            )}
            
            {/* Processing indicators */}
            {isLoading && (
              <div className="space-y-4">
                <ProcessingSteps isProcessing={isLoading} />
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">{progress}% complete</p>
              </div>
            )}
            
            {/* Error display */}
            {error && (
              <div className="mt-4 text-destructive p-3 bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            
            {/* Generated Video */}
            {videoUrl && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Generated Video</h3>
                <div className="overflow-hidden rounded-lg">
                  <video src={videoUrl} controls className="w-full" />
                </div>
                <Button asChild variant="default" className="w-full">
                  <a href={videoUrl} download>Download Video</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Home;
