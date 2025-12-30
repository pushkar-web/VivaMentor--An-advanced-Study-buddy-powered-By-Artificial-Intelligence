import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { UploadedFile, VivaReport } from '../types';
import { analyzeVivaPerformance } from '../services/gemini';
import { Mic, Volume2, XCircle, Play, Loader2, AlertCircle, RefreshCw, X, Bot, Sparkles, User, MessageSquare, Radio, Zap, Settings2, Gauge, Clock, Activity, FileText, CheckCircle2 } from 'lucide-react';

interface VivaExaminerProps {
  file: UploadedFile;
}

// --- Canvas Visualizer Component ---
const AudioVisualizer = ({ analyser, isSpeaking, isActive }: { analyser: AnalyserNode | null, isSpeaking: boolean, isActive: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isActive) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const bufferLength = analyser ? analyser.frequencyBinCount : 0;
        const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const baseRadius = 80;
            const maxBarHeight = 80;
            const numBars = 64; 
            
            if (analyser) {
                analyser.getByteFrequencyData(dataArray);
            }

            // Draw Glow
            if (isSpeaking) {
                const gradient = ctx.createRadialGradient(cx, cy, baseRadius, cx, cy, baseRadius + 60);
                gradient.addColorStop(0, "rgba(20, 184, 166, 0.3)"); 
                gradient.addColorStop(1, "rgba(20, 184, 166, 0)");
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(cx, cy, baseRadius + 60, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Bars
            ctx.lineCap = 'round';
            ctx.lineWidth = 4;

            for (let i = 0; i < numBars; i++) {
                const angle = (Math.PI * 2 * i) / numBars - Math.PI / 2;
                
                let value = 0;
                if (analyser && dataArray.length > 0) {
                     // Map to lower frequencies where voice energy usually is
                     const binIndex = Math.floor((i / numBars) * (dataArray.length * 0.5)); 
                     value = dataArray[binIndex] || 0;
                }

                // Idle "breathing" animation
                if (!isSpeaking || value < 10) {
                    value = 5 + Math.sin(Date.now() / 800 + i * 0.2) * 3;
                }

                const barHeight = (value / 255) * maxBarHeight;
                const dynamicRadius = baseRadius + 10;

                const x1 = cx + Math.cos(angle) * dynamicRadius;
                const y1 = cy + Math.sin(angle) * dynamicRadius;

                const x2 = cx + Math.cos(angle) * (dynamicRadius + barHeight);
                const y2 = cy + Math.sin(angle) * (dynamicRadius + barHeight);

                ctx.strokeStyle = isSpeaking ? '#2dd4bf' : '#334155'; // Teal-400 vs Slate-700
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [analyser, isSpeaking, isActive]);

    return <canvas ref={canvasRef} width={600} height={600} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

type ResponseSpeed = 'fast' | 'normal' | 'relaxed';

const VivaExaminer: React.FC<VivaExaminerProps> = ({ file }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const [transcription, setTranscription] = useState<{ user: string; model: string; history: {role: 'user' | 'model', text: string}[] }>({ user: '', model: '', history: [] });
  const [error, setError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [responseSpeed, setResponseSpeed] = useState<ResponseSpeed>('normal');
  const [showSettings, setShowSettings] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  
  // Report State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<VivaReport | null>(null);

  // Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioFiltersRef = useRef<{ prevIn: number; prevOut: number }>({ prevIn: 0, prevOut: 0 });
  
  // State Refs for use in callbacks
  const isAiSpeakingRef = useRef(false);
  const responseSpeedRef = useRef(responseSpeed);
  const isActiveRef = useRef(false);
  const historyRef = useRef<{role: string, text: string}[]>([]);

  // Sync refs
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);
  useEffect(() => { responseSpeedRef.current = responseSpeed; }, [responseSpeed]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { historyRef.current = transcription.history; }, [transcription.history]);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription]);

  // Clean text artifacts
  const cleanText = (text: string) => text.replace(/<[^>]*>/g, '').trim();

  // --- Audio Utils ---
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64.replace(/\s/g, ''));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const downsampleTo16k = (inputData: Float32Array, inputSampleRate: number): Int16Array => {
      if (inputSampleRate === 16000) {
          const res = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              res[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          return res;
      }
      const ratio = inputSampleRate / 16000;
      const newLength = Math.ceil(inputData.length / ratio);
      const result = new Int16Array(newLength);
      for (let i = 0; i < newLength; i++) {
          const offset = Math.floor(i * ratio);
          const val = inputData[offset];
          const s = Math.max(-1, Math.min(1, val));
          result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return result;
  };

  const createBlob = (data: Float32Array, sampleRate: number) => {
    const int16Data = downsampleTo16k(data, sampleRate);
    return {
      data: encode(new Uint8Array(int16Data.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decodeAudioData = (data: Uint8Array, ctx: AudioContext): AudioBuffer => {
    const targetSampleRate = 24000; 
    // Robust Int16 conversion
    const bufferLen = Math.floor(data.byteLength / 2);
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, bufferLen);
    
    const buffer = ctx.createBuffer(1, bufferLen, targetSampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const getSpeedDelay = (speed: ResponseSpeed) => {
      switch (speed) {
          case 'fast': return 0;
          case 'normal': return 0.6; // Slight pause for thought
          case 'relaxed': return 1.5; // Deliberate pause
          default: return 0.6;
      }
  };

  const stopSession = useCallback(async (generateReport = false) => {
    // 1. Close connections
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
             try { session.close(); } catch(e) {}
        });
        sessionPromiseRef.current = null;
    }
    
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close().catch(() => {});
        inputAudioContextRef.current = null;
    }
    
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
    }
    
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();

    setIsActive(false);
    setIsAiSpeaking(false);
    isAiSpeakingRef.current = false;
    isActiveRef.current = false;
    setStatus("Session Ended");

    // 2. Generate Report if requested and history exists
    if (generateReport && historyRef.current.length >= 2) {
        setIsAnalyzing(true);
        const result = await analyzeVivaPerformance(historyRef.current);
        setReport(result);
        setIsAnalyzing(false);
    }
  }, []);

  const connectToGemini = async () => {
    if (!process.env.API_KEY) {
        setError("API Key missing");
        return;
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Explicit System Instruction
    const systemInstruction = `You are a friendly and professional Viva Examiner.
    Your task is to conduct a viva exam based on the file: "${file.name}".
    
    CRITICAL PROTOCOL:
    1. As soon as you connect, you MUST greet the candidate and ask for their name.
    2. Do NOT wait for the candidate to speak first. Speak first!
    3. Keep questions conceptual and brief.
    4. Wait for the user to answer before asking the next question.`;

    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
      },
      systemInstruction: systemInstruction,
      inputAudioTranscription: {},
      outputAudioTranscription: {}
    };

    setStatus("Connecting...");

    try {
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: config,
            callbacks: {
                onopen: async () => {
                    console.log("Connection Established");
                    setStatus("Examiner Joined");
                },
                onmessage: (message: LiveServerMessage) => {
                    const content = message.serverContent;
                    if (!content) return;

                    // Text Transcription
                    if (content.outputTranscription?.text) {
                        setTranscription(prev => ({ ...prev, model: prev.model + content.outputTranscription.text }));
                    }
                    if (content.inputTranscription?.text) {
                         setTranscription(prev => ({ ...prev, user: prev.user + content.inputTranscription.text }));
                    }
                    if (content.turnComplete) {
                         setTranscription(prev => {
                             const newHistory = [...prev.history];
                             if (prev.user) newHistory.push({ role: 'user', text: cleanText(prev.user) });
                             if (prev.model) newHistory.push({ role: 'model', text: cleanText(prev.model) });
                             return { user: '', model: '', history: newHistory };
                         });
                    }

                    // Audio Playback
                    const audioData = content.modelTurn?.parts?.find(p => p.inlineData)?.inlineData?.data;
                    if (audioData && audioContextRef.current) {
                        const ctx = audioContextRef.current;
                        
                        setIsAiSpeaking(true);
                        setStatus("Examiner Speaking...");

                        try {
                            const buffer = decodeAudioData(decode(audioData), ctx);
                            const source = ctx.createBufferSource();
                            source.buffer = buffer;
                            
                            if (analyserRef.current) {
                                source.connect(analyserRef.current);
                                analyserRef.current.connect(ctx.destination);
                            } else {
                                source.connect(ctx.destination);
                            }

                            const currentTime = ctx.currentTime;
                            if (nextStartTimeRef.current < currentTime) {
                                const delay = getSpeedDelay(responseSpeedRef.current);
                                nextStartTimeRef.current = currentTime + delay;
                            }
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += buffer.duration;
                            
                            sourcesRef.current.add(source);
                            source.onended = () => {
                                sourcesRef.current.delete(source);
                                if (sourcesRef.current.size === 0) {
                                    setIsAiSpeaking(false);
                                    setStatus("Listening...");
                                }
                            };
                        } catch (e) {
                            console.error("Audio Decode Error", e);
                        }
                    }

                    if (content.interrupted) {
                        console.log("Interrupted");
                        sourcesRef.current.forEach(s => s.stop());
                        sourcesRef.current.clear();
                        setIsAiSpeaking(false);
                        setStatus("Interrupted / Listening...");
                        if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                    }
                },
                onerror: (e) => {
                    console.error("Session Error", e);
                    setError("Connection Error. Please try again.");
                    stopSession(false);
                },
                onclose: () => {
                    setStatus("Session Closed");
                    setIsActive(false);
                }
            }
        });

        sessionPromiseRef.current = sessionPromise;

        // --- Stream Input Audio ---
        const inputCtx = inputAudioContextRef.current!;
        const stream = mediaStreamRef.current!;
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
            if (!isActiveRef.current) return;

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate RMS
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            setMicVolume(Math.min(1, rms * 5)); 

            // High-pass filter
            const state = audioFiltersRef.current;
            const filtered = new Float32Array(inputData.length);
            for(let i=0; i<inputData.length; i++) {
                filtered[i] = 0.95 * (state.prevOut + inputData[i] - state.prevIn);
                state.prevIn = inputData[i];
                state.prevOut = filtered[i];
            }

            const blob = createBlob(filtered, inputCtx.sampleRate);
            
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                     try {
                        session.sendRealtimeInput({ media: blob });
                     } catch(err) {
                        console.error("Send Input Error", err);
                     }
                }).catch(e => {
                });
            }
        };

        const mute = inputCtx.createGain();
        mute.gain.value = 0;
        source.connect(processor);
        processor.connect(mute);
        mute.connect(inputCtx.destination);

    } catch (e: any) {
        setError(e.message || "Failed to connect");
        stopSession(false);
    }
  };

  const startSession = async () => {
    try {
        setError(null);
        setReport(null);
        setIsActive(true);
        setStatus("Initializing...");
        setTranscription({ user: '', model: '', history: [] });

        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AC();
        const outputCtx = new AC();
        
        await inputCtx.resume();
        await outputCtx.resume();

        const analyser = outputCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        inputAudioContextRef.current = inputCtx;
        audioContextRef.current = outputCtx;

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: true, 
                noiseSuppression: true, 
                autoGainControl: true,
                channelCount: 1 
            } 
        });
        mediaStreamRef.current = stream;

        await connectToGemini();

    } catch (e: any) {
        console.error(e);
        setError("Microphone Access Denied or API Error");
        stopSession(false);
    }
  };

  useEffect(() => {
    return () => { stopSession(false); };
  }, [stopSession]);

  return (
    <div className="flex flex-col h-[700px] w-full max-w-6xl mx-auto bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 font-sans relative">
      
      {/* Settings Overlay */}
      {showSettings && (
          <div className="absolute top-16 right-4 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-4 w-64 animate-in fade-in zoom-in-95">
              <h4 className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Examiner Settings
              </h4>
              
              <div className="space-y-3">
                  <div className="space-y-1">
                      <label className="text-sm text-slate-400 flex items-center gap-2">
                          <Gauge className="w-3.5 h-3.5" /> Response Speed
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg">
                          {(['fast', 'normal', 'relaxed'] as ResponseSpeed[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => setResponseSpeed(s)}
                                className={`text-xs py-1.5 rounded-md font-medium capitalize transition-all ${
                                    responseSpeed === s 
                                    ? 'bg-teal-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                  {s}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${isActive ? 'bg-teal-500/10 border-teal-500/20' : 'bg-slate-800 border-slate-700'}`}>
                <Radio className={`w-6 h-6 ${isActive ? 'text-teal-400 animate-pulse' : 'text-slate-500'}`} />
             </div>
             <div>
                <h2 className="text-slate-100 font-bold text-xl tracking-tight">AI Viva Examiner</h2>
                <div className="flex items-center gap-3">
                    <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full inline-block ${isActive ? 'bg-teal-500 shadow-[0_0_10px_#14b8a6]' : 'bg-slate-600'}`}></span>
                    {isActive ? "Live Connection" : "Offline"} • {file.name}
                    </p>
                </div>
             </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className={`p-2.5 rounded-full transition-colors border ${showSettings ? 'bg-slate-800 border-teal-500 text-teal-400' : 'bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
             title="Settings"
           >
               <Settings2 className="w-5 h-5" />
           </button>

           {!isActive ? (
               <button 
                onClick={startSession}
                className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] flex items-center gap-2 transform hover:scale-105"
               >
                 <Play className="w-5 h-5 fill-current" /> Start Exam
               </button>
           ) : (
               <button 
                onClick={() => stopSession(true)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-2.5 rounded-full font-semibold transition-all flex items-center gap-2"
               >
                 <X className="w-5 h-5" /> End Session
               </button>
           )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative" onClick={() => setShowSettings(false)}>
         
         {/* LEFT PANEL: STAGE or REPORT */}
         <div className="relative w-full lg:w-5/12 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-slate-800 min-h-[400px]">
             
             {isAnalyzing ? (
                 <div className="text-center z-10 animate-in fade-in zoom-in-95">
                     <Loader2 className="w-16 h-16 text-teal-400 animate-spin mx-auto mb-6" />
                     <h3 className="text-xl font-bold text-slate-100 mb-2">Analyzing Performance...</h3>
                     <p className="text-slate-400 text-sm">Grading your responses and generating feedback.</p>
                 </div>
             ) : report ? (
                 <div className="w-full h-full overflow-y-auto p-4 animate-in slide-in-from-bottom-10 fade-in duration-500 custom-scrollbar">
                     <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                         <div className="flex items-center justify-between mb-6">
                             <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                 <FileText className="w-5 h-5 text-teal-400"/> Report Card
                             </h3>
                             <div className={`px-4 py-1 rounded-full text-sm font-bold ${report.score >= 80 ? 'bg-green-500/20 text-green-400' : report.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                 Score: {report.score}/100
                             </div>
                         </div>
                         
                         <div className="space-y-6">
                             <div className="grid grid-cols-3 gap-2">
                                 {[
                                     { label: 'Accuracy', val: report.metrics.accuracy },
                                     { label: 'Clarity', val: report.metrics.clarity },
                                     { label: 'Depth', val: report.metrics.depth }
                                 ].map((m, i) => (
                                     <div key={i} className="bg-slate-900 p-3 rounded-lg text-center">
                                         <div className="text-xs text-slate-500 uppercase mb-1">{m.label}</div>
                                         <div className="text-lg font-bold text-white">{m.val}%</div>
                                     </div>
                                 ))}
                             </div>

                             <div>
                                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Feedback</h4>
                                 <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                     {report.feedback}
                                 </p>
                             </div>

                             <div className="grid grid-cols-1 gap-4">
                                 <div>
                                     <h4 className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Strengths</h4>
                                     <ul className="text-xs text-slate-400 space-y-1 pl-1">
                                         {report.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                                     </ul>
                                 </div>
                                 <div>
                                     <h4 className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-1"><Zap className="w-3 h-3"/> To Improve</h4>
                                     <ul className="text-xs text-slate-400 space-y-1 pl-1">
                                         {report.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                                     </ul>
                                 </div>
                             </div>
                             
                             <button 
                                onClick={startSession}
                                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                             >
                                 <RefreshCw className="w-4 h-4" /> Start New Exam
                             </button>
                         </div>
                     </div>
                 </div>
             ) : (
                <>
                    {/* Canvas Visualizer */}
                    <div className="absolute inset-0 z-0 opacity-60">
                        <AudioVisualizer analyser={analyserRef.current} isSpeaking={isAiSpeaking} isActive={isActive} />
                    </div>

                    {/* Avatar */}
                    <div className="z-10 relative group">
                        <div className={`w-56 h-56 rounded-full flex items-center justify-center border-4 transition-all duration-500 shadow-2xl relative ${
                            isAiSpeaking ? 'border-teal-500 bg-slate-900/80 shadow-[0_0_60px_rgba(20,184,166,0.4)] scale-105' : 'border-slate-700 bg-slate-800'
                        }`}>
                            {status.includes("Connecting") ? (
                                <Loader2 className="w-24 h-24 text-teal-500 animate-spin opacity-50" />
                            ) : (
                                <Bot className={`w-28 h-28 transition-all duration-300 ${isAiSpeaking ? 'text-teal-400' : 'text-slate-500'}`} strokeWidth={1} />
                            )}
                        </div>
                        
                        {/* Connection Status Badge */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-lg backdrop-blur-md transition-colors ${
                                error ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                isActive ? 'bg-teal-500/10 text-teal-300 border-teal-500/20' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                                {error ? "Error" : status}
                            </div>
                        </div>
                    </div>

                    {/* Hints */}
                    {isActive && !error && (
                        <div className="mt-16 text-center z-10 space-y-2">
                            <p className="text-slate-400 text-sm font-medium animate-pulse">
                                {isAiSpeaking ? "Examiner is speaking..." : "Listening to you..."}
                            </p>
                            
                            {/* Mic Activity Indicator */}
                            <div className="flex items-center justify-center gap-2 opacity-50">
                                <Activity className="w-3 h-3 text-slate-500" />
                                <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-teal-500 transition-all duration-75"
                                        style={{ width: `${micVolume * 100}%` }}
                                    />
                                </div>
                            </div>

                            {!isAiSpeaking && transcription.history.length === 0 && (
                                <p className="text-xs text-slate-500">
                                AI silent? Say <span className="text-teal-400 font-bold">"Hello"</span> to wake it up.
                                </p>
                            )}
                        </div>
                    )}
                </>
             )}
         </div>

         {/* RIGHT PANEL: CHAT */}
         <div className="flex-1 bg-slate-50 flex flex-col relative z-0 h-full">
             <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
                 <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-teal-600" /> Live Transcript
                 </h3>
                 <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">Real-time</span>
             </div>

             <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                 {transcription.history.length === 0 && !transcription.user && !transcription.model && (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                         <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                             <Sparkles className="w-10 h-10 text-teal-400" />
                         </div>
                         <h4 className="text-lg font-bold text-slate-600 mb-2">Ready to Start</h4>
                         <p className="text-sm text-center max-w-xs">
                             Click "Start Exam" to begin. The examiner will introduce themselves and ask questions about your document.
                         </p>
                     </div>
                 )}

                 {transcription.history.map((msg, idx) => (
                     <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${msg.role === 'user' ? 'bg-white border-slate-200' : 'bg-teal-600 border-teal-500'}`}>
                             {msg.role === 'user' ? <User className="w-5 h-5 text-slate-600"/> : <Bot className="w-5 h-5 text-white"/>}
                         </div>
                         <div className={`px-6 py-4 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
                             msg.role === 'user' 
                                ? 'bg-white border border-slate-200 text-slate-700 rounded-tr-none' 
                                : 'bg-white border-l-4 border-l-teal-500 border-y border-r border-slate-100 text-slate-800 rounded-tl-none'
                         }`}>
                             {msg.text}
                         </div>
                     </div>
                 ))}

                 {/* Real-time Bubbles */}
                 {transcription.model && (
                     <div className="flex gap-4 animate-in fade-in slide-in-from-left-2">
                         <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                             <Bot className="w-5 h-5 text-white"/>
                         </div>
                         <div className="px-6 py-4 rounded-2xl rounded-tl-none bg-white border-l-4 border-l-teal-500 border-y border-r border-slate-100 text-slate-800 text-sm shadow-sm max-w-[85%]">
                             <div className="flex gap-1.5 mb-2 opacity-50">
                                 <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce"></span>
                                 <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce delay-75"></span>
                                 <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce delay-150"></span>
                             </div>
                             {cleanText(transcription.model)}
                         </div>
                     </div>
                 )}

                 {transcription.user && (
                     <div className="flex gap-4 flex-row-reverse animate-in fade-in slide-in-from-right-2">
                         <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                             <User className="w-5 h-5 text-slate-600"/>
                         </div>
                         <div className="px-6 py-4 rounded-2xl rounded-tr-none bg-white border border-slate-200 text-slate-700 text-sm shadow-sm max-w-[85%]">
                             <div className="flex gap-1.5 mb-2 opacity-30 justify-end">
                                 <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                 <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                             </div>
                             {cleanText(transcription.user)}
                         </div>
                     </div>
                 )}
             </div>
         </div>

         {/* Error Overlay */}
         {error && (
            <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border border-red-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Connection Issue</h3>
                    <p className="text-slate-500 mb-6 text-sm">{error}</p>
                    <button 
                        onClick={startSession}
                        className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                    >
                        <RefreshCw className="w-5 h-5" /> Retry Connection
                    </button>
                    <button 
                        onClick={() => { setError(null); stopSession(false); }}
                        className="mt-4 text-sm text-slate-400 hover:text-slate-600 font-medium"
                    >
                        Close Session
                    </button>
                </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default VivaExaminer;