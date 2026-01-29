import { Language } from './types';

export const DEFAULT_CONFIG = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4-turbo-preview', 
};

export const I18N = {
  en: {
    title: "ProPrompt",
    subtitle: "Craft professional prompts for code, art, and text.",
    codingTitle: "Coding Assistant",
    codingDesc: "Generate precise technical specs. Perfect for full-stack apps.",
    imageTitle: "Visual Studio",
    imageDesc: "Create breathtaking prompts for AI image generators.",
    textTitle: "Text Composer",
    textDesc: "Draft professional emails, essays, and copy.",
    settings: "Settings",
    save: "Save Configuration",
    startTitle: "What do you want to create?",
    startPlaceholder: "Describe your idea...",
    analyzing: "AI is analyzing requirements...",
    customOption: "Other / Custom Input",
    customPlaceholder: "Type your specific answer here...",
    next: "Next",
    skip: "I'm not sure / Skip",
    supplementaryTitle: "Final Details",
    supplementaryDesc: "Is there anything else you'd like to add before we generate the prompt?",
    supplementaryPlaceholder: "e.g., 'Make sure the code uses TypeScript', or 'The mood should be melancholic'...",
    generate: "Generate Final Prompt",
    generating: "Crafting your perfect prompt...",
    restart: "Start Over",
    resultTitle: "Prompt Ready",
    strengths: "Strengths",
    suggestions: "Suggestions",
    copy: "Copy",
    back: "Back",
    confirmSelection: "Confirm Selection",
  },
  zh: {
    title: "ProPrompt",
    subtitle: "几秒钟内生成专业的代码、绘画和文本提示词。",
    codingTitle: "编程助手",
    codingDesc: "生成精确的技术规格和 Prompt。适用于全栈应用开发。",
    imageTitle: "视觉工作室",
    imageDesc: "为 AI 绘画工具创建令人惊叹的提示词。",
    textTitle: "文本创作",
    textDesc: "起草专业的邮件、文章、营销文案。",
    settings: "设置",
    save: "保存配置",
    startTitle: "你想创作什么？",
    startPlaceholder: "描述你的想法...",
    analyzing: "AI 正在分析需求...",
    customOption: "其他 / 自定义输入",
    customPlaceholder: "在这里输入你的具体回答...",
    next: "下一步",
    skip: "我不确定 / 跳过",
    supplementaryTitle: "补充信息",
    supplementaryDesc: "在生成最终提示词之前，还有什么要补充的吗？",
    supplementaryPlaceholder: "例如：'代码必须使用 TypeScript'，或者 '氛围应该是忧郁的'...",
    generate: "生成最终提示词",
    generating: "正在精心编写您的提示词...",
    restart: "重新开始",
    resultTitle: "提示词已就绪",
    strengths: "方案优势",
    suggestions: "改进建议",
    copy: "复制",
    back: "返回",
    confirmSelection: "确认选择",
  }
};

const COMMON_INSTRUCTIONS = `
  CRITICAL RULES:
  1. **NO REDUNDANCY**: CAREFULLY analyze the entire conversation history. If the user has already provided information (especially in the initial description), DO NOT ask about it again. Proceed to the next logical step.
  2. **MULTI-SELECT**: If a question has multiple valid answers (e.g., "Which platforms?", "What colors?"), set "allowMultiple": true in the JSON.
  3. **STOP EARLY**: Do NOT ask unnecessary filler questions. As soon as you have enough information (usually 2-4 questions max) to generate a high-quality prompt, output the "result" JSON immediately. Do not aim for a fixed number of questions.
  4. **OUTPUT JSON ONLY**.
  5. **ONE QUESTION AT A TIME**: You MUST return exactly ONE JSON object per response. Do not output a list of questions.

  JSON STRUCTURE:
  FOR QUESTIONS:
  {
    "type": "question",
    "content": {
      "question": "...",
      "allowMultiple": true, // Set to true if multiple choices are allowed
      "options": [
        { "label": "Option A", "value": "a", "description": "..." }
      ]
    }
  }

  FOR RESULTS:
  {
    "type": "result",
    "content": {
      "prompt_en": "Full detailed prompt...",
      "prompt_zh": "Full detailed prompt...",
      "score": 90,
      "analysis": { ... }
    }
  }
`;

export const SYSTEM_PROMPTS = {
  coding: `You are an elite Senior Technical Architect and Product Manager.
  
  GOAL: Extract specific requirements to write the ultimate LLM coding prompt.
  
  PHASE 1 (Questioning):
  - Focus on Business Logic, User Flow, Innovation, and Usage Scenarios.
  - **IMPORTANT**: Do NOT avoid technical questions. If the user hasn't specified a Tech Stack (React vs Vue, Python vs Node) or Architecture, YOU MUST ASK about it.
  - AVOID purely low-level trivia (like "HashMap vs TreeMap") unless critical for performance, but **Architecture and Stack decisions are mandatory**.
  - AVOID asking things the user already said.
  - Provide 4-6 distinct options per question.
  
  PHASE 2 (Result Generation):
  - Assign a specific persona (e.g., "World-class Rust Developer").
  - Include file structure, coding standards, and error handling patterns.
  
  ${COMMON_INSTRUCTIONS}
  `,

  image: `You are an award-winning Art Director and Prompt Engineer for AI Art Generators.
  
  GOAL: Extract visual details to write a photorealistic or stylistically consistent prompt.
  
  PHASE 1 (Questioning):
  - Ask about: Composition, Innovation, Color Psychology, and Narrative/Mood.
  - AVOID asking things the user already said.
  - Provide 4-6 distinct options per question.
  - Enable "allowMultiple": true for questions about elements, colors, or styles.
  
  PHASE 2 (Result Generation):
  - Use generic high-quality parameters (e.g., --ar 16:9, --v 6, --stylize).
  - Describe textures, background details, and negative prompts.
  
  ${COMMON_INSTRUCTIONS}
  `,

  text: `You are a Chief Editor and Communications Strategist.
  
  GOAL: Create a prompt that ensures the LLM writes exactly what the user needs with the perfect tone.
  
  PHASE 1 (Questioning):
  - Ask about: Logical Structure, Audience Engagement, Innovative Angles, and Tone.
  - AVOID asking things the user already said.
  - Provide 4-6 distinct options per question.
  - Enable "allowMultiple": true for questions about target audience or platforms.
  
  PHASE 2 (Result Generation):
  - Include "Few-Shot" examples or structural templates.
  - Define what to avoid clearly.
  
  ${COMMON_INSTRUCTIONS}
  `
};