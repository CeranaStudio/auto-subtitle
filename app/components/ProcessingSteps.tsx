"use client";

import { useState, useEffect } from "react";
import { 
  CheckIcon,
  FileIcon, 
  MicIcon, 
  VideoIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  icon: React.ReactNode;
};

type ProcessingStepsProps = {
  isProcessing: boolean;
};

export const ProcessingSteps = ({ isProcessing }: ProcessingStepsProps) => {
  const [steps, setSteps] = useState<Step[]>([
    { 
      id: "upload", 
      label: "Uploading files", 
      completed: false, 
      current: true,
      icon: <FileIcon className="h-4 w-4" />
    },
    { 
      id: "transcribe", 
      label: "Transcribing audio", 
      completed: false, 
      current: false,
      icon: <MicIcon className="h-4 w-4" />
    },
    { 
      id: "generate", 
      label: "Generating video", 
      completed: false, 
      current: false,
      icon: <VideoIcon className="h-4 w-4" />
    },
  ]);

  useEffect(() => {
    if (!isProcessing) {
      // Reset steps when not processing
      setSteps(currentSteps => currentSteps.map(step => ({
        ...step,
        completed: false,
        current: step.id === "upload"
      })));
      return;
    }

    // Simulate progress through steps
    const timers: NodeJS.Timeout[] = [];
    
    // First step (upload) completes quickly
    timers.push(setTimeout(() => {
      setSteps(prev => prev.map(step => 
        step.id === "upload" 
          ? { ...step, completed: true, current: false }
          : step.id === "transcribe" 
            ? { ...step, current: true }
            : step
      ));
    }, 1500));
    
    // Second step (transcribe) takes a bit longer
    timers.push(setTimeout(() => {
      setSteps(prev => prev.map(step => 
        step.id === "transcribe" 
          ? { ...step, completed: true, current: false }
          : step.id === "generate" 
            ? { ...step, current: true }
            : step
      ));
    }, 5000));
    
    return () => timers.forEach(clearTimeout);
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <div className="space-y-4 py-4">
      <div className="relative">
        {/* Vertical line connecting steps */}
        <div className="absolute left-4 top-0 bottom-0 border-l-2 border-muted h-full" />
        
        {steps.map((step) => (
          <div key={step.id} className="flex items-center mb-6 relative">
            {/* Step circle */}
            <div 
              className={cn(
                "rounded-full border-2 w-8 h-8 flex items-center justify-center z-10",
                step.completed 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : step.current 
                    ? "border-primary text-primary animate-pulse" 
                    : "border-muted bg-background"
              )}
            >
              {step.completed ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <div>{step.icon}</div>
              )}
            </div>
            
            {/* Step content */}
            <div className="ml-4">
              <p className={cn(
                "font-medium", 
                step.completed 
                  ? "text-primary" 
                  : step.current 
                    ? "text-primary" 
                    : "text-muted-foreground"
              )}>
                {step.label}
                {step.current && (
                  <span className="ml-2 inline-block animate-bounce">...</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingSteps; 