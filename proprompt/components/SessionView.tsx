import React, { useState, useRef, useEffect } from 'react';
import { Mode, AppConfig, Message, SessionState, QuestionOption, QuestionHistoryItem, Language } from '../types';
import { SYSTEM_PROMPTS, I18N } from '../constants';
import { callAI } from '../services/api';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Copy,
  RefreshCw,
  Terminal,
  Image as ImageIcon,
  FileText,
  X,
  Edit3,
  AlertCircle,
  CheckSquare
} from 'lucide-react';

interface SessionViewProps {
  mode: Mode;
  config: AppConfig;
  language: Language;
  onBack: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({ mode, config, language, onBack }) => {
  const t = I18N[language];
  const [session, setSession] = useState<SessionState>({
    rawHistory: [],
    questionHistory: [],
    status: 'idle'
  });
  
  const [userInput, setUserInput] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [supplementaryInput, setSupplementaryInput] = useState('');
  
  // New state for multi-select
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session.questionHistory.length, session.status, session.currentQuestion]);

  // Reset multi-select state when question changes
  useEffect(() => {
    setSelectedOptions([]);
  }, [session.currentQuestion]);

  // --- Logic ---

  const handleError = (err: any) => {
    setSession(prev => ({
      ...prev,
      status: 'error',
      error: err instanceof Error ? err.message : 'An unknown error occurred'
    }));
  };

  const processAIResponse = async (history: Message[]) => {
    try {
      const response = await callAI(config.baseUrl, config.apiKey, config.model, history);
      
      const newHistory = [...history, { role: 'assistant', content: JSON.stringify(response) } as Message];

      if (response.type === 'question') {
        // UI SAFEGUARD: Ensure content exists
        if (!response.content || !response.content.question) {
          throw new Error("Received malformed question from AI.");
        }
        
        setSession(prev => ({
          ...prev,
          rawHistory: newHistory,
          status: 'question',
          currentQuestion: response.content
        }));
      } else {
        // AI wants to give a result, but we INTERCEPT it for supplementary input
        setSession(prev => ({
          ...prev,
          rawHistory: newHistory, // We store the state where AI *was ready*
          status: 'supplementary',
          currentQuestion: undefined
        }));
      }
    } catch (err) {
      handleError(err);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const initialMessage: Message = { role: 'user', content: userInput };
    const systemMessage: Message = { role: 'system', content: SYSTEM_PROMPTS[mode] };
    
    // Inject Language Instruction
    if (language === 'zh') {
      systemMessage.content += "\n IMPORTANT: All your questions and options MUST be in CHINESE. The final 'prompt_en' result must be English, 'prompt_zh' in Chinese.";
    }

    const newHistory: Message[] = [systemMessage, initialMessage];

    setSession({
      rawHistory: newHistory,
      questionHistory: [],
      status: 'analyzing'
    });

    await processAIResponse(newHistory);
  };

  const handleOptionClick = (value: string, label: string) => {
    if (session.currentQuestion?.allowMultiple) {
      // Multi-select logic
      setSelectedOptions(prev => {
        if (prev.includes(value)) {
          return prev.filter(v => v !== value);
        } else {
          return [...prev, value];
        }
      });
    } else {
      // Single select logic - submit immediately
      handleAnswer(value, label);
    }
  };

  const submitMultiSelection = () => {
    if (!session.currentQuestion) return;
    
    if (selectedOptions.length === 0) {
      // If nothing selected, maybe force them to select or treat as skip? 
      // Let's assume they must select at least one, or use the skip button.
      return;
    }

    // Find labels for selected values
    const labels = selectedOptions.map(val => {
      const opt = session.currentQuestion?.options.find(o => o.value === val);
      return opt ? opt.label : val;
    });

    const combinedValue = selectedOptions.join(', ');
    const combinedLabel = labels.join(', ');

    handleAnswer(combinedValue, combinedLabel);
  };

  const handleAnswer = async (answerValue: string, answerLabel: string) => {
    if (!session.currentQuestion) return;

    // Record the Q&A for UI rendering
    const historyItem: QuestionHistoryItem = {
      question: session.currentQuestion,
      answerLabel,
      answerValue
    };

    const userMsg: Message = { 
      role: 'user', 
      content: `Selected/Input Answer: ${answerValue}` 
    };

    const nextHistory = [...session.rawHistory, userMsg];

    setSession(prev => ({
      ...prev,
      rawHistory: nextHistory,
      questionHistory: [...prev.questionHistory, historyItem],
      status: 'analyzing',
      currentQuestion: undefined
    }));

    setCustomAnswer(''); // Reset custom input
    await processAIResponse(nextHistory);
  };

  const handleSupplementarySubmit = async () => {
    // User submits final details
    const finalNote = supplementaryInput.trim() || "No extra information.";
    
    const userMsg: Message = {
      role: 'user',
      content: `Here is some final supplementary information from the user: "${finalNote}". \n\n NOW, please generate the final "type": "result" JSON based on everything we discussed.`
    };

    const nextHistory = [...session.rawHistory, userMsg];

    setSession(prev => ({
      ...prev,
      rawHistory: nextHistory,
      status: 'final_generating'
    }));

    try {
      const response = await callAI(config.baseUrl, config.apiKey, config.model, nextHistory);
      if (response.type === 'result') {
        setSession(prev => ({
          ...prev,
          rawHistory: [...nextHistory, { role: 'assistant', content: JSON.stringify(response) }],
          status: 'result',
          result: response.content
        }));
      } else {
        // If AI acts dumb and asks another question, just loop back
        setSession(prev => ({
          ...prev,
          rawHistory: [...nextHistory, { role: 'assistant', content: JSON.stringify(response) }],
          status: 'question',
          currentQuestion: response.content
        }));
      }
    } catch (err) {
      handleError(err);
    }
  };

  // --- Render Helpers ---

  const getModeIcon = () => {
    switch (mode) {
      case 'coding': return <Terminal className="w-6 h-6 text-blue-500" />;
      case 'image': return <ImageIcon className="w-6 h-6 text-purple-500" />;
      case 'text': return <FileText className="w-6 h-6 text-green-500" />;
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'coding': return t.codingTitle;
      case 'image': return t.imageTitle;
      case 'text': return t.textTitle;
    }
  };

  // Input Validation Logic
  const isInputShort = userInput.length > 0 && userInput.length < 50;
  const isMultiSelect = session.currentQuestion?.allowMultiple;

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-white shadow-xl md:my-8 md:rounded-2xl md:h-[calc(100vh-4rem)] overflow-hidden border border-slate-100 relative">
      
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {getModeIcon()}
            <h1 className="text-xl font-bold text-slate-800">{getModeTitle()}</h1>
          </div>
        </div>
        <button 
          onClick={() => setSession({ rawHistory: [], questionHistory: [], status: 'idle' })}
          className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> {t.restart}
        </button>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50">
        
        {/* Initial Input */}
        {session.status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center animate-fade-in-up">
            <div className="p-4 bg-blue-100 rounded-full mb-6">
               {getModeIcon()}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.startTitle}</h2>
            
            <form onSubmit={handleStart} className="w-full relative mt-6">
              <div className="relative">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={t.startPlaceholder}
                  className="w-full px-6 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all pr-14 min-h-[120px] resize-none"
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={!userInput.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              {/* Length Warning */}
              {isInputShort && (
                <div className="flex items-center gap-2 mt-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'zh' 
                      ? "描述可能太短，建议补充更多细节以获得准确结果，但您仍可继续。" 
                      : "Description might be too short. Adding more details is recommended, but you can proceed."}
                  </span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* History Stack (Previous Questions) */}
        {session.questionHistory.map((item, idx) => (
          <div key={idx} className="w-full max-w-3xl mx-auto opacity-70 hover:opacity-100 transition-opacity">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 pointer-events-none">
              <h3 className="text-lg font-bold text-slate-700 mb-4">{item.question.question}</h3>
              <div className="grid gap-2">
                {/* SAFEGUARD: Add optional chaining ?. before map */}
                {item.question.options?.map((opt, i) => {
                  // Check if this option was part of the answer (handling comma-separated string)
                  const isSelected = item.answerValue.includes(opt.value);
                  return (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        isSelected 
                          ? 'bg-green-50 border-green-500 text-green-800' 
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    </div>
                  );
                })}
              </div>
               <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
                  <span className="font-semibold">Answer:</span> {item.answerLabel}
               </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {(session.status === 'analyzing' || session.status === 'loading') && (
          <div className="flex justify-center py-4 animate-fade-in">
             <div className="bg-white border border-slate-200 px-6 py-3 rounded-full shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-slate-600 font-medium">{t.analyzing}</span>
             </div>
          </div>
        )}

        {/* Active Question Card */}
        {session.status === 'question' && session.currentQuestion && (
           <div className="w-full max-w-3xl mx-auto animate-fade-in-up" ref={scrollRef}>
             <div className="bg-white border-2 border-blue-100 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                     <h3 className="text-xl font-bold text-slate-800 mb-2">{session.currentQuestion.question}</h3>
                     {isMultiSelect && (
                       <span className="shrink-0 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                         Multi-Select
                       </span>
                     )}
                  </div>
                  {session.currentQuestion.description && (
                    <p className="text-slate-500">{session.currentQuestion.description}</p>
                  )}
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Predefined Options */}
                  <div className="grid gap-3">
                    {/* SAFEGUARD: Add optional chaining ?. before map */}
                    {session.currentQuestion.options?.map((option, idx) => {
                      const isSelected = selectedOptions.includes(option.value);
                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(option.value, option.label)}
                          className={`group relative flex flex-col items-start p-4 border rounded-xl transition-all text-left bg-white
                            ${isSelected 
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between w-full">
                            <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                              {option.label}
                            </span>
                            {isMultiSelect ? (
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                              </div>
                            ) : (
                               <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                               </div>
                            )}
                          </div>
                          
                          {option.description && (
                            <span className="text-sm text-slate-500 mt-1">{option.description}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Multi-Select Confirm Button */}
                  {isMultiSelect && (
                    <div className="pt-2">
                      <button
                        onClick={submitMultiSelection}
                        disabled={selectedOptions.length === 0}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <CheckSquare className="w-5 h-5" />
                        {t.confirmSelection}
                      </button>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-slate-400 text-sm">OR</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  {/* Custom Input */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" /> {t.customOption}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={customAnswer}
                        onChange={(e) => setCustomAnswer(e.target.value)}
                        placeholder={t.customPlaceholder}
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customAnswer.trim()) {
                            e.preventDefault();
                            if (isMultiSelect) {
                                // Add to selection list if multi
                                if (!selectedOptions.includes(customAnswer)) {
                                  setSelectedOptions(prev => [...prev, customAnswer]);
                                  setCustomAnswer('');
                                }
                            } else {
                                handleAnswer(customAnswer, customAnswer);
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                           if (isMultiSelect) {
                              if (customAnswer.trim() && !selectedOptions.includes(customAnswer)) {
                                setSelectedOptions(prev => [...prev, customAnswer]);
                                setCustomAnswer('');
                              }
                           } else {
                             handleAnswer(customAnswer, customAnswer);
                           }
                        }}
                        disabled={!customAnswer.trim()}
                        className="px-4 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isMultiSelect ? <CheckCircle2 className="w-5 h-5"/> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Skip */}
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => handleAnswer("SKIP_QUESTION", t.skip)}
                      className="text-slate-400 hover:text-slate-600 text-sm underline"
                    >
                      {t.skip}
                    </button>
                  </div>
                </div>
             </div>
           </div>
        )}

        {/* Supplementary Input Phase */}
        {session.status === 'supplementary' && (
           <div className="w-full max-w-2xl mx-auto animate-fade-in-up" ref={scrollRef}>
             <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-3">{t.supplementaryTitle}</h2>
                <p className="text-indigo-100 mb-6">
                  {t.supplementaryDesc}
                </p>
                <textarea
                  value={supplementaryInput}
                  onChange={(e) => setSupplementaryInput(e.target.value)}
                  placeholder={t.supplementaryPlaceholder}
                  className="w-full h-32 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-200 focus:bg-white/20 outline-none resize-none mb-6"
                />
                <button
                  onClick={handleSupplementarySubmit}
                  className="w-full py-4 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                   {t.generate} <Send className="w-5 h-5" />
                </button>
             </div>
           </div>
        )}

        {/* Final Generating Loader */}
        {session.status === 'final_generating' && (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in" ref={scrollRef}>
             <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
             <h3 className="text-xl font-bold text-slate-700">{t.generating}</h3>
          </div>
        )}

        <div className="h-12"></div>
      </div>

      {/* Result Full Screen Overlay/Modal */}
      {session.status === 'result' && session.result && (
        <div className="absolute inset-0 z-50 bg-slate-50 overflow-y-auto animate-fade-in">
          <div className="max-w-4xl mx-auto p-6 md:p-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900">{t.resultTitle}</h2>
              <button 
                 onClick={() => setSession(prev => ({ ...prev, status: 'supplementary' }))}
                 className="p-2 hover:bg-slate-200 rounded-full"
                 title={t.back}
              >
                <X className="w-8 h-8 text-slate-500" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Left Col: Analysis */}
              <div className="md:col-span-1 space-y-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Quality Score</span>
                      <span className={`text-2xl font-black ${session.result.score > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                        {session.result.score}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
                      <div 
                        className={`h-2 rounded-full ${session.result.score > 80 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                        style={{ width: `${session.result.score}%` }}
                      ></div>
                    </div>

                    <h4 className="font-bold text-slate-800 mb-2">{t.strengths}</h4>
                    {/* FIXED: Added optional chaining here to prevent crash if strengths is missing */}
                    <ul className="text-sm text-slate-600 space-y-2 mb-6">
                      {session.result.analysis?.strengths?.map((s, i) => (
                        <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {s}</li>
                      ))}
                    </ul>

                    <h4 className="font-bold text-slate-800 mb-2">{t.suggestions}</h4>
                    <p className="text-sm text-slate-600 italic">
                      {session.result.analysis?.suggestions}
                    </p>
                 </div>
              </div>

              {/* Right Col: Prompts */}
              <div className="md:col-span-2 space-y-6">
                 <PromptCard title="English Prompt (Recommended)" content={session.result.prompt_en} copyLabel={t.copy} />
                 <PromptCard title="Chinese Prompt" content={session.result.prompt_zh} copyLabel={t.copy} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {session.status === 'error' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50">
           <AlertTriangle className="w-6 h-6" />
           <span>{session.error}</span>
           <button onClick={() => setSession(prev => ({ ...prev, status: 'idle' }))} className="underline font-bold">Retry</button>
        </div>
      )}
    </div>
  );
};

const PromptCard: React.FC<{ title: string, content: string, copyLabel: string }> = ({ title, content, copyLabel }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
         <span className="font-bold text-slate-700">{title}</span>
         <button onClick={handleCopy} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : copyLabel}
         </button>
      </div>
      <div className="p-6 bg-slate-50/10">
        <textarea 
          readOnly 
          value={content}
          className="w-full h-64 bg-transparent resize-none outline-none font-mono text-sm text-slate-800 leading-relaxed"
        />
      </div>
    </div>
  );
}