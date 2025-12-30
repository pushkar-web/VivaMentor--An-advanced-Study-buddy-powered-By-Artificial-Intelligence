import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { UploadedFile, ChatMessage, ChatMode } from '../types';
import { getChatResponse } from '../services/gemini';
import { Send, Bot, User, Loader2, Sparkles, Brain, Sword, MessageSquare, Trash2, Clock, Mic, MicOff, ArrowRight } from 'lucide-react';

interface DocumentChatProps {
  file: UploadedFile;
}

const DocumentChat: React.FC<DocumentChatProps> = ({ file }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASSISTANT);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Your browser does not support voice recognition.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const processResponse = (fullResponse: string) => {
      // Split response from suggestions
      const parts = fullResponse.split('|||SUGGESTIONS:');
      const mainText = parts[0].trim();
      
      if (parts.length > 1) {
          const rawSuggestions = parts[1].split('|').map(s => s.trim()).filter(s => s.length > 0);
          setSuggestions(rawSuggestions);
      } else {
          setSuggestions([]);
      }
      
      return mainText;
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestions([]); // Clear previous suggestions
    setLoading(true);

    const fullResponse = await getChatResponse(file, messages, textToSend, mode);
    const cleanResponse = processResponse(fullResponse);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: cleanResponse,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
      setMessages([]);
      setSuggestions([]);
  };

  const getModeIcon = (m: ChatMode) => {
      switch(m) {
          case ChatMode.SOCRATIC: return <Brain className="w-4 h-4" />;
          case ChatMode.CHALLENGER: return <Sword className="w-4 h-4" />;
          default: return <MessageSquare className="w-4 h-4" />;
      }
  };

  const getModeLabel = (m: ChatMode) => {
      switch(m) {
          case ChatMode.SOCRATIC: return "Socratic Tutor";
          case ChatMode.CHALLENGER: return "Challenger";
          default: return "Assistant";
      }
  };

  const getModeColor = (m: ChatMode) => {
    switch(m) {
        case ChatMode.SOCRATIC: return "bg-purple-100 text-purple-700 border-purple-200";
        case ChatMode.CHALLENGER: return "bg-orange-100 text-orange-700 border-orange-200";
        default: return "bg-teal-100 text-teal-700 border-teal-200";
    }
  };

  // Custom Markdown Components for Styling
  const MarkdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1 marker:text-teal-500" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 marker:text-teal-500" {...props} />,
    li: ({node, ...props}: any) => <li className="" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-xl font-bold mb-3 mt-4 text-slate-900 border-b border-slate-200 pb-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-lg font-bold mb-2 mt-3 text-slate-800" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-md font-bold mb-2 mt-3 text-slate-800" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-teal-300 pl-4 py-1 my-3 italic text-slate-600 bg-slate-50 rounded-r" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
        return inline ? (
            <code className="bg-slate-100 text-teal-700 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200" {...props}>{children}</code>
        ) : (
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto my-3 text-sm font-mono shadow-inner border border-slate-700" {...props}>
                <code>{children}</code>
            </pre>
        );
    },
    a: ({node, ...props}: any) => <a className="text-teal-600 underline hover:text-teal-700 font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
    table: ({node, ...props}: any) => <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 shadow-sm"><table className="w-full text-left text-sm" {...props} /></div>,
    th: ({node, ...props}: any) => <th className="bg-slate-50 p-3 font-bold border-b border-slate-200 text-slate-700" {...props} />,
    td: ({node, ...props}: any) => <td className="p-3 border-b border-slate-100 text-slate-600" {...props} />,
  };

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
                <Bot className="w-6 h-6 text-teal-600" />
           </div>
           <div>
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 Ask VivaMentor
               </h3>
               <p className="text-xs text-slate-500 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                   Online • Context: {file.name.substring(0, 20)}{file.name.length > 20 ? '...' : ''}
               </p>
           </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-1">
                {[ChatMode.ASSISTANT, ChatMode.SOCRATIC, ChatMode.CHALLENGER].map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            mode === m 
                            ? getModeColor(m) + " shadow-sm transform scale-105" 
                            : "text-slate-500 hover:bg-slate-200"
                        }`}
                        title={m === ChatMode.SOCRATIC ? "Asks guiding questions" : m === ChatMode.CHALLENGER ? "Plays Devil's Advocate" : "Standard Q&A"}
                    >
                        {getModeIcon(m)}
                        <span className="hidden lg:inline">{getModeLabel(m)}</span>
                    </button>
                ))}
            </div>
            {messages.length > 0 && (
                <button 
                    onClick={clearChat}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear Chat"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc] scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                <Sparkles className="w-10 h-10 text-teal-400" />
            </div>
            <h4 className="text-lg font-bold text-slate-600 mb-2">How can I help you study?</h4>
            <p className="text-sm font-medium mb-8">Ask questions, request summaries, or clarify concepts.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full px-4">
                <button onClick={() => setInput("Summarize the main points of this document.")} className="text-xs p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:text-teal-600 transition-all text-left">
                    "Summarize the main points."
                </button>
                <button onClick={() => setInput("Create a quiz with 3 hard questions based on this.")} className="text-xs p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:text-teal-600 transition-all text-left">
                    "Create a hard quiz."
                </button>
                <button onClick={() => { setMode(ChatMode.SOCRATIC); setInput("Help me understand the core concept here."); }} className="text-xs p-3 bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:text-purple-600 transition-all text-left">
                    "Tutor me Socratically."
                </button>
                <button onClick={() => { setMode(ChatMode.CHALLENGER); setInput("I think the author is wrong about..."); }} className="text-xs p-3 bg-white border border-slate-200 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all text-left">
                    "Challenge my views."
                </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2`}>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${msg.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-white border-teal-100'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-6 h-6 text-teal-600" />}
             </div>
             
             <div className={`flex flex-col max-w-[85%] lg:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`px-5 py-4 rounded-2xl shadow-sm text-sm ${
                   msg.role === 'user' 
                    ? 'bg-slate-800 text-slate-50 rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                 }`}>
                    {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                        <div className="markdown-body">
                            <ReactMarkdown components={MarkdownComponents}>
                                {msg.text}
                            </ReactMarkdown>
                        </div>
                    )}
                 </div>
                 <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 px-1">
                    {msg.role === 'model' && <Sparkles className="w-3 h-3" />}
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
             </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-white border border-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-6 h-6 text-teal-600" />
             </div>
             <div className="px-5 py-4 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span className="text-xs font-medium text-slate-500">Thinking...</span>
             </div>
          </div>
        )}

        {/* Suggested Questions */}
        {!loading && suggestions.length > 0 && (
            <div className="ml-14 flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2">
                {suggestions.map((question, i) => (
                    <button 
                        key={i}
                        onClick={() => handleSend(question)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center gap-1 shadow-sm"
                    >
                        {question} <ArrowRight className="w-3 h-3" />
                    </button>
                ))}
            </div>
        )}

      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={
                mode === ChatMode.SOCRATIC ? "Answer the tutor's question..." : 
                mode === ChatMode.CHALLENGER ? "Defend your argument..." : 
                "Ask a question about your document..."
            }
            className="w-full pl-5 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-700 placeholder-slate-400 transition-all shadow-inner"
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-all ${
                    isListening 
                    ? 'bg-red-100 text-red-500 animate-pulse' 
                    : 'text-slate-400 hover:bg-slate-200'
                }`}
                title={isListening ? "Stop Listening" : "Start Dictation"}
              >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className={`p-2.5 rounded-lg transition-all ${
                    !input.trim() || loading 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
            AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};

export default DocumentChat;