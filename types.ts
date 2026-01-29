
export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type Mode = 'coding' | 'image' | 'text';
export type Language = 'en' | 'zh';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QuestionOption {
  label: string;
  description?: string;
  value: string;
}

export interface AIQuestion {
  question: string;
  description?: string;
  options: QuestionOption[];
  allowCustomInput?: boolean;
  allowMultiple?: boolean;
}

export interface AIResult {
  prompt_en: string;
  prompt_zh: string;
  score: number;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string;
  };
}

export type AIResponsePayload = 
  | { type: 'question'; content: AIQuestion }
  | { type: 'result'; content: AIResult };

export interface QuestionHistoryItem {
  question: AIQuestion;
  answerLabel: string; // What we show the user they picked
  answerValue: string; // What we sent to the AI
}

export interface SessionState {
  rawHistory: Message[]; // For API context
  questionHistory: QuestionHistoryItem[]; // For UI rendering
  status: 'idle' | 'loading' | 'analyzing' | 'question' | 'supplementary' | 'final_generating' | 'result' | 'error';
  currentQuestion?: AIQuestion;
  result?: AIResult;
  error?: string;
}
