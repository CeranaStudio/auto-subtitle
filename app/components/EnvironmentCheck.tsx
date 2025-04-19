"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export const EnvironmentCheck = () => {
  const [isApiKeySet, setIsApiKeySet] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch("/api/env-check");
        const data = await response.json();
        setIsApiKeySet(data.isApiKeySet);
      } catch (error) {
        console.error("Failed to check API key:", error);
        setIsApiKeySet(false);
      }
    };

    checkApiKey();
  }, []);

  if (isApiKeySet === null) {
    return null; // Loading state
  }

  if (isApiKeySet === false) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          OpenAI API key is not set. Please add your API key to the .env.local file:
          <code className="block mt-2 p-2 rounded bg-muted font-mono text-sm">
            OPENAI_API_KEY=your_api_key_here
          </code>
        </AlertDescription>
      </Alert>
    );
  }

  return null; // API key is set, don't show anything
};

export default EnvironmentCheck; 