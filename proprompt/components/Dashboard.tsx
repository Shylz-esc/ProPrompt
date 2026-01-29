import React from 'react';
import { Mode, Language } from '../types';
import { I18N } from '../constants';
import { Terminal, Image as ImageIcon, FileText, Settings as SettingsIcon } from 'lucide-react';

interface DashboardProps {
  language: Language;
  onSelectMode: (mode: Mode) => void;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ language, onSelectMode, onOpenSettings }) => {
  const t = I18N[language];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center justify-center animate-fade-in">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
              {t.title}
            </h1>
            <p className="text-slate-500 text-lg">
              {t.subtitle}
            </p>
          </div>
          <button 
            onClick={onOpenSettings}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-100 hover:shadow-md transition-all"
            title={t.settings}
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <ModeCard 
            icon={<Terminal className="w-8 h-8 text-blue-500" />}
            title={t.codingTitle}
            description={t.codingDesc}
            color="hover:border-blue-500 hover:shadow-blue-100"
            onClick={() => onSelectMode('coding')}
          />
          <ModeCard 
            icon={<ImageIcon className="w-8 h-8 text-purple-500" />}
            title={t.imageTitle}
            description={t.imageDesc}
            color="hover:border-purple-500 hover:shadow-purple-100"
            onClick={() => onSelectMode('image')}
          />
          <ModeCard 
            icon={<FileText className="w-8 h-8 text-green-500" />}
            title={t.textTitle}
            description={t.textDesc}
            color="hover:border-green-500 hover:shadow-green-100"
            onClick={() => onSelectMode('text')}
          />
        </div>
      </div>
    </div>
  );
};

const ModeCard: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
  onClick: () => void;
}> = ({ icon, title, description, color, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-start text-left p-8 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${color} group h-full`}
    >
      <div className="mb-6 p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">
        {description}
      </p>
    </button>
  );
};