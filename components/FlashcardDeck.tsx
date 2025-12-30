import React, { useState, useEffect } from 'react';
import { UploadedFile, Flashcard } from '../types';
import { generateFlashcards } from '../services/gemini';
import { Loader2, ChevronLeft, ChevronRight, RotateCw, BrainCircuit, Download, CheckCircle2, Repeat, Trophy } from 'lucide-react';

interface FlashcardDeckProps {
  file: UploadedFile;
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ file }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);
  const [masteredCount, setMasteredCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      const generated = await generateFlashcards(file);
      setCards(generated);
      setActiveCards(generated);
      setMasteredCount(0);
      setIsFinished(false);
      setLoading(false);
    };
    loadCards();
  }, [file]);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % activeCards.length), 200);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + activeCards.length) % activeCards.length), 200);
  };

  const markAsMastered = () => {
      // Remove current card from active deck
      const currentCard = activeCards[currentIndex];
      const newActive = activeCards.filter((_, i) => i !== currentIndex);
      
      setMasteredCount(prev => prev + 1);
      setActiveCards(newActive);
      setIsFlipped(false);

      if (newActive.length === 0) {
          setIsFinished(true);
      } else {
          setCurrentIndex(prev => prev % newActive.length);
      }
  };

  const markAsStudyAgain = () => {
      handleNext();
  };

  const restartDeck = () => {
      setActiveCards(cards);
      setMasteredCount(0);
      setCurrentIndex(0);
      setIsFinished(false);
      setIsFlipped(false);
  };

  const downloadCSV = () => {
    if (cards.length === 0) return;
    
    // Create CSV content: Front,Back
    const csvContent = "data:text/csv;charset=utf-8," 
        + cards.map(card => `"${card.front.replace(/"/g, '""')}","${card.back.replace(/"/g, '""')}"`).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${file.name.replace(/\.[^/.]+$/, "")}_flashcards.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
        <p>Generating flashcards from your material...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return <div className="text-center p-10 text-slate-500">No flashcards generated. Try again.</div>;
  }

  if (isFinished) {
      return (
          <div className="max-w-xl mx-auto py-12 text-center">
              <div className="bg-white rounded-2xl p-10 shadow-lg border border-slate-200">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Deck Mastered!</h2>
                  <p className="text-slate-500 mb-8">You've successfully reviewed all {cards.length} cards.</p>
                  <button 
                    onClick={restartDeck}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 w-full"
                  >
                      <RotateCw className="w-5 h-5" /> Start Over
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center gap-8 py-8">
      {/* Progress Header */}
      <div className="w-full flex justify-between items-center text-slate-500 text-sm font-medium bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 text-green-600">
                 <CheckCircle2 className="w-4 h-4"/>
                 <span>{masteredCount} Mastered</span>
             </div>
             <div className="flex items-center gap-1.5 text-orange-600">
                 <Repeat className="w-4 h-4"/>
                 <span>{activeCards.length} Remaining</span>
             </div>
        </div>
        <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 text-teal-600 hover:text-teal-700 transition-colors"
            title="Export to Anki/CSV"
        >
            <Download className="w-4 h-4"/>
            <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Mastery Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
             className="h-full bg-green-500 transition-all duration-500"
             style={{ width: `${(masteredCount / cards.length) * 100}%` }}
          />
      </div>

      <div 
        className="group perspective-1000 w-full h-80 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center p-8 text-center hover:border-orange-300 transition-colors">
            <span className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Card {currentIndex + 1}</span>
            <p className="text-xl md:text-2xl font-medium text-slate-800">{activeCards[currentIndex].front}</p>
            <p className="absolute bottom-6 text-xs text-slate-400 font-medium animate-pulse">Click to flip</p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 text-center text-white">
            <span className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Answer</span>
            <p className="text-lg md:text-xl leading-relaxed">{activeCards[currentIndex].back}</p>
          </div>

        </div>
      </div>

      {/* Controls */}
      {isFlipped ? (
           <div className="grid grid-cols-2 gap-4 w-full">
               <button 
                 onClick={markAsStudyAgain}
                 className="py-4 rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 hover:border-orange-300 transition-colors flex flex-col items-center gap-1"
               >
                   <Repeat className="w-5 h-5"/>
                   Study Again
               </button>
               <button 
                 onClick={markAsMastered}
                 className="py-4 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 shadow-md transition-colors flex flex-col items-center gap-1"
               >
                   <CheckCircle2 className="w-5 h-5"/>
                   Got It
               </button>
           </div>
      ) : (
          <div className="flex items-center gap-6">
            <button 
            onClick={handlePrev}
            className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-orange-600 transition-colors shadow-sm"
            >
            <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button 
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-4 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
            title="Flip Card"
            >
            <RotateCw className="w-6 h-6" />
            </button>

            <button 
            onClick={handleNext}
            className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-orange-600 transition-colors shadow-sm"
            >
            <ChevronRight className="w-6 h-6" />
            </button>
        </div>
      )}
    </div>
  );
};

export default FlashcardDeck;