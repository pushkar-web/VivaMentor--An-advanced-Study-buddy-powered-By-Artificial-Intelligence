import React, { useState, useEffect } from 'react';
import { UploadedFile, EssayPrompt, EssayFeedback } from '../types';
import { generateEssayPrompts, gradeEssay } from '../services/gemini';
import { Loader2, PenTool, CheckCircle2, AlertCircle, BookOpen, ChevronRight, Award, BarChart3, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface EssayGraderProps {
  file: UploadedFile;
  onComplete?: (xp: number) => void;
}

const EssayGrader: React.FC<EssayGraderProps> = ({ file, onComplete }) => {
  const [prompts, setPrompts] = useState<EssayPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<EssayPrompt | null>(null);
  const [essayText, setEssayText] = useState('');
  const [feedback, setFeedback] = useState<EssayFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, [file]);

  const loadPrompts = async () => {
    setLoading(true);
    setFeedback(null);
    setSelectedPrompt(null);
    setEssayText('');
    const result = await generateEssayPrompts(file);
    setPrompts(result);
    setLoading(false);
  };

  const handleGrade = async () => {
    if (!selectedPrompt || !essayText.trim()) return;
    setGrading(true);
    const result = await gradeEssay(file, selectedPrompt.prompt, essayText);
    setFeedback(result);
    setGrading(false);
    if (result && onComplete) {
        onComplete(50); // Award XP
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600 mb-4" />
        <p>Analyzing document to generate essay topics...</p>
      </div>
    );
  }

  if (feedback) {
      return (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
                      <div>
                          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                              <Award className="w-6 h-6 text-yellow-400" /> Assessment Result
                          </h2>
                          <p className="text-slate-400 text-sm">Graded by VivaMentor AI</p>
                      </div>
                      <div className="text-center">
                          <div className={`text-5xl font-black ${feedback.score >= 80 ? 'text-green-400' : feedback.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {feedback.letterGrade}
                          </div>
                          <div className="text-sm font-bold opacity-80">{feedback.score}/100</div>
                      </div>
                  </div>

                  <div className="p-8 space-y-8">
                      {/* General Feedback */}
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <h3 className="font-bold text-slate-800 mb-3 uppercase text-sm tracking-wide">Overall Feedback</h3>
                          <p className="text-slate-700 leading-relaxed italic">"{feedback.generalFeedback}"</p>
                      </div>

                      {/* Rubric Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[
                              { title: 'Thesis & Argument', data: feedback.rubric.thesis, color: 'bg-blue-50 border-blue-100 text-blue-700' },
                              { title: 'Evidence Usage', data: feedback.rubric.evidence, color: 'bg-teal-50 border-teal-100 text-teal-700' },
                              { title: 'Clarity & Flow', data: feedback.rubric.clarity, color: 'bg-purple-50 border-purple-100 text-purple-700' },
                          ].map((item, i) => (
                              <div key={i} className={`p-4 rounded-xl border ${item.color} bg-opacity-50`}>
                                  <div className="flex justify-between items-center mb-2">
                                      <h4 className="font-bold text-xs uppercase">{item.title}</h4>
                                      <span className="font-black text-lg">{item.data.score}/10</span>
                                  </div>
                                  <p className="text-xs leading-snug opacity-90">{item.data.feedback}</p>
                              </div>
                          ))}
                      </div>

                      {/* Corrections */}
                      <div>
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <RefreshCw className="w-5 h-5 text-teal-600" /> Key Improvements
                          </h3>
                          <ul className="space-y-3">
                              {feedback.corrections.map((corr, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                      <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                      {corr}
                                  </li>
                              ))}
                          </ul>
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                          <button 
                            onClick={() => setFeedback(null)}
                            className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                          >
                              Edit Essay
                          </button>
                          <button 
                            onClick={loadPrompts}
                            className="px-6 py-2.5 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors shadow-md"
                          >
                              New Assignment
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {!selectedPrompt ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 fade-in">
                <div className="md:col-span-3 mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <PenTool className="w-6 h-6 text-teal-600" /> Select an Assignment
                    </h2>
                    <p className="text-slate-500">Choose a prompt to practice your writing skills. The AI will grade your response.</p>
                </div>
                {prompts.map((p) => (
                    <div 
                        key={p.id} 
                        onClick={() => setSelectedPrompt(p)}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-400 cursor-pointer transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-3 ${
                                p.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                                {p.difficulty}
                            </span>
                            <h3 className="font-bold text-slate-800 leading-snug mb-4 group-hover:text-teal-700 transition-colors">
                                {p.prompt}
                            </h3>
                        </div>
                        <div className="flex items-center text-teal-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            Start Writing <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[700px] animate-in zoom-in-95 fade-in">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <button onClick={() => setSelectedPrompt(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider hover:underline">
                                 Change Prompt
                             </button>
                             <span className="text-slate-300">•</span>
                             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedPrompt.difficulty}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 max-w-2xl">{selectedPrompt.prompt}</h3>
                    </div>
                </div>

                <textarea
                    value={essayText}
                    onChange={(e) => setEssayText(e.target.value)}
                    placeholder="Type your essay here..."
                    className="flex-1 w-full p-8 text-lg text-slate-900 bg-white leading-relaxed outline-none resize-none font-serif placeholder:text-slate-400"
                    spellCheck={false}
                />

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                         {essayText.split(/\s+/).filter(w => w.length > 0).length} Words
                     </span>
                     <button 
                        onClick={handleGrade}
                        disabled={grading || essayText.length < 50}
                        className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                     >
                         {grading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                         {grading ? "Grading..." : "Submit for Grading"}
                     </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default EssayGrader;