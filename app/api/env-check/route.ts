import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    isApiKeySet: !!apiKey && apiKey !== 'your_openai_api_key_here',
  });
} 