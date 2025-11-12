import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Rate limiting - simple in-memory store (would use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetTime) {
    // New window
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetIn: record.resetTime - now };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(rateCheck.resetIn / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + rateCheck.resetIn).toISOString(),
            'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString(),
          }
        }
      );
    }

    const body = await request.json();
    const { image, mimeType, prompt } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Use custom prompt if provided, otherwise use default
    const extractionPrompt = prompt || getDefaultPrompt();

    // Try Claude first (Anthropic) - recommended for accuracy
    if (ANTHROPIC_API_KEY) {
      try {
        const result = await parseWithClaude(image, mimeType, extractionPrompt);
        return NextResponse.json(result, {
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': rateCheck.remaining.toString(),
          }
        });
      } catch (claudeError) {
        console.error('Claude parsing failed:', claudeError);
        // If Claude fails and we have OpenAI, try that
        if (OPENAI_API_KEY) {
          console.log('Falling back to OpenAI...');
        } else {
          throw claudeError;
        }
      }
    }

    // Fall back to OpenAI if available
    if (OPENAI_API_KEY) {
      const result = await parseWithOpenAI(image, mimeType, extractionPrompt);
      return NextResponse.json(result, {
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': rateCheck.remaining.toString(),
        }
      });
    }

    // No API keys configured
    return NextResponse.json(
      { 
        error: 'No AI API keys configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local',
        mockData: getMockData()
      },
      { status: 503 }
    );

  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function getDefaultPrompt(): string {
  return `Extract people and relationships from this org chart image. Return JSON with "people" (array with name, title, confidence, brands, channels, departments, location) and "relationships" (array with from, to, type, confidence).`;
}

async function parseWithClaude(base64Image: string, mimeType: string = 'image/png', prompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.1, // Lower temperature for more consistent JSON output
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle rate limiting from Anthropic
    if (response.status === 429) {
      throw new Error('Claude API rate limit exceeded. Please wait and try again.');
    }
    
    throw new Error(errorData.error?.message || `Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  // Clean markdown if present
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  
  // Parse JSON from response with error handling
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse Claude response:', content);
    throw new Error('AI returned invalid JSON. Please try again or use a clearer image.');
  }
  
  return {
    people: parsed.people || [],
    relationships: parsed.relationships || [],
    metadata: {
      source: 'claude-vision',
      extractedAt: new Date().toISOString(),
      modelUsed: 'claude-3-5-sonnet-20241022',
    }
  };
}

async function parseWithOpenAI(base64Image: string, mimeType: string = 'image/png', prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high' // Request high detail for better text recognition
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle rate limiting from OpenAI
    if (response.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please wait and try again.');
    }
    
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Clean up markdown code blocks if present
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  
  // Parse JSON with error handling
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('AI returned invalid JSON. Please try again or use a clearer image.');
  }
  
  return {
    people: parsed.people || [],
    relationships: parsed.relationships || [],
    metadata: {
      source: 'openai-vision',
      extractedAt: new Date().toISOString(),
      modelUsed: 'gpt-4o',
    }
  };
}

function getMockData() {
  return {
    people: [
      {
        name: "Demo Person",
        title: "Sample Role",
        confidence: 0.85,
        departments: [],
        brands: [],
        channels: []
      }
    ],
    relationships: [],
    metadata: {
      source: 'mock',
      extractedAt: new Date().toISOString(),
      modelUsed: 'mock-no-api-key',
    }
  };
}

