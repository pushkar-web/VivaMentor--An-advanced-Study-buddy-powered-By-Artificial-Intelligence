import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';

interface PomodoroTimerProps {
  onComplete: () => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [audio] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')); // Simple notification sound

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      audio.play().catch(() => {}); // Play sound
      if (mode === 'focus') {
          onComplete(); // Award XP
          setMode('break');
          setTimeLeft(5 * 60);
      } else {
          setMode('focus');
          setTimeLeft(25 * 60);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, mode, onComplete, audio]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setMode('focus');
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'focus' 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100 
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  return (
    <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg border border-slate-700 relative overflow-hidden group">
      {/* Background Gradient */}
      <div className={`absolute inset-0 opacity-20 transition-colors duration-500 ${mode === 'focus' ? 'bg-gradient-to-br from-teal-500 to-transparent' : 'bg-gradient-to-br from-blue-500 to-transparent'}`}></div>
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {mode === 'focus' ? <Brain className="w-3 h-3 text-teal-400" /> : <Coffee className="w-3 h-3 text-blue-400" />}
            {mode === 'focus' ? 'Focus Time' : 'Short Break'}
        </div>

        <div className="text-4xl font-mono font-bold tracking-tight mb-4 tabular-nums text-slate-100">
            {formatTime(timeLeft)}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-700 rounded-full mb-4 overflow-hidden">
            <div 
                className={`h-full transition-all duration-1000 ${mode === 'focus' ? 'bg-teal-500' : 'bg-blue-500'}`} 
                style={{ width: `${progress}%` }}
            ></div>
        </div>

        <div className="flex items-center gap-3 w-full">
            <button 
                onClick={toggleTimer}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    isActive 
                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' 
                    : mode === 'focus' 
                        ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                }`}
            >
                {isActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {isActive ? 'Pause' : 'Start'}
            </button>
            <button 
                onClick={resetTimer}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Reset"
            >
                <RotateCcw className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;