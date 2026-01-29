import React, { useState, useEffect } from 'react';
import { AppConfig, Mode, Language } from './types';
import { DEFAULT_CONFIG } from './constants';
import { Dashboard } from './components/Dashboard';
import { SessionView } from './components/SessionView';
import { Settings } from './components/Settings';
import { Globe } from 'lucide-react';

function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMode, setCurrentMode] = useState<Mode | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  // Load config on mount
  useEffect(() => {
    const saved = localStorage.getItem('prompt_master_config');
    if (saved) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }
    setIsConfigLoaded(true);
  }, []);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('prompt_master_config', JSON.stringify(newConfig));
    setShowSettings(false);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  if (!isConfigLoaded) return null;

  // Force setup if no API key
  if (!config.apiKey) {
    return (
      <Settings 
        config={config} 
        onSave={handleSaveConfig} 
        isFirstRun={true} 
      />
    );
  }

  return (
    <div className="font-sans relative">
      {/* Global Language Switcher */}
      <button 
        onClick={toggleLanguage}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-1.5 rounded-full shadow-sm text-sm font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
      >
        <Globe className="w-4 h-4" />
        {language === 'en' ? 'EN' : '中文'}
      </button>

      {showSettings && (
        <Settings 
          config={config} 
          onSave={handleSaveConfig} 
          onCancel={() => setShowSettings(false)} 
        />
      )}

      {currentMode ? (
        <SessionView 
          mode={currentMode} 
          config={config}
          language={language}
          onBack={() => setCurrentMode(null)} 
        />
      ) : (
        <Dashboard 
          language={language}
          onSelectMode={setCurrentMode} 
          onOpenSettings={() => setShowSettings(true)} 
        />
      )}
    </div>
  );
}

export default App;