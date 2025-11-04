import type { GraphNode, PersonNode } from "../schema/types";
import type { ParsedPerson } from "./vision-parser";

export type DuplicateMatch = {
  existingNode: PersonNode;
  parsedPerson: ParsedPerson;
  matchScore: number; // 0-1, higher = more likely duplicate
  matchReasons: string[];
};

export type MergeStrategy = "skip" | "update" | "create-new";

export type MergeDecision = {
  parsedPerson: ParsedPerson;
  strategy: MergeStrategy;
  existingNodeId?: string;
  conflicts?: string[];
};

/**
 * Find potential duplicates for a parsed person
 */
export function findDuplicates(
  parsedPerson: ParsedPerson,
  existingNodes: GraphNode[],
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const personNodes = existingNodes.filter((n): n is PersonNode => n.kind === "person");

  for (const node of personNodes) {
    const score = calculateMatchScore(parsedPerson, node);
    if (score > 0.6) {
      // Threshold for considering a potential duplicate
      matches.push({
        existingNode: node,
        parsedPerson,
        matchScore: score,
        matchReasons: getMatchReasons(parsedPerson, node, score),
      });
    }
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Calculate similarity score between parsed person and existing node
 */
function calculateMatchScore(parsed: ParsedPerson, existing: PersonNode): number {
  let score = 0;
  let weights = 0;

  // Name similarity (highest weight)
  const nameSimilarity = compareNames(parsed.name, existing.name);
  score += nameSimilarity * 0.6;
  weights += 0.6;

  // Title similarity (medium weight)
  const titleSimilarity = compareTitles(parsed.title, existing.attributes.title);
  score += titleSimilarity * 0.3;
  weights += 0.3;

  // Location match (low weight)
  if (parsed.location && existing.attributes.location) {
    const locationMatch = parsed.location.toLowerCase() === existing.attributes.location.toLowerCase() ? 1 : 0;
    score += locationMatch * 0.1;
    weights += 0.1;
  }

  return weights > 0 ? score / weights : 0;
}

/**
 * Compare two names for similarity
 */
function compareNames(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Exact match
  if (n1 === n2) return 1.0;

  // Check if one contains the other (e.g., "John Smith" vs "John A. Smith")
  if (n1.includes(n2) || n2.includes(n1)) return 0.95;

  // Split into parts and compare
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);

  // Same first and last name
  if (
    parts1.length >= 2 &&
    parts2.length >= 2 &&
    parts1[0] === parts2[0] &&
    parts1[parts1.length - 1] === parts2[parts2.length - 1]
  ) {
    return 0.9;
  }

  // Fuzzy match using Levenshtein-like comparison
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return 1 - distance / longer.length;
}

/**
 * Compare job titles for similarity
 */
function compareTitles(title1: string, title2: string): number {
  const t1 = normalizeTitle(title1);
  const t2 = normalizeTitle(title2);

  if (t1 === t2) return 1.0;
  if (t1.includes(t2) || t2.includes(t1)) return 0.8;

  // Check for common abbreviations
  const abbrevs: Record<string, string[]> = {
    vp: ["vice president", "vp", "v.p."],
    director: ["director", "dir", "dir."],
    manager: ["manager", "mgr", "mgr."],
    senior: ["senior", "sr", "sr."],
    junior: ["junior", "jr", "jr."],
  };

  for (const [key, variations] of Object.entries(abbrevs)) {
    const hasT1 = variations.some((v) => t1.includes(v));
    const hasT2 = variations.some((v) => t2.includes(v));
    if (hasT1 && hasT2) return 0.7;
  }

  return 0;
}

/**
 * Normalize name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get human-readable reasons for match
 */
function getMatchReasons(
  parsed: ParsedPerson,
  existing: PersonNode,
  score: number,
): string[] {
  const reasons: string[] = [];

  const nameSimilarity = compareNames(parsed.name, existing.name);
  if (nameSimilarity > 0.95) {
    reasons.push("Exact or near-exact name match");
  } else if (nameSimilarity > 0.85) {
    reasons.push("Very similar names");
  }

  const titleSimilarity = compareTitles(parsed.title, existing.attributes.title);
  if (titleSimilarity > 0.9) {
    reasons.push("Same job title");
  } else if (titleSimilarity > 0.7) {
    reasons.push("Similar job titles");
  }

  if (
    parsed.location &&
    existing.attributes.location &&
    parsed.location.toLowerCase() === existing.attributes.location.toLowerCase()
  ) {
    reasons.push("Same location");
  }

  if (reasons.length === 0) {
    reasons.push("Partial match based on multiple factors");
  }

  return reasons;
}

/**
 * Auto-suggest merge strategies for all parsed people
 */
export function suggestMergeStrategies(
  parsedPeople: ParsedPerson[],
  existingNodes: GraphNode[],
): MergeDecision[] {
  return parsedPeople.map((person) => {
    const duplicates = findDuplicates(person, existingNodes);

    if (duplicates.length === 0) {
      // No duplicates, create new
      return {
        parsedPerson: person,
        strategy: "create-new",
      };
    }

    const bestMatch = duplicates[0];

    if (bestMatch.matchScore > 0.9) {
      // High confidence duplicate, suggest skip or update
      const conflicts = detectConflicts(person, bestMatch.existingNode);
      return {
        parsedPerson: person,
        strategy: conflicts.length > 0 ? "update" : "skip",
        existingNodeId: bestMatch.existingNode.id,
        conflicts,
      };
    }

    if (bestMatch.matchScore > 0.7) {
      // Medium confidence, suggest review
      return {
        parsedPerson: person,
        strategy: "update", // User should review
        existingNodeId: bestMatch.existingNode.id,
        conflicts: ["Uncertain match - please review"],
      };
    }

    // Low confidence, create new
    return {
      parsedPerson: person,
      strategy: "create-new",
    };
  });
}

/**
 * Detect conflicts between parsed and existing data
 */
function detectConflicts(parsed: ParsedPerson, existing: PersonNode): string[] {
  const conflicts: string[] = [];

  // Title mismatch
  if (
    parsed.title &&
    existing.attributes.title &&
    compareTitles(parsed.title, existing.attributes.title) < 0.7
  ) {
    conflicts.push(`Title mismatch: "${parsed.title}" vs "${existing.attributes.title}"`);
  }

  // Location mismatch
  if (
    parsed.location &&
    existing.attributes.location &&
    parsed.location.toLowerCase() !== existing.attributes.location.toLowerCase()
  ) {
    conflicts.push(
      `Location mismatch: "${parsed.location}" vs "${existing.attributes.location}"`,
    );
  }

  return conflicts;
}

