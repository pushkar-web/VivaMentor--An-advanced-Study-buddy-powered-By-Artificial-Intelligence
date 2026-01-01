
import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, LayoutDashboard, Calendar, Share2, FileText, BrainCircuit, HelpCircle, MessageSquareText, Headphones, Mic, X, PenTool, Swords, CreditCard, Lock } from 'lucide-react';
import { AppView, UserPlan } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  currentFile: boolean;
  userPlan: UserPlan;
}

interface Action {
    id: string;
    label: string;
    icon: React.ElementType;
    shortcut?: string;
    view?: AppView;
    action?: () => void;
    requiresFile?: boolean;
    minPlan?: UserPlan;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, currentFile, userPlan }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: Action[] = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, view: AppView.DASHBOARD, requiresFile: true },
    { id: 'planner', label: 'Open Study Planner', icon: Calendar, view: AppView.PLANNER, requiresFile: true },
    { id: 'guide', label: 'Generate Study Guide', icon: FileText, view: AppView.STUDY_MATERIAL, requiresFile: true },
    { id: 'flashcards', label: 'Practice Flashcards', icon: BrainCircuit, view: AppView.FLASHCARDS, requiresFile: true },
    { id: 'quiz', label: 'Start Quiz Mode', icon: HelpCircle, view: AppView.QUIZ, requiresFile: true },
    { id: 'chat', label: 'Chat with Document', icon: MessageSquareText, view: AppView.CHAT, requiresFile: true },
    
    // Scholar Features
    { id: 'essay', label: 'Essay Grader', icon: PenTool, view: AppView.ESSAY_GRADER, requiresFile: true, minPlan: UserPlan.SCHOLAR },
    { id: 'debate', label: 'Enter Debate Arena', icon: Swords, view: AppView.DEBATE_ARENA, requiresFile: true, minPlan: UserPlan.SCHOLAR },
    { id: 'graph', label: 'View Knowledge Graph', icon: Share2, view: AppView.KNOWLEDGE_GRAPH, requiresFile: true, minPlan: UserPlan.SCHOLAR },
    { id: 'viva', label: 'Start Viva Examiner', icon: Mic, view: AppView.VIVA_EXAM, requiresFile: true, minPlan: UserPlan.SCHOLAR },
    
    // Genius Features
    { id: 'podcast', label: 'Create Audio Notebook', icon: Headphones, view: AppView.PODCAST, requiresFile: true, minPlan: UserPlan.GENIUS },
    
    { id: 'pricing', label: 'Upgrade Plan / Pricing', icon: CreditCard, view: AppView.PRICING, requiresFile: false },
    { id: 'upload', label: 'Upload New File', icon: FileText, view: AppView.UPLOAD, requiresFile: false },
  ];

  const isLocked = (minPlan?: UserPlan) => {
      if (!minPlan) return false;
      if (userPlan === UserPlan.GENIUS) return false;
      if (userPlan === UserPlan.SCHOLAR && minPlan === UserPlan.GENIUS) return true;
      if (userPlan === UserPlan.FREE && (minPlan === UserPlan.SCHOLAR || minPlan === UserPlan.GENIUS)) return true;
      return false;
  };

  const filteredActions = actions.filter(action => {
      if (action.requiresFile && !currentFile) return false;
      return action.label.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 50);
        setQuery('');
        setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredActions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            executeAction(filteredActions[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex]);

  const executeAction = (action: Action) => {
      if (action.view) {
          onNavigate(action.view);
      } else if (action.action) {
          action.action();
      }
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200" onClick={onClose}>
        <div 
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center px-4 py-3 border-b border-slate-100">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Type a command or search..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-lg"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                />
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">ESC</span>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto py-2">
                {filteredActions.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                        No results found for "{query}"
                    </div>
                ) : (
                    filteredActions.map((action, index) => {
                        const locked = isLocked(action.minPlan);
                        return (
                        <button
                            key={action.id}
                            onClick={() => executeAction(action)}
                            className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                                index === selectedIndex ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <action.icon className={`w-5 h-5 ${index === selectedIndex ? 'text-teal-600' : 'text-slate-400'}`} />
                                <span className={`font-medium ${index === selectedIndex ? 'font-semibold' : ''}`}>{action.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {locked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                                {index === selectedIndex && <ArrowRight className="w-4 h-4 text-teal-600" />}
                            </div>
                        </button>
                    )})
                )}
            </div>
            
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                <span>Navigate with <span className="font-mono bg-white px-1 rounded border">↑</span> <span className="font-mono bg-white px-1 rounded border">↓</span></span>
                <span>Select with <span className="font-mono bg-white px-1 rounded border">Enter</span></span>
            </div>
        </div>
    </div>
  );
};

export default CommandPalette;
