import React, { useState, useEffect, useRef } from 'react';
import { UploadedFile, DebateTopic, DebateTurn, DebateResult } from '../types';
import { generateDebateTopics, getDebateResponse, judgeDebate } from '../services/gemini';
import { Swords, Gavel, User, Bot, Loader2, Trophy, AlertTriangle, Send, Scale, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DebateArenaProps {
  file: UploadedFile;
}

const DebateArena: React.FC<DebateArenaProps> = ({ file }) => {
  const [topics, setTopics] = useState<DebateTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(null);
  const [userStance, setUserStance] = useState<'Agree' | 'Disagree' | null>(null);
  
  const [history, setHistory] = useState<DebateTurn[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [round, setRound] = useState(0); // 0 = prep, 1 = opening, 2 = rebuttal, 3 = closing
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [result, setResult] = useState<DebateResult | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTopics();
  }, [file]);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [history, isAiTurn]);

  const loadTopics = async () => {
    setLoading(true);
    const generated = await generateDebateTopics(file);
    setTopics(generated);
    setLoading(false);
  };

  const startDebate = (topic: DebateTopic, stance: 'Agree' | 'Disagree') => {
      setSelectedTopic(topic);
      setUserStance(stance);
      setHistory([]);
      setRound(1);
      setResult(null);
  };

  const handleTurn = async () => {
      if (!inputText.trim() || !selectedTopic || !userStance) return;
      
      const newHistory = [...history, { speaker: 'User' as const, text: inputText }];
      setHistory(newHistory);
      setInputText('');
      setIsAiTurn(true);

      // AI Response
      const aiResponse = await getDebateResponse(file, newHistory, selectedTopic.topic, userStance);
      const updatedHistory = [...newHistory, { speaker: 'AI' as const, text: aiResponse }];
      setHistory(updatedHistory);
      setIsAiTurn(false);

      if (round < 3) {
          setRound(r => r + 1);
      } else {
          // End debate
          setLoading(true);
          const verdict = await judgeDebate(file, updatedHistory, selectedTopic.topic);
          setResult(verdict);
          setLoading(false);
      }
  };

  const reset = () => {
      setSelectedTopic(null);
      setUserStance(null);
      setHistory([]);
      setResult(null);
      setRound(0);
  };

  if (loading && topics.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
              <p>Scouting controversial topics...</p>
          </div>
      );
  }

  // 1. Selection Screen
  if (!selectedTopic) {
      return (
          <div className="max-w-4xl mx-auto p-4">
              <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Swords className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">Debate Arena</h2>
                  <p className="text-slate-500 max-w-lg mx-auto">
                      Challenge your understanding by defending a stance against the AI.
                      Select a topic extracted from your document to begin.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topics.map((t) => (
                      <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-red-200 transition-all flex flex-col justify-between group">
                          <div>
                              <h3 className="font-bold text-lg text-slate-800 mb-3 group-hover:text-red-600 transition-colors">
                                  {t.topic}
                              </h3>
                              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                  {t.context}
                              </p>
                          </div>
                          
                          <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-400 uppercase text-center mb-2">Choose your stance</p>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => startDebate(t, 'Agree')}
                                    className="flex-1 py-2 bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-green-600 border border-slate-200 hover:border-green-200 rounded-lg text-sm font-bold transition-colors"
                                  >
                                      Agree
                                  </button>
                                  <button 
                                    onClick={() => startDebate(t, 'Disagree')}
                                    className="flex-1 py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-sm font-bold transition-colors"
                                  >
                                      Disagree
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // 3. Results Screen
  if (result) {
      return (
          <div className="max-w-2xl mx-auto py-8 px-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
                  <div className={`p-8 text-center ${result.winner === 'User' ? 'bg-green-600' : result.winner === 'AI' ? 'bg-red-600' : 'bg-slate-600'}`}>
                      <Trophy className="w-16 h-16 text-white/90 mx-auto mb-4" />
                      <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-widest">
                          {result.winner === 'User' ? 'Victory!' : result.winner === 'AI' ? 'Defeat' : 'Draw'}
                      </h2>
                      <p className="text-white/80 font-medium text-lg">
                          User {result.userScore} - {result.aiScore} AI
                      </p>
                  </div>

                  <div className="p-8 space-y-8">
                      <div className="bg-slate-50 p-6 rounded-xl border-l-4 border-slate-300">
                          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                              <Gavel className="w-5 h-5 text-slate-500" /> Judge's Verdict
                          </h3>
                          <p className="text-slate-700 leading-relaxed italic">
                              "{result.feedback}"
                          </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-green-100 bg-green-50">
                              <h4 className="text-xs font-bold text-green-700 uppercase mb-2">Your Strongest Point</h4>
                              <p className="text-sm text-green-800">{result.keyPointUser}</p>
                          </div>
                          <div className="p-4 rounded-xl border border-red-100 bg-red-50">
                              <h4 className="text-xs font-bold text-red-700 uppercase mb-2">Opponent's Strongest Point</h4>
                              <p className="text-sm text-red-800">{result.keyPointAI}</p>
                          </div>
                      </div>

                      <button 
                        onClick={reset}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                          <Swords className="w-5 h-5" /> Return to Arena
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // 2. Debate Interface
  return (
      <div className="max-w-4xl mx-auto h-[700px] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
          
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center z-10 shadow-md">
              <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-600 rounded-lg">
                      <Swords className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <h2 className="font-bold text-lg leading-tight">Round {round}/3</h2>
                      <p className="text-xs text-slate-400 max-w-md truncate">{selectedTopic.topic}</p>
                  </div>
              </div>
              <div className="flex items-center gap-6 text-sm font-bold">
                  <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-400" /> You ({userStance})
                  </div>
                  <div className="text-slate-600">vs</div>
                  <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-red-400" /> AI ({userStance === 'Agree' ? 'Disagree' : 'Agree'})
                  </div>
              </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
              {/* Intro System Message */}
              <div className="flex justify-center">
                  <div className="bg-slate-200 text-slate-600 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-2">
                      <Scale className="w-3 h-3" /> Judge is watching
                  </div>
              </div>

              {history.map((turn, i) => (
                  <div key={i} className={`flex gap-4 ${turn.speaker === 'User' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                          turn.speaker === 'User' ? 'bg-white border-green-500' : 'bg-slate-900 border-red-500'
                      }`}>
                          {turn.speaker === 'User' ? <User className="w-5 h-5 text-green-600"/> : <Bot className="w-5 h-5 text-red-500"/>}
                      </div>
                      
                      <div className={`max-w-[80%] rounded-2xl p-5 text-sm leading-relaxed shadow-sm ${
                          turn.speaker === 'User' 
                          ? 'bg-white text-slate-800 rounded-tr-none border border-green-100' 
                          : 'bg-white text-slate-800 rounded-tl-none border-l-4 border-l-red-500 border-y border-r border-slate-200'
                      }`}>
                          <ReactMarkdown>{turn.text}</ReactMarkdown>
                      </div>
                  </div>
              ))}

              {isAiTurn && (
                   <div className="flex gap-4 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-red-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-red-500"/>
                      </div>
                      <div className="bg-white border-l-4 border-l-red-500 border-y border-r border-slate-200 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          <span className="text-xs font-bold text-slate-400">Formulating rebuttal...</span>
                      </div>
                   </div>
              )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-200">
             {loading ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400 mb-2" />
                      <p className="text-sm font-bold">Judge is deliberating...</p>
                  </div>
             ) : (
                 <div className="relative max-w-4xl mx-auto">
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={round === 1 ? "Make your opening statement..." : round === 3 ? "Make your closing argument..." : "Rebut the opponent's point..."}
                        className="w-full pl-4 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-slate-700 resize-none h-24"
                    />
                    <button 
                        onClick={handleTurn}
                        disabled={!inputText.trim() || isAiTurn}
                        className="absolute right-3 bottom-3 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                    <div className="absolute top-2 right-4 text-xs font-bold text-slate-300 uppercase pointer-events-none">
                        {round === 1 ? 'Opening' : round === 2 ? 'Rebuttal' : 'Closing'}
                    </div>
                 </div>
             )}
          </div>
      </div>
  );
};

export default DebateArena;