import React, { useState, useEffect } from 'react';
import { UploadedFile, QuizQuestion } from '../types';
import { generateQuiz } from '../services/gemini';
import { Loader2, CheckCircle, XCircle, ArrowRight, Award, RotateCcw, HelpCircle } from 'lucide-react';

interface QuizModeProps {
  file: UploadedFile;
  onQuizComplete?: (score: number, total: number) => void;
}

const QuizMode: React.FC<QuizModeProps> = ({ file, onQuizComplete }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    startQuiz();
  }, [file]);

  const startQuiz = async () => {
    setLoading(true);
    setShowResults(false);
    setCurrentIndex(0);
    setScore(0);
    setIsAnswered(false);
    setSelectedOption(null);
    const quiz = await generateQuiz(file);
    setQuestions(quiz);
    setLoading(false);
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    if (index === questions[currentIndex].correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
      if (onQuizComplete) {
          onQuizComplete(score, questions.length);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
        <p>Generating quiz questions from your material...</p>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Complete!</h2>
          <p className="text-slate-500 mb-6">Here is how you performed on this document.</p>
          
          <div className="text-5xl font-bold text-purple-600 mb-2">{percentage}%</div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-8">
            {score} out of {questions.length} Correct
          </p>

          <button 
            onClick={startQuiz}
            className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
          >
            <RotateCcw className="w-5 h-5" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="text-center py-20 text-slate-500">Failed to generate quiz. Please try again.</div>;
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>Score: {score}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10">
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-snug">
          {currentQ.question}
        </h3>

        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            // Added default text-slate-700 and specific text colors for states
            let stateClass = "border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-700";
            
            if (isAnswered) {
              if (idx === currentQ.correctAnswerIndex) {
                stateClass = "border-green-500 bg-green-50 text-green-700";
              } else if (idx === selectedOption) {
                stateClass = "border-red-500 bg-red-50 text-red-700";
              } else {
                stateClass = "border-slate-100 opacity-50 text-slate-400";
              }
            } else if (selectedOption === idx) {
              stateClass = "border-purple-500 bg-purple-50 text-purple-700";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isAnswered}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${stateClass}`}
              >
                <span className="font-medium">{opt}</span>
                {isAnswered && idx === currentQ.correctAnswerIndex && <CheckCircle className="w-5 h-5 text-green-500"/>}
                {isAnswered && idx === selectedOption && idx !== currentQ.correctAnswerIndex && <XCircle className="w-5 h-5 text-red-500"/>}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start gap-3 mb-6">
               <HelpCircle className="w-5 h-5 text-purple-500 mt-0.5" />
               <p className="text-sm text-slate-600 leading-relaxed">
                 <span className="font-bold text-slate-800 block mb-1">Explanation</span>
                 {currentQ.explanation}
               </p>
            </div>
            <button 
              onClick={nextQuestion}
              className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
            >
               {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizMode;