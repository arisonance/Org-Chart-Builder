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
 * System prompt for org chart extraction - Enhanced for matrix organizations
 */
const ORG_CHART_EXTRACTION_PROMPT = `You are an expert at analyzing organizational charts, especially MATRIX ORGANIZATIONS with multiple dimensions.

**CRITICAL CONTEXT**: This org chart may show people belonging to multiple brands, channels, or departments simultaneously. Look for:
- Labels/badges on cards indicating brands (e.g., "Sonance", "James", "VIZIO")
- Channel indicators (e.g., "E-commerce", "Retail", "Custom Install")
- Department groupings (e.g., "Marketing", "Sales", "Product")
- Multiple labels on a single person = they work across dimensions

**EXTRACTION GUIDELINES**:

1. **People** - For each person visible, extract:
   - Full name (EXACT spelling as shown - very important!)
   - Job title/role (exact as shown)
   - Manager name (who they report to, if visible via reporting line)
   - ALL brands they're associated with (look for brand badges/labels)
   - ALL channels they work in (e.g., "E-commerce", "Retail")
   - ALL departments they belong to (e.g., "Marketing", "Sales")
   - Location if visible (e.g., "San Diego", "Remote")
   - Confidence score (0.0-1.0): 
     * 1.0 = crystal clear
     * 0.8-0.9 = clear but small text
     * 0.6-0.7 = somewhat unclear
     * <0.6 = very uncertain

2. **Relationships** - Identify ALL connections:
   - **Solid line pointing UP** = "manager" (from: person, to: their manager)
   - **Dotted/dashed line** = "dotted" (advisory/collaborative relationship)
   - **Diamond marker or special indicator** = "sponsor" (executive sponsor)
   - For each relationship specify: from (person name), to (person name), type, confidence

3. **Matrix Structure** - Pay special attention to:
   - People shown in multiple boxes or with multiple labels = cross-functional roles
   - Swim lanes or columns often indicate brands/channels/departments
   - Color coding or visual grouping
   - Reporting lines that cross boundaries = matrix relationships

4. **Error Recovery**:
   - If name is unclear, include "?" and set confidence < 0.7
   - If relationship type is ambiguous, default to "manager" with lower confidence
   - Extract partial data rather than skipping entirely
   - For incomplete information, set low confidence rather than omitting

**OUTPUT FORMAT** (valid JSON only, no markdown):
{
  "people": [
    {
      "name": "Exact Name",
      "title": "Job Title",
      "reportsTo": "Manager Name",
      "brands": ["Brand1", "Brand2"],
      "channels": ["Channel1"],
      "departments": ["Department1", "Department2"],
      "location": "City/Remote",
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "from": "Person Name",
      "to": "Manager/Sponsor Name",
      "type": "manager",
      "confidence": 0.9
    }
  ]
}

**REMEMBER**: 
- Use EXACT names and spelling from image
- Include ALL visible brands/channels/departments per person
- Set appropriate confidence scores
- Extract everything visible, even if partial`;

/**
 * Parse an image/PDF using AI vision with retry logic
 * Calls the Next.js API route which handles Claude/OpenAI integration
 */
export async function parseOrgChartImage(
  imageData: string,
  mimeType: string = 'image/png',
  retries: number = 2,
): Promise<ParsedOrgChart> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('/api/parse-org-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          mimeType,
          prompt: ORG_CHART_EXTRACTION_PROMPT,
        }),
        signal: AbortSignal.timeout(120000), // 2 minute timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // If no API key configured, return mock data for demo
        if (response.status === 503 && errorData.mockData) {
          console.warn('No AI API keys configured - using mock data');
          return errorData.mockData;
        }
        
        // Retry on rate limit or server errors (5xx)
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(errorData.error || `Server error (${response.status})`);
          if (attempt < retries) {
            // Exponential backoff: wait 2^attempt seconds
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        }
        
        throw new Error(errorData.error || 'Failed to parse org chart');
      }

      const data = await response.json();
      
      // Validate we got the expected structure
      if (!data.people || !Array.isArray(data.people)) {
        throw new Error('Invalid response format from AI');
      }
      
      return data as ParsedOrgChart;
    } catch (error) {
      lastError = error as Error;
      
      // Retry on network errors
      if (error instanceof TypeError && error.message.includes('fetch') && attempt < retries) {
        console.warn(`Fetch failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      // Don't retry on timeout or other non-transient errors
      if (attempt === retries) {
        break;
      }
    }
  }
  
  console.error('Vision parsing error after retries:', lastError);
  throw lastError || new Error('Failed to parse org chart');
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
 * Validate extracted data quality with enhanced error recovery
 */
export function validateExtraction(data: ParsedOrgChart): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.people || data.people.length === 0) {
    errors.push("No people extracted from image");
    return { isValid: false, errors, warnings };
  }

  // Check for people with missing required fields
  const incompletePeople = data.people.filter(p => !p.name || !p.title);
  if (incompletePeople.length > 0) {
    warnings.push(`${incompletePeople.length} people missing name or title`);
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
    warnings.push(`${lowConfidence.length} people extracted with low confidence - review carefully`);
  }

  // Validate relationships reference existing people - be lenient and just warn
  const peopleNames = new Set(data.people.map(p => p.name));
  const brokenRelationships = data.relationships.filter(
    rel => !peopleNames.has(rel.from) || !peopleNames.has(rel.to)
  );
  
  if (brokenRelationships.length > 0) {
    warnings.push(`${brokenRelationships.length} relationships reference unknown people and will be skipped`);
    // Auto-fix: remove broken relationships instead of failing
    data.relationships = data.relationships.filter(
      rel => peopleNames.has(rel.from) && peopleNames.has(rel.to)
    );
  }

  // Check for unusual patterns
  if (data.people.length > 100) {
    warnings.push(`Large extraction (${data.people.length} people) - may need review`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export the prompt so the API route can use it
 */
export { ORG_CHART_EXTRACTION_PROMPT };

