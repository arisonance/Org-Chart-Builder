import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ORG_CHART_EXTRACTION_PROMPT = `You are an expert at analyzing organizational charts. Extract the following information from the org chart image:

1. **People**: List all people with their:
   - Full name (exactly as shown)
   - Job title/role
   - Who they report to (manager's name, if visible)
   - Any visible attributes (department, location, brand, channel, etc.)

2. **Relationships**: Identify:
   - Solid lines = direct reporting (manager relationship)
   - Dotted lines = dotted-line/advisory relationships  
   - Special relationships like executive sponsors

3. **Structure**: Note hierarchical levels and team groupings

Return ONLY valid JSON with this exact schema (no markdown, no code blocks):
{
  "people": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "reportsTo": "Manager Name or null if top-level",
      "departments": ["Department if visible"],
      "brands": ["Brand if visible"],
      "channels": ["Channel if visible"],
      "location": "Location if visible",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "from": "Person Name",
      "to": "Manager Name",
      "type": "manager",
      "confidence": 0.9
    }
  ]
}

CRITICAL:
- Use exact names as they appear
- Set confidence lower if uncertain
- Include all visible people
- For relationships: "from" reports to "to" for manager type`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mimeType } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Try Claude first (Anthropic)
    if (ANTHROPIC_API_KEY) {
      const result = await parseWithClaude(image, mimeType);
      return NextResponse.json(result);
    }

    // Fall back to OpenAI if available
    if (OPENAI_API_KEY) {
      const result = await parseWithOpenAI(image, mimeType);
      return NextResponse.json(result);
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

async function parseWithClaude(base64Image: string, mimeType: string = 'image/png') {
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
            text: ORG_CHART_EXTRACTION_PROMPT
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  // Parse JSON from response
  const parsed = JSON.parse(content);
  
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

async function parseWithOpenAI(base64Image: string, mimeType: string = 'image/png') {
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
              text: ORG_CHART_EXTRACTION_PROMPT
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
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
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Clean up markdown code blocks if present
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  
  const parsed = JSON.parse(jsonStr);
  
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

