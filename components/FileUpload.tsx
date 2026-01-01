
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, Sparkles, BrainCircuit, Mic, FileType, CheckCircle2, ArrowRight, Zap, GraduationCap, BarChart3, Layers, Github, Twitter, Share2, Music, Calendar, Clock, File } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  usage?: { current: number; limit: number };
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, usage }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFile(e.dataTransfer.files?.[0]);
  };

  const processFile = (file: File | undefined) => {
    setError(null);
    if (file) {
      // Extended validation for PDF, Docs, PPT, Text, Code
      const supportedExtensions = [
          '.pdf', '.txt', '.md', '.json', '.html', '.js', '.ts', '.csv', 
          '.doc', '.docx', '.ppt', '.pptx'
      ];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!supportedExtensions.includes(ext) && !file.type.includes('image') && !file.type.includes('pdf')) {
          setError(`Unsupported file type: ${ext}. Please upload a PDF, Word, PowerPoint, or Text file.`);
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Extract base64 part
        const base64Data = result.split(',')[1];
        
        // Improve mime type detection for common office formats
        let type = file.type;
        if (!type || type === '') {
             if (file.name.endsWith('.pdf')) type = 'application/pdf';
             else if (file.name.endsWith('.txt')) type = 'text/plain';
             else if (file.name.endsWith('.md')) type = 'text/plain';
             else if (file.name.endsWith('.json')) type = 'application/json';
             else if (file.name.endsWith('.csv')) type = 'text/csv';
             else if (file.name.endsWith('.docx')) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
             else if (file.name.endsWith('.pptx')) type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
             else type = 'text/plain'; // Fallback
        }

        onFileUpload({
          name: file.name,
          type: type,
          data: base64Data
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
        
        {/* Background Grid Pattern */}
        <div className="fixed inset-0 z-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: 0.4
        }}></div>

        {/* Navbar */}
        <nav className="flex justify-between items-center px-6 py-4 md:px-12 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">V</div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">Viva<span className="text-teal-600">Mentor</span></span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                <a href="#features" className="hover:text-teal-600 transition-colors">Features</a>
                <a href="#how-it-works" className="hover:text-teal-600 transition-colors">How it Works</a>
                <a href="https://github.com/pushkar-web/VivaMentor--An-advanced-Study-buddy-powered-By-Artificial-Intelligence" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
                    <Github className="w-4 h-4" /> Star on GitHub
                </a>
            </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-24 md:pt-24 md:pb-32 relative z-10">
            
            {/* Animated Ambient Blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300 rounded-full blur-[100px] opacity-20 -z-10 animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-300 rounded-full blur-[100px] opacity-20 -z-10 animate-pulse delay-700"></div>

            <div className="text-center max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                  New: Real-time Viva Examiner Mode
               </div>
               
               <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
                   Master Any Subject with <br />
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-600">AI-Powered Active Recall</span>
               </h1>
               
               <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-8">
                   Upload your study materials (PDF, Docs, PPT) and let VivaMentor generate tailored study guides, interactive flashcards, and conduct voice-based oral exams.
               </p>
            </div>

            {/* Upload Box */}
            <div className="w-full max-w-2xl mx-auto relative group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-purple-400 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                
                <label 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center w-full h-80 rounded-[1.8rem] cursor-pointer transition-all duration-300 bg-white/90 backdrop-blur-xl border-[2px] shadow-2xl ${
                        isDragging 
                        ? 'border-teal-500 scale-[1.02] bg-teal-50/50' 
                        : error 
                            ? 'border-red-300 bg-red-50/50' 
                            : 'border-white hover:border-teal-100'
                    }`}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <div className={`p-6 rounded-3xl mb-6 transition-all duration-500 ${
                            isDragging ? 'bg-teal-100 text-teal-600 scale-110 rotate-12' : 
                            error ? 'bg-red-100 text-red-500' : 'bg-slate-50 text-slate-400 group-hover:text-teal-600 group-hover:scale-110 group-hover:-rotate-3'
                        }`}>
                            {error ? <AlertCircle className="w-12 h-12"/> : <UploadCloud className="w-12 h-12" />}
                        </div>
                        
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">
                            {isDragging ? "Drop it like it's hot!" : (error ? "File not supported" : "Upload Document")}
                        </h3>
                        
                        <p className={`text-sm mb-4 max-w-sm ${error ? 'text-red-500' : 'text-slate-400'}`}>
                            {error ? error : "Drag & drop your PDF, Word, PowerPoint, or Text file here."}
                        </p>
                        
                        {/* Usage Limit Display */}
                        {usage && (
                            <div className="mb-6 bg-slate-100 px-4 py-1.5 rounded-full text-xs font-bold text-slate-500 border border-slate-200">
                                {usage.limit === Infinity ? (
                                    <span>Unlimited Uploads (Genius Plan)</span>
                                ) : (
                                    <span>Used {usage.current} / {usage.limit} Uploads</span>
                                )}
                            </div>
                        )}

                        {!error && (
                            <div className="flex flex-wrap justify-center gap-3">
                                {[
                                    { ext: 'PDF', icon: FileType, color: 'bg-red-50 text-red-600 border-red-100' },
                                    { ext: 'DOCX', icon: FileText, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                                    { ext: 'PPTX', icon: File, color: 'bg-orange-50 text-orange-600 border-orange-100' },
                                    { ext: 'TXT', icon: FileText, color: 'bg-slate-100 text-slate-600 border-slate-200' }
                                ].map((type) => (
                                    <span key={type.ext} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${type.color}`}>
                                        <type.icon className="w-3.5 h-3.5" /> {type.ext}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md,.json,.html,.csv,.js,.ts,.doc,.docx,.ppt,.pptx" />
                </label>
            </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white border-y border-slate-100 py-12 relative z-10">
            <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                    { label: "Active Students", value: "10k+", icon: GraduationCap },
                    { label: "Questions Generated", value: "1M+", icon: Zap },
                    { label: "Hours Saved", value: "50k+", icon: Clock },
                    { label: "Exam Success", value: "94%", icon: BarChart3 },
                ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center justify-center group">
                         <stat.icon className="w-8 h-8 text-slate-300 mb-3 group-hover:text-teal-500 transition-colors" />
                         <div className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</div>
                         <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">{stat.label}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* How it Works */}
        <div id="how-it-works" className="py-24 px-4 bg-slate-50 relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Your Path to Mastery</h2>
                    <p className="text-lg text-slate-500">Three simple steps to transform your study routine.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { title: "Upload Material", desc: "Drag and drop your lecture notes, PDFs, or textbooks into our secure analyzer.", icon: UploadCloud, color: "text-blue-500", bg: "bg-blue-50" },
                        { title: "AI Processing", desc: "Our advanced Gemini models break down concepts, generate graphs, and identify key terms.", icon: BrainCircuit, color: "text-purple-500", bg: "bg-purple-50" },
                        { title: "Active Practice", desc: "Engage with flashcards, quizzes, and voice-based Viva exams to solidify memory.", icon: CheckCircle2, color: "text-teal-500", bg: "bg-teal-50" },
                    ].map((step, i) => (
                        <div key={i} className="relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                            <div className={`w-16 h-16 ${step.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <step.icon className={`w-8 h-8 ${step.color}`} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                            <p className="text-slate-500 leading-relaxed">
                                {step.desc}
                            </p>
                            {/* Connector Line for Desktop */}
                            {i !== 2 && (
                                <div className="hidden md:block absolute top-16 -right-4 w-8 border-t-2 border-dashed border-slate-300 z-0"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="py-24 px-4 bg-white relative z-10">
             <div className="max-w-6xl mx-auto">
                 <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to ace it</h2>
                        <p className="text-lg text-slate-500 max-w-xl">
                            Forget static notes. VivaMentor turns your content into a dynamic learning ecosystem.
                        </p>
                    </div>
                    <button className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full font-bold transition-colors flex items-center gap-2">
                        View all features <ArrowRight className="w-4 h-4"/>
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {[
                         { title: "Viva Examiner", desc: "Real-time voice conversation with an AI professor that grades your answers.", icon: Mic, color: "bg-rose-50 text-rose-600" },
                         { title: "Knowledge Graph", desc: "Visualize connections between concepts in an interactive 3D map.", icon: Share2, color: "bg-indigo-50 text-indigo-600" },
                         { title: "Smart Flashcards", desc: "Spaced repetition system that tracks your mastery level.", icon: Layers, color: "bg-orange-50 text-orange-600" },
                         { title: "Socratic Chat", desc: "An AI tutor that guides you to the answer instead of giving it away.", icon: Sparkles, color: "bg-yellow-50 text-yellow-600" },
                         { title: "Audio Notebook", desc: "Convert your notes into a two-person podcast discussion.", icon: Music, color: "bg-teal-50 text-teal-600" },
                         { title: "Study Planner", desc: "Get a customized day-by-day schedule before your exam.", icon: Calendar, color: "bg-blue-50 text-blue-600" },
                     ].map((feature, i) => (
                         <div key={i} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all duration-300">
                             <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                                 <feature.icon className="w-6 h-6" />
                             </div>
                             <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                             <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                         </div>
                     ))}
                 </div>
             </div>
        </div>
        
        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
                        <span className="text-xl font-bold text-white tracking-tight">Viva<span className="text-teal-400">Mentor</span></span>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors"><Twitter className="w-5 h-5"/></a>
                        <a href="https://github.com/pushkar-web/VivaMentor--An-advanced-Study-buddy-powered-By-Artificial-Intelligence" target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Github className="w-5 h-5"/></a>
                    </div>
                </div>
                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between text-sm text-slate-500">
                    <p>&copy; {new Date().getFullYear()} VivaMentor AI. Built for the future of learning.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-slate-300">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-300">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    </div>
  );
};

export default FileUpload;
