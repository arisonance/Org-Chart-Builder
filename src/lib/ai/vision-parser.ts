/**
 * AI Vision Parser for Org Chart Ingestion
 * 
 * This module handles parsing org charts from images and PDFs using AI vision models.
 * It extracts people, roles, and reporting relationships.
 */

export type ParsedPerson = {
  name: string;
  title: string;
  reportsTo?: string; // Name of manager
  brands?: string[];
  channels?: string[];
  departments?: string[];
  location?: string;
  confidence: number; // 0-1 score for extraction quality
};

export type ParsedOrgChart = {
  people: ParsedPerson[];
  relationships: Array<{
    from: string; // person name
    to: string; // person name
    type: "manager" | "sponsor" | "dotted";
    confidence: number;
  }>;
  metadata: {
    source: string;
    extractedAt: string;
    modelUsed: string;
  };
};

/**
 * System prompt for org chart extraction
 */
const ORG_CHART_EXTRACTION_PROMPT = `You are an expert at analyzing organizational charts. Extract the following information from the org chart image:

1. **People**: List all people with their:
   - Full name (exactly as shown)
   - Job title/role
   - Who they report to (manager's name, if visible)
   - Any visible attributes (department, location, etc.)

2. **Relationships**: Identify:
   - Solid lines = direct reporting (manager relationship)
   - Dotted lines = dotted-line/advisory relationships
   - Any executive sponsor or special relationships

3. **Structure**: Note:
   - Hierarchical levels
   - Team groupings
   - Any visible brand/department labels

Return your analysis as a structured JSON object with this exact schema:
{
  "people": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "reportsTo": "Manager Name" (null if top-level),
      "departments": ["Department"],
      "brands": ["Brand"],
      "channels": ["Channel"],
      "location": "Location",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "from": "Person Name",
      "to": "Person Name",
      "type": "manager",
      "confidence": 0.9
    }
  ]
}

**CRITICAL**: 
- Use exact names as they appear
- If uncertain about a connection, set lower confidence
- Include all visible people, even if their relationships are unclear
- Preserve the hierarchical structure as much as possible`;

/**
 * Parse an image/PDF using AI vision
 * Calls the Next.js API route which handles Claude/OpenAI integration
 */
export async function parseOrgChartImage(
  imageData: string,
  mimeType: string = 'image/png',
): Promise<ParsedOrgChart> {
  try {
    const response = await fetch('/api/parse-org-chart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        mimeType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // If no API key configured, return mock data for demo
      if (response.status === 503 && errorData.mockData) {
        console.warn('No AI API keys configured - using mock data');
        return errorData.mockData;
      }
      
      throw new Error(errorData.error || 'Failed to parse org chart');
    }

    const data = await response.json();
    return data as ParsedOrgChart;
  } catch (error) {
    console.error('Vision parsing error:', error);
    throw error;
  }
}

/**
 * Convert file to base64 for API transmission
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Validate extracted data quality
 */
export function validateExtraction(data: ParsedOrgChart): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.people.length === 0) {
    errors.push("No people extracted from image");
  }

  // Check for duplicate names
  const names = data.people.map(p => p.name.toLowerCase());
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate names found: ${[...new Set(duplicates)].join(", ")}`);
  }

  // Check confidence scores
  const lowConfidence = data.people.filter(p => p.confidence < 0.6);
  if (lowConfidence.length > 0) {
    warnings.push(`${lowConfidence.length} people extracted with low confidence`);
  }

  // Validate relationships reference existing people
  const peopleNames = new Set(data.people.map(p => p.name));
  data.relationships.forEach(rel => {
    if (!peopleNames.has(rel.from)) {
      errors.push(`Relationship references unknown person: ${rel.from}`);
    }
    if (!peopleNames.has(rel.to)) {
      errors.push(`Relationship references unknown person: ${rel.to}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

