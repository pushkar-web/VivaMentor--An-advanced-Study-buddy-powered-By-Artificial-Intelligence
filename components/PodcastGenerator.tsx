import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile } from '../types';
import { generatePodcastScript, generatePodcastAudio } from '../services/gemini';
import { Mic2, Play, Pause, FileText, Loader2, Music, Download } from 'lucide-react';

interface PodcastGeneratorProps {
  file: UploadedFile;
}

// Helper to write string to DataView
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Helper to convert base64 PCM to WAV Blob
const pcmToWav = (base64Pcm: string, sampleRate: number = 24000): Blob => {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 channel)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);
  
  return new Blob([view, bytes], { type: 'audio/wav' });
};

const PodcastGenerator: React.FC<PodcastGeneratorProps> = ({ file }) => {
  const [script, setScript] = useState<string>('');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'scripting' | 'ready_to_record' | 'recording' | 'playing'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Convert PCM to WAV URL when audioBase64 changes
  useEffect(() => {
      if (audioBase64) {
          const blob = pcmToWav(audioBase64);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          return () => {
              URL.revokeObjectURL(url);
          };
      }
  }, [audioBase64]);

  // --- Audio Visualizer Setup ---
  useEffect(() => {
    // Only initialize AudioContext if we have a URL and an audio element
    if (audioUrl && !audioContextRef.current && audioRef.current) {
         try {
            const AC = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AC();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            
            // Note: MediaElementSource needs the audio element to be capable of playing
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            
            audioContextRef.current = ctx;
            analyserRef.current = analyser;
            sourceRef.current = source;
         } catch (e) {
             console.error("Audio Context Error", e);
         }
    }
  }, [audioUrl]);

  useEffect(() => {
      if (!isPlaying || !analyserRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animationId: number;

      const draw = () => {
          animationId = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
              const barHeight = (dataArray[i] / 255) * canvas.height;
              const gradient = ctx!.createLinearGradient(0, canvas.height, 0, 0);
              gradient.addColorStop(0, '#0d9488'); // Teal-600
              gradient.addColorStop(1, '#2dd4bf'); // Teal-400

              ctx!.fillStyle = gradient;
              ctx!.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

              x += barWidth + 2;
          }
      };

      draw();

      return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);


  const handleGenerateScript = async () => {
      setLoading(true);
      setStep('scripting');
      const generatedScript = await generatePodcastScript(file);
      setScript(generatedScript);
      setLoading(false);
      setStep('ready_to_record');
  };

  const handleGenerateAudio = async () => {
      if (!script) return;
      setLoading(true);
      setStep('recording');
      const audioData = await generatePodcastAudio(script);
      setAudioBase64(audioData);
      setLoading(false);
      setStep('playing');
  };

  const togglePlayback = () => {
      if (!audioRef.current) return;
      if (audioRef.current.paused) {
          if (audioContextRef.current?.state === 'suspended') {
              audioContextRef.current.resume();
          }
          audioRef.current.play();
          setIsPlaying(true);
      } else {
          audioRef.current.pause();
          setIsPlaying(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        {/* Intro Card */}
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                        <Mic2 className="w-6 h-6 text-teal-400" />
                    </div>
                    <h2 className="text-2xl font-bold">Audio Notebook</h2>
                </div>
                <p className="text-slate-300 max-w-lg mb-8">
                    Convert your document into an engaging podcast. Listen to "Alex" and "Jamie" discuss the key concepts, debates, and insights from your material.
                </p>
                
                {step === 'idle' && (
                    <button 
                        onClick={handleGenerateScript}
                        disabled={loading}
                        className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-6 py-3 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileText className="w-5 h-5"/>}
                        Generate Script
                    </button>
                )}
            </div>
            
            {/* Decoration */}
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-20 bg-gradient-to-l from-teal-500 to-transparent"></div>
            <Music className="absolute -right-8 -bottom-8 w-64 h-64 text-teal-800 opacity-20 rotate-12" />
        </div>

        {/* Script Section */}
        {step !== 'idle' && script && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 fade-in">
                {/* Script Editor */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[500px]">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4"/> Podcast Script
                    </h3>
                    <textarea 
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        className="flex-1 w-full p-4 bg-slate-50 border border-slate-100 rounded-xl resize-none focus:ring-2 focus:ring-teal-500/50 outline-none text-sm leading-relaxed text-slate-700 font-mono"
                        placeholder="Script will appear here..."
                    />
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={handleGenerateAudio}
                            disabled={loading}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mic2 className="w-4 h-4"/>}
                            {loading ? "Synthesizing Audio..." : "Generate Audio"}
                        </button>
                    </div>
                </div>

                {/* Player Section */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    {audioUrl ? (
                        <>
                            <canvas ref={canvasRef} width={400} height={200} className="w-full h-48 mb-8 opacity-80" />
                            
                            <audio 
                                ref={audioRef} 
                                src={audioUrl} 
                                onEnded={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                            
                            <div className="flex items-center gap-6 z-10">
                                <button 
                                    onClick={togglePlayback}
                                    className="w-16 h-16 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_30px_rgba(20,184,166,0.4)]"
                                >
                                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                                </button>
                                
                                <a 
                                    href={audioUrl}
                                    download={`${file.name}_podcast.wav`}
                                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                                    title="Download WAV"
                                >
                                    <Download className="w-6 h-6" />
                                </a>
                            </div>

                            <div className="mt-8 text-center space-y-1">
                                <h4 className="text-white font-bold text-lg">{file.name}</h4>
                                <p className="text-teal-400 text-sm">AI Audio Summary</p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-500">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                {loading ? <Loader2 className="w-8 h-8 animate-spin text-teal-500" /> : <Music className="w-8 h-8 text-slate-600" />}
                            </div>
                            <p className="text-sm">
                                {loading ? "Recording in studio..." : "Waiting for script..."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default PodcastGenerator;