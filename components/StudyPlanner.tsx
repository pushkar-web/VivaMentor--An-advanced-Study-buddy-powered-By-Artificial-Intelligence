import React, { useState } from 'react';
import { UploadedFile, StudyPlan } from '../types';
import { generateStudyPlan } from '../services/gemini';
import { Calendar, Clock, CheckCircle2, Loader2, ArrowRight, LayoutList, BookOpen, Circle } from 'lucide-react';

interface StudyPlannerProps {
  file: UploadedFile;
  onTaskComplete?: (xp: number) => void;
}

const StudyPlanner: React.FC<StudyPlannerProps> = ({ file, onTaskComplete }) => {
  const [days, setDays] = useState(3);
  const [hours, setHours] = useState(2);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    setLoading(true);
    setPlan(null);
    setCompletedTasks(new Set());
    const result = await generateStudyPlan(file, days, hours);
    setPlan(result);
    setLoading(false);
  };

  const toggleTask = (dayIndex: number, taskIndex: number) => {
      const taskId = `${dayIndex}-${taskIndex}`;
      const newSet = new Set(completedTasks);
      
      if (newSet.has(taskId)) {
          newSet.delete(taskId);
      } else {
          newSet.add(taskId);
          // Award XP
          if (onTaskComplete) {
              onTaskComplete(15);
          }
      }
      setCompletedTasks(newSet);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-start justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-teal-600" /> AI Study Planner
                </h2>
                <p className="text-slate-500">
                    Tell us your timeline, and we'll break down <span className="font-semibold text-slate-700">{file.name}</span> into a manageable schedule.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Days until exam</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" min="1" max="14" step="1" 
                        value={days} onChange={(e) => setDays(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <span className="min-w-[3rem] px-3 py-1 bg-slate-100 rounded-lg text-center font-bold text-slate-700">{days}</span>
                </div>
            </div>

            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Hours per day</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" min="0.5" max="8" step="0.5" 
                        value={hours} onChange={(e) => setHours(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <span className="min-w-[3rem] px-3 py-1 bg-slate-100 rounded-lg text-center font-bold text-slate-700">{hours}</span>
                </div>
            </div>
        </div>

        <button 
            onClick={handleGenerate}
            disabled={loading}
            className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <LayoutList className="w-5 h-5" />}
            {loading ? "Constructing Timeline..." : "Generate My Plan"}
        </button>
      </div>

      {/* Plan Display */}
      {plan && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in">
              <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">{plan.title}</h3>
                  <span className="text-sm bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-medium">
                      Total: {plan.days.length} Days
                  </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  {plan.days.map((day, dIdx) => (
                      <div key={day.day} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-4">
                              <div className="bg-teal-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
                                  {day.day}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800">Day {day.day}</h4>
                                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{day.focus}</p>
                              </div>
                          </div>
                          <div className="p-4 space-y-3">
                              {day.tasks.map((task, tIdx) => {
                                  const isChecked = completedTasks.has(`${dIdx}-${tIdx}`);
                                  return (
                                    <div 
                                        key={tIdx} 
                                        onClick={() => toggleTask(dIdx, tIdx)}
                                        className={`flex items-start gap-4 p-3 rounded-lg transition-all border cursor-pointer select-none ${
                                            isChecked 
                                            ? 'bg-green-50 border-green-200 opacity-60' 
                                            : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                                        }`}
                                    >
                                        <div className={`mt-0.5 min-w-[20px]`}>
                                            {isChecked ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
                                        </div>
                                        <div className="min-w-[4rem] text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded text-center flex items-center justify-center gap-1">
                                            <Clock className="w-3 h-3"/> {task.time}
                                        </div>
                                        <div className="flex-1">
                                            <h5 className={`text-sm font-bold mb-1 flex items-center gap-2 ${isChecked ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                {task.activity.includes("Read") && <BookOpen className="w-3 h-3 text-blue-500" />}
                                                {task.activity.includes("Quiz") && <CheckCircle2 className="w-3 h-3 text-purple-500" />}
                                                {task.activity}
                                            </h5>
                                            <p className="text-sm text-slate-600">{task.description}</p>
                                        </div>
                                    </div>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default StudyPlanner;