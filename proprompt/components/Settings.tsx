import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { Settings as SettingsIcon, Save, X } from 'lucide-react';

interface SettingsProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onCancel?: () => void;
  isFirstRun?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ config, onSave, onCancel, isFirstRun = false }) => {
  const [formData, setFormData] = useState<AppConfig>(config);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            {isFirstRun ? 'Welcome Setup' : 'API Settings'}
          </h2>
          {!isFirstRun && onCancel && (
            <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-500 mb-4">
            {isFirstRun 
              ? "To get started, please configure your OpenAI-compatible API provider." 
              : "Update your API connection settings below."}
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
            <input
              type="text"
              required
              placeholder="https://api.openai.com/v1"
              value={formData.baseUrl}
              onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">Must include protocol (http/https). Example: https://api.openai.com/v1</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="password"
              required
              placeholder="sk-..."
              value={formData.apiKey}
              onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Model Name</label>
            <input
              type="text"
              required
              placeholder="gpt-4o"
              value={formData.model}
              onChange={e => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};