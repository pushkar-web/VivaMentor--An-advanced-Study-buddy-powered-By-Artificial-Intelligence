
import React, { useState, useEffect } from 'react';
import { AppView, UploadedFile, UserPlan } from './types';
import FileUpload from './components/FileUpload';
import StudyGuideGenerator from './components/StudyGuideGenerator';
import FlashcardDeck from './components/FlashcardDeck';
import VivaExaminer from './components/VivaExaminer';
import QuizMode from './components/QuizMode';
import DocumentChat from './components/DocumentChat';
import PodcastGenerator from './components/PodcastGenerator';
import KnowledgeGraph from './components/KnowledgeGraph';
import StudyPlanner from './components/StudyPlanner';
import PomodoroTimer from './components/PomodoroTimer';
import CommandPalette from './components/CommandPalette';
import EssayGrader from './components/EssayGrader';
import DebateArena from './components/DebateArena';
import PricingPage from './components/PricingPage';
import { generateKeyInsights } from './services/gemini';
import { Book, LayoutDashboard, FileText, BrainCircuit, Mic, ChevronRight, Menu, HelpCircle, MessageSquareText, Headphones, Share2, Lightbulb, Sparkles, Calendar, Trophy, Zap, Flame, Command, PenTool, Swords, Lock, Crown, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  // Gamification State with Persistence
  const [xp, setXp] = useState(() => {
      const saved = localStorage.getItem('vivamentor_xp');
      return saved ? parseInt(saved, 10) : 0;
  });
  const [level, setLevel] = useState(() => {
      const saved = localStorage.getItem('vivamentor_level');
      return saved ? parseInt(saved, 10) : 1;
  });
  const [streak, setStreak] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Upload Count State
  const [uploadCount, setUploadCount] = useState(() => {
    const saved = localStorage.getItem('vivamentor_upload_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  // User Plan State
  const [userPlan, setUserPlan] = useState<UserPlan>(() => {
      const saved = localStorage.getItem('vivamentor_plan');
      return (saved as UserPlan) || UserPlan.FREE;
  });

  // Plan Limits Definition
  const getUploadLimit = () => {
      switch(userPlan) {
          case UserPlan.FREE: return 3;
          case UserPlan.SCHOLAR: return 15;
          case UserPlan.GENIUS: return Infinity;
          default: return 3;
      }
  };

  const handleUpgrade = (plan: UserPlan) => {
      setUserPlan(plan);
      localStorage.setItem('vivamentor_plan', plan);
      setView(AppView.DASHBOARD);
      addXp(200); // Bonus XP for upgrading
  };

  // Fixed Feature Gating Logic
  const isFeatureLocked = (featureId: AppView) => {
      if (userPlan === UserPlan.GENIUS) return false;
      
      // Features available to Scholar (Locked for Free)
      // These are features that a Scholar CAN access, but a Free user CANNOT.
      const scholarExclusiveFeatures = [
          AppView.VIVA_EXAM, 
          AppView.DEBATE_ARENA, 
          AppView.ESSAY_GRADER, 
          AppView.KNOWLEDGE_GRAPH,
      ];

      // Features ONLY for Genius (Locked for Scholar AND Free)
      const geniusExclusiveFeatures = [
          AppView.PODCAST
      ];

      if (userPlan === UserPlan.FREE) {
          // Free users are locked out of both Scholar and Genius exclusive features
          return scholarExclusiveFeatures.includes(featureId) || geniusExclusiveFeatures.includes(featureId);
      }

      if (userPlan === UserPlan.SCHOLAR) {
          // Scholar users are ONLY locked out of Genius features
          return geniusExclusiveFeatures.includes(featureId);
      }

      return false;
  };

  const handleNavigate = (targetView: AppView) => {
      if (isFeatureLocked(targetView)) {
          setView(AppView.PRICING);
      } else {
          setView(targetView);
      }
      setMobileMenuOpen(false);
  };

  // Initialize Streak Logic
  useEffect(() => {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('vivamentor_last_visit');
    const savedStreak = parseInt(localStorage.getItem('vivamentor_streak') || '0', 10);
    
    if (lastVisit === today) {
        setStreak(savedStreak);
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastVisit === yesterday.toDateString()) {
            const newStreak = savedStreak + 1;
            setStreak(newStreak);
            localStorage.setItem('vivamentor_streak', newStreak.toString());
        } else {
            // Broken streak or first visit
            setStreak(1);
            localStorage.setItem('vivamentor_streak', '1');
        }
        localStorage.setItem('vivamentor_last_visit', today);
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setCommandPaletteOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Gamification Logic
  const addXp = (amount: number) => {
      setXp(prev => {
          const newXp = prev + amount;
          // Level formula: Level = floor(sqrt(XP / 100)) + 1
          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
          if (newLevel > level) {
              setLevel(newLevel);
              localStorage.setItem('vivamentor_level', newLevel.toString());
              setShowLevelUp(true);
              setTimeout(() => setShowLevelUp(false), 3000);
          }
          localStorage.setItem('vivamentor_xp', newXp.toString());
          return newXp;
      });
  };

  const handleFileUpload = async (file: UploadedFile) => {
    // Check Limits
    const limit = getUploadLimit();
    if (uploadCount >= limit) {
        // Strict check: if count equals or exceeds limit, block upload
        alert(`You have reached your file upload limit (${limit}) for the ${userPlan} plan. Please upgrade to upload more.`);
        setView(AppView.PRICING);
        return;
    }

    // Increment Upload Count
    const newCount = uploadCount + 1;
    setUploadCount(newCount);
    localStorage.setItem('vivamentor_upload_count', newCount.toString());

    setCurrentFile(file);
    setView(AppView.DASHBOARD);
    addXp(50); // XP for uploading
    
    // Generate insights immediately
    setInsights([]);
    setInsightsLoading(true);
    const generatedInsights = await generateKeyInsights(file);
    setInsights(generatedInsights);
    setInsightsLoading(false);
  };

  // Generate a mock activity heatmap based on streak
  const getHeatmapData = () => {
    const days = [];
    for (let i = 0; i < 28; i++) {
        const intensity = Math.random() > 0.6 ? Math.floor(Math.random() * 4) : 0;
        days.push(intensity);
    }
    // Make sure today has activity if we uploaded
    if (currentFile) days[27] = 3;
    return days;
  };
  const heatmapData = getHeatmapData();

  const navItems = [
    { id: AppView.DASHBOARD, label: 'Overview', icon: LayoutDashboard },
    { id: AppView.PLANNER, label: 'Study Planner', icon: Calendar },
    { id: AppView.KNOWLEDGE_GRAPH, label: 'Knowledge Graph', icon: Share2 },
    { id: AppView.STUDY_MATERIAL, label: 'Study Material', icon: FileText },
    { id: AppView.ESSAY_GRADER, label: 'Essay Grader', icon: PenTool },
    { id: AppView.DEBATE_ARENA, label: 'Debate Arena', icon: Swords },
    { id: AppView.FLASHCARDS, label: 'Flashcards', icon: BrainCircuit },
    { id: AppView.QUIZ, label: 'Quiz Mode', icon: HelpCircle },
    { id: AppView.CHAT, label: 'Chat with Doc', icon: MessageSquareText },
    { id: AppView.PODCAST, label: 'Audio Notebook', icon: Headphones },
    { id: AppView.VIVA_EXAM, label: 'Viva Examiner', icon: Mic },
  ];

  const renderContent = () => {
    if (view === AppView.PRICING) {
        return <PricingPage currentPlan={userPlan} onUpgrade={handleUpgrade} onCancel={() => setView(currentFile ? AppView.DASHBOARD : AppView.UPLOAD)} />;
    }

    if (!currentFile && view !== AppView.UPLOAD) {
      setView(AppView.UPLOAD);
      return null;
    }

    // Ensure locked features cannot be rendered even if view state is somehow set
    if (view !== AppView.UPLOAD && view !== AppView.DASHBOARD && isFeatureLocked(view)) {
        return <PricingPage currentPlan={userPlan} onUpgrade={handleUpgrade} onCancel={() => setView(AppView.DASHBOARD)} />;
    }

    switch (view) {
      case AppView.UPLOAD:
        return <FileUpload onFileUpload={handleFileUpload} usage={{ current: uploadCount, limit: getUploadLimit() }} />;
      case AppView.DASHBOARD:
        return (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h2>
                    <p className="text-slate-500">Studying: <span className="font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">{currentFile?.name}</span></p>
                </div>
                
                {/* Activity Heatmap Widget */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs text-slate-400 uppercase font-bold tracking-wider">
                        <span>Study Activity</span>
                        <span>Last 30 Days</span>
                    </div>
                    <div className="flex gap-1">
                        {heatmapData.map((val, i) => (
                            <div 
                                key={i} 
                                className={`w-2.5 h-6 rounded-sm ${
                                    val === 0 ? 'bg-slate-100' :
                                    val === 1 ? 'bg-teal-200' :
                                    val === 2 ? 'bg-teal-400' : 'bg-teal-600'
                                }`}
                                title={`Activity Level: ${val}`}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Insights Section */}
            <div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-300" /> Key Strategic Insights
                    </h3>
                    {insightsLoading ? (
                        <div className="space-y-3 opacity-50 animate-pulse">
                            <div className="h-4 bg-white/20 rounded w-3/4"></div>
                            <div className="h-4 bg-white/20 rounded w-2/3"></div>
                            <div className="h-4 bg-white/20 rounded w-1/2"></div>
                        </div>
                    ) : insights.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {insights.map((insight, idx) => (
                                <div key={idx} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-sm leading-relaxed hover:bg-white/20 transition-colors">
                                    <Lightbulb className="w-4 h-4 text-yellow-300 mb-2" />
                                    {insight}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm opacity-80">Analyzing your document for key insights...</p>
                    )}
                </div>
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div onClick={() => handleNavigate(AppView.PLANNER)} className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Study Planner</h3>
                  <p className="text-slate-500">Get a day-by-day customized schedule based on your timeline.</p>
                  <div className="mt-4 flex items-center text-teal-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Plan Schedule <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.ESSAY_GRADER)} className={`group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-pink-400 hover:shadow-md transition-all relative overflow-hidden ${isFeatureLocked(AppView.ESSAY_GRADER) ? 'opacity-80' : ''}`}>
                  {isFeatureLocked(AppView.ESSAY_GRADER) && (
                      <div className="absolute top-2 right-2 bg-slate-100 p-1.5 rounded-full z-10"><Lock className="w-4 h-4 text-slate-500" /></div>
                  )}
                  <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600 mb-4 group-hover:scale-110 transition-transform">
                    <PenTool className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Essay Grader</h3>
                  <p className="text-slate-500">Write essays on generated topics and get AI grading & feedback.</p>
                  <div className="mt-4 flex items-center text-pink-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {isFeatureLocked(AppView.ESSAY_GRADER) ? 'Upgrade to Unlock' : 'Start Writing'} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.DEBATE_ARENA)} className={`group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-red-400 hover:shadow-md transition-all relative overflow-hidden ${isFeatureLocked(AppView.DEBATE_ARENA) ? 'opacity-80' : ''}`}>
                  {isFeatureLocked(AppView.DEBATE_ARENA) && (
                      <div className="absolute top-2 right-2 bg-slate-100 p-1.5 rounded-full z-10"><Lock className="w-4 h-4 text-slate-500" /></div>
                  )}
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 mb-4 group-hover:scale-110 transition-transform">
                    <Swords className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Debate Arena</h3>
                  <p className="text-slate-500">Challenge the AI in a structured debate to test your critical thinking.</p>
                  <div className="mt-4 flex items-center text-red-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {isFeatureLocked(AppView.DEBATE_ARENA) ? 'Upgrade to Unlock' : 'Enter Arena'} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.KNOWLEDGE_GRAPH)} className={`group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all relative overflow-hidden ${isFeatureLocked(AppView.KNOWLEDGE_GRAPH) ? 'opacity-80' : ''}`}>
                  {isFeatureLocked(AppView.KNOWLEDGE_GRAPH) && (
                      <div className="absolute top-2 right-2 bg-slate-100 p-1.5 rounded-full z-10"><Lock className="w-4 h-4 text-slate-500" /></div>
                  )}
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Knowledge Graph</h3>
                  <p className="text-slate-500">Visualize concepts and relationships in an interactive mind map.</p>
                  <div className="mt-4 flex items-center text-indigo-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {isFeatureLocked(AppView.KNOWLEDGE_GRAPH) ? 'Upgrade to Unlock' : 'Explore Graph'} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.STUDY_MATERIAL)} className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Study Guides</h3>
                  <p className="text-slate-500">Generate Quick, Detailed, or Advanced PDFs based on your material.</p>
                  <div className="mt-4 flex items-center text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Generate Now <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.FLASHCARDS)} className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Flashcards</h3>
                  <p className="text-slate-500">Test your memory with AI-generated flashcards from key concepts.</p>
                  <div className="mt-4 flex items-center text-orange-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Practice <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>
               
               <div onClick={() => handleNavigate(AppView.QUIZ)} className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Quiz Mode</h3>
                  <p className="text-slate-500">Take an interactive multiple choice quiz to test your understanding.</p>
                  <div className="mt-4 flex items-center text-purple-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Quiz <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.CHAT)} className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquareText className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Ask VivaMentor</h3>
                  <p className="text-slate-500">Chat with a Socratic Tutor or play Devil's Advocate with your notes.</p>
                  <div className="mt-4 flex items-center text-teal-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Chat <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.PODCAST)} className={`group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all relative overflow-hidden ${isFeatureLocked(AppView.PODCAST) ? 'opacity-80' : ''}`}>
                  {isFeatureLocked(AppView.PODCAST) && (
                      <div className="absolute top-2 right-2 bg-slate-100 p-1.5 rounded-full z-10"><Lock className="w-4 h-4 text-slate-500" /></div>
                  )}
                  <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Audio Notebook</h3>
                  <p className="text-slate-500">Listen to an AI-generated podcast discussion about your material.</p>
                  <div className="mt-4 flex items-center text-rose-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {isFeatureLocked(AppView.PODCAST) ? 'Upgrade to Unlock' : 'Generate Audio'} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
               </div>

               <div onClick={() => handleNavigate(AppView.VIVA_EXAM)} className={`group cursor-pointer bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-md border border-slate-700 hover:shadow-xl transition-all text-white relative overflow-hidden lg:col-span-2 ${isFeatureLocked(AppView.VIVA_EXAM) ? 'opacity-90' : ''}`}>
                  {isFeatureLocked(AppView.VIVA_EXAM) && (
                      <div className="absolute top-4 right-4 bg-white/10 backdrop-blur p-2 rounded-full z-20"><Lock className="w-5 h-5 text-white" /></div>
                  )}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                            <Mic className="w-6 h-6" />
                        </div>
                        <div>
                             <h3 className="text-xl font-bold mb-1">Viva Examiner</h3>
                             <p className="text-slate-400 text-sm">Real-time voice exam with an AI professor.</p>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        );
      case AppView.PLANNER:
        return currentFile ? <StudyPlanner file={currentFile} onTaskComplete={addXp} /> : null;
      case AppView.KNOWLEDGE_GRAPH:
        return currentFile ? <KnowledgeGraph file={currentFile} /> : null;
      case AppView.STUDY_MATERIAL:
        return currentFile ? <StudyGuideGenerator file={currentFile} userPlan={userPlan} onUpgradeTrigger={() => setView(AppView.PRICING)} /> : null;
      case AppView.ESSAY_GRADER:
        return currentFile ? <EssayGrader file={currentFile} onComplete={addXp} /> : null;
      case AppView.DEBATE_ARENA:
        return currentFile ? <DebateArena file={currentFile} /> : null;
      case AppView.FLASHCARDS:
        return currentFile ? <FlashcardDeck file={currentFile} /> : null;
      case AppView.QUIZ:
        return currentFile ? <QuizMode file={currentFile} onQuizComplete={(score) => addXp(score * 10)} /> : null;
      case AppView.CHAT:
        return currentFile ? <DocumentChat file={currentFile} /> : null;
      case AppView.PODCAST:
        return currentFile ? <PodcastGenerator file={currentFile} /> : null;
      case AppView.VIVA_EXAM:
        return currentFile ? <VivaExaminer file={currentFile} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        currentFile={!!currentFile}
        userPlan={userPlan}
      />

      {/* Level Up Notification */}
      {showLevelUp && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] animate-in zoom-in fade-in duration-300">
              <div className="bg-yellow-400 text-yellow-900 p-8 rounded-3xl shadow-2xl border-4 border-yellow-200 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  <div className="relative z-10">
                    <Trophy className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-4xl font-black mb-2">LEVEL UP!</h2>
                    <p className="text-xl font-bold">You reached Level {level}</p>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar for Desktop */}
      {view !== AppView.UPLOAD && view !== AppView.PRICING && (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Book className="w-6 h-6 text-teal-600" />
              VivaMentor
            </h1>
          </div>
          
          {/* Progress Section */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 space-y-4">
             <div className="flex items-center justify-between">
                 <span className="text-xs font-bold text-slate-500 uppercase">My Progress</span>
                 <span className="text-xs font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Lvl {level}</span>
             </div>
             
             {/* Streak Badge */}
             <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-100 text-orange-700">
                <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                <span className="text-xs font-bold">{streak} Day Streak</span>
             </div>

             <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                 <div className="bg-teal-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(xp % 100)}%` }}></div>
             </div>
             <p className="text-[10px] text-right text-slate-400">{xp} XP</p>
             
             {/* Pomodoro */}
             <PomodoroTimer onComplete={() => addXp(25)} />
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const locked = isFeatureLocked(item.id);
              return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${
                  view === item.id 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${view === item.id ? 'text-teal-600' : 'text-slate-400'}`} />
                    {item.label}
                </div>
                {locked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            )})}
          </nav>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
             {userPlan === UserPlan.FREE && (
                 <button 
                    onClick={() => setView(AppView.PRICING)}
                    className="w-full mb-4 bg-gradient-to-r from-teal-50 to-emerald-500 text-white py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                 >
                     <Crown className="w-4 h-4" /> Upgrade Plan
                 </button>
             )}
             <div className="flex items-center gap-2 text-xs text-slate-400 justify-center mb-3">
                 <Command className="w-3 h-3" /> <span className="font-mono">Cmd+K</span> for actions
             </div>
             <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Current File</p>
                <p className="text-sm text-slate-800 truncate font-medium" title={currentFile?.name}>{currentFile?.name}</p>
                <button 
                    onClick={() => { setCurrentFile(null); setView(AppView.UPLOAD); }}
                    className="text-xs text-red-500 hover:text-red-700 mt-2 font-medium flex items-center gap-1"
                >
                    Change File
                </button>
             </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        {view !== AppView.UPLOAD && view !== AppView.PRICING && (
          <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Book className="w-5 h-5 text-teal-600" />
              VivaMentor
            </h1>
            <div className="flex items-center gap-4">
                 <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">Lvl {level}</div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
          </header>
        )}
        
        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && view !== AppView.UPLOAD && (
             <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 sticky top-16 z-40 shadow-lg">
                <div className="mb-4">
                     <PomodoroTimer onComplete={() => addXp(25)} />
                </div>
                {navItems.map((item) => {
                    const locked = isFeatureLocked(item.id);
                    return (
                    <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium ${
                        view === item.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </div>
                        {locked && <Lock className="w-4 h-4 text-slate-400" />}
                    </button>
                )})}
                {userPlan === UserPlan.FREE && (
                    <button 
                        onClick={() => { setView(AppView.PRICING); setMobileMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 font-bold border border-teal-100 rounded-xl mt-2 flex items-center gap-2"
                    >
                        <Crown className="w-4 h-4" /> Upgrade to Pro
                    </button>
                )}
                <button 
                    onClick={() => { setCurrentFile(null); setView(AppView.UPLOAD); setMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-red-500 font-medium border-t border-slate-100 mt-2"
                >
                    Change File
                </button>
             </div>
        )}

        <div className={`w-full flex-1 ${view === AppView.UPLOAD || view === AppView.PRICING ? 'p-0' : 'p-4 md:p-8 max-w-7xl mx-auto'}`}>
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
