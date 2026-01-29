import { Message, AIResponsePayload } from '../types';

export const callAI = async (
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[]
): Promise<AIResponsePayload> => {
  // Normalize URL
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  
  const cleanApiKey = apiKey.trim();

  // Simple ASCII check
  if (/[^\x00-\x7F]/.test(cleanApiKey)) {
    throw new Error("Configuration Error: API Key contains invalid (non-ASCII) characters. Please check your settings and re-enter the key.");
  }

  let lastError: any;
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Setup Timeout (180s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7, // Some randomness helps with retries
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If it's an Auth error (401), do not retry.
        if (response.status === 401) {
          throw new Error("Authentication failed: Invalid API Key.");
        }
        throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from AI");
      }

      // Try to parse. If this fails, it throws, goes to catch, and loop retries.
      return parseAIResponse(content);

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      
      const isTimeout = error.name === 'AbortError';
      const isAuthError = error.message.includes("Authentication failed") || error.message.includes("Configuration Error");

      // Don't retry on Auth errors or if we hit the max attempts
      if (isAuthError || attempt === MAX_RETRIES) {
        if (isTimeout) {
           throw new Error("Request timed out. The AI is taking too long to respond. Please try again.");
        }
        console.error(`Final failure after ${attempt} attempts:`, error);
        throw error;
      }

      console.warn(`Attempt ${attempt} failed (JSON/Network). Retrying... Error: ${error.message}`);
      
      // Optional: Small backoff delay (1s) before retrying to let API breathe
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw lastError || new Error("Unknown error occurred during AI request");
};

/**
 * Robustly attempts to extract and parse JSON from the AI response.
 * Handles Markdown code blocks, raw text, and mixed content (concatenated JSONs).
 */
function parseAIResponse(text: string): AIResponsePayload {
  let jsonString = text;
  
  // 1. Try to find markdown JSON block (```json ... ```)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1];
  } else {
    // 2. Try generic code block (``` ... ```)
    const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      jsonString = codeMatch[1];
    }
  }

  // 3. Robust Extraction: Find the FIRST valid balanced JSON object
  // This handles cases where AI returns multiple JSON objects: {A} {B}
  // The logic below extracts {A} and ignores {B}.
  const extracted = extractFirstJson(jsonString);
  if (extracted) {
    jsonString = extracted;
  }

  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Parsed response is not a valid object");
    }
    
    // AUTO-CORRECTION: Infer 'type' if missing
    if (!parsed.type) {
      if (parsed.prompt_en || parsed.prompt_zh || parsed.analysis || (parsed.content && parsed.content.prompt_en)) {
        parsed.type = 'result';
      } else {
        // Default to question if it looks like one or if we can't tell
        parsed.type = 'question';
      }
    }

    // NORMALIZE: Handle flat structure vs nested structure
    // If 'content' is missing, we assume the AI returned a flat JSON (e.g. { type: "question", question: "...", options: [] })
    // We aggressively move ALL other properties into a new 'content' object.
    if (!parsed.content) {
      const { type, ...rest } = parsed;
      parsed.content = rest;
    }

    // Validate structure type
    if (parsed.type !== 'question' && parsed.type !== 'result') {
      throw new Error(`Response missing valid 'type' field (question/result). Got: ${parsed.type}`);
    }

    // STRICT VALIDATION: Content object must exist (logic above ensures it does unless rest was empty)
    if (!parsed.content) {
      parsed.content = {}; // Fallback to empty object to prevent crash, checks below will catch missing fields
    }
    
    // Ensure options array exists for questions to prevent UI crashes
    if (parsed.type === 'question') {
      if (!parsed.content.options || !Array.isArray(parsed.content.options)) {
        parsed.content.options = [];
      }
      // Ensure question text exists
      if (!parsed.content.question) {
         // Try to find any string property that looks like a question
         const fallback = Object.values(parsed.content).find(v => typeof v === 'string' && (v as string).length > 5);
         parsed.content.question = fallback || "Please provide more details."; 
      }
    }

    // Ensure analysis structure exists for results to prevent UI crashes
    if (parsed.type === 'result') {
      if (!parsed.content.analysis) {
        parsed.content.analysis = { strengths: [], weaknesses: [], suggestions: "No specific analysis provided." };
      }
      if (!Array.isArray(parsed.content.analysis.strengths)) {
        parsed.content.analysis.strengths = [];
      }
      if (!Array.isArray(parsed.content.analysis.weaknesses)) {
        parsed.content.analysis.weaknesses = [];
      }
      if (!parsed.content.analysis.suggestions) {
        parsed.content.analysis.suggestions = "";
      }
    }

    return parsed as AIResponsePayload;
  } catch (e: any) {
    console.error("JSON Parsing Failed. Raw content:", text);
    // This error will be caught by callAI's retry loop
    if (e.message.includes("Response") || e.message.includes("Parsed")) {
      throw e;
    }
    throw new Error("Failed to parse AI response. The model generated invalid JSON.");
  }
}

/**
 * Helper to extract the first balanced curly brace block.
 * This fixes issues where "text.substring(indexOf('{'), lastIndexOf('}'))" 
 * would mistakenly capture "{A} {B}" as one block.
 */
function extractFirstJson(text: string): string | null {
  let depth = 0;
  let start = -1;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.substring(start, i + 1);
      }
    }
  }
  
  // If no balanced object found, return null (caller might rely on original string or fail)
  return null;
}