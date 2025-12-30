import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile, StudyLevel, StudyGuide, GlossaryTerm, DeepDiveResult } from '../types';
import { generateStudyMaterial, explainSelectedText, generateDeepDive } from '../services/gemini';
import { BookOpen, Zap, Layers, GraduationCap, Loader2, Download, GitGraph, Volume2, Square, StopCircle, PlayCircle, X, Sparkles, HelpCircle, Globe, ExternalLink } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';

interface StudyGuideGeneratorProps {
  file: UploadedFile;
}

interface ContextMenuState {
    x: number;
    y: number;
    selectedText: string;
    visible: boolean;
}

const StudyGuideGenerator: React.FC<StudyGuideGeneratorProps> = ({ file }) => {
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [currentLevel, setCurrentLevel] = useState<StudyLevel | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [speakingSection, setSpeakingSection] = useState<number | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, selectedText: '', visible: false });
  const [explanation, setExplanation] = useState<{ type: string, text: string } | null>(null);
  const [deepDive, setDeepDive] = useState<DeepDiveResult | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [diving, setDiving] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
    
    // Cleanup speech on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (guide) {
        // Short timeout to ensure DOM is ready before mermaid renders
        setTimeout(() => {
            mermaid.run({
                querySelector: '.mermaid'
            });
        }, 100);
    }
  }, [guide]);

  // Handle Text Selection
  useEffect(() => {
    const handleSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && containerRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Adjust coordinates to be relative to the container if needed, or stick to fixed positioning for the menu
            // Using clientX/Y from the rect for fixed positioning
            setContextMenu({
                x: rect.left + (rect.width / 2),
                y: rect.top - 10, // Position above text
                selectedText: selection.toString(),
                visible: true
            });
        } else {
            // Only hide if we aren't clicking inside the menu itself (handled by click event usually, but simplistic here)
            // We'll rely on onMouseDown elsewhere to clear
        }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  const handleContextAction = async (action: 'simplify' | 'example' | 'quiz') => {
      setExplaining(true);
      setExplanation(null); // Clear previous
      setDeepDive(null);
      // Hide menu but keep selection context mentally
      setContextMenu(prev => ({ ...prev, visible: false }));
      
      const result = await explainSelectedText(file, contextMenu.selectedText, action);
      
      setExplanation({ type: action, text: result });
      setExplaining(false);
  };

  const handleDeepDive = async () => {
      setDiving(true);
      setDeepDive(null);
      setExplanation(null);
      setContextMenu(prev => ({ ...prev, visible: false }));
      
      const result = await generateDeepDive(contextMenu.selectedText);
      setDeepDive(result);
      setDiving(false);
  };

  const clearSelection = () => {
      setContextMenu({ x: 0, y: 0, selectedText: '', visible: false });
      window.getSelection()?.removeAllRanges();
  };


  const handleGenerate = async (level: StudyLevel) => {
    setLoading(true);
    setCurrentLevel(level);
    setGuide(null);
    setExplanation(null);
    setDeepDive(null);
    const result = await generateStudyMaterial(file, level);
    setGuide(result);
    setLoading(false);
  };

  const cleanTextForSpeech = (html: string) => {
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
  };

  const handleSpeak = (text: string, index: number) => {
      if (speakingSection === index) {
          window.speechSynthesis.cancel();
          setSpeakingSection(null);
          return;
      }

      window.speechSynthesis.cancel();
      
      const textToRead = cleanTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setSpeakingSection(null);
      
      utteranceRef.current = utterance;
      setSpeakingSection(index);
      window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
      window.speechSynthesis.cancel();
      setSpeakingSection(null);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !guide) return;
    
    try {
      setGeneratingPdf(true);
      
      const element = pdfRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgProps = canvas.width / canvas.height;
      const printHeight = pdfWidth / imgProps;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      let heightLeft = printHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, printHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - printHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, printHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${guide.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${currentLevel}.pdf`);
      
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Process HTML to inject glossary tooltips
  const injectInteractiveElements = (html: string, glossary: GlossaryTerm[]) => {
    if (!glossary || glossary.length === 0) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const walk = (node: Node) => {
        if (node.nodeType === 3) { // Text node
            const text = node.textContent;
            if (!text) return;
            
            // Check for glossary terms
            let newHtml = text;
            let modified = false;

            glossary.forEach(item => {
                // Simple regex to match whole words, case insensitive
                const regex = new RegExp(`\\b(${item.term})\\b`, 'gi');
                if (regex.test(newHtml)) {
                    // Wrap in span with data attributes for CSS tooltip
                    newHtml = newHtml.replace(regex, `<span class="glossary-term relative cursor-help border-b border-dotted border-teal-600 text-teal-800 font-medium group">$1<span class="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-50 text-center whitespace-normal pointer-events-none">${item.definition}</span></span>`);
                    modified = true;
                }
            });

            if (modified) {
                const span = document.createElement('span');
                span.innerHTML = newHtml;
                node.parentNode?.replaceChild(span, node);
            }
        } else if (node.nodeType === 1 && (node as Element).tagName !== 'A' && (node as Element).tagName !== 'SCRIPT') {
            // Recurse element nodes, skip existing links
            node.childNodes.forEach(walk);
        }
    };

    doc.body.childNodes.forEach(walk);
    return doc.body.innerHTML;
  };

  const levels = [
    { id: StudyLevel.QUICK, icon: Zap, label: "Quick Summary", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    { id: StudyLevel.DETAILED, icon: Layers, label: "Detailed Guide", color: "bg-blue-100 text-blue-700 border-blue-200" },
    { id: StudyLevel.ADVANCED, icon: GraduationCap, label: "Advanced Analysis", color: "bg-purple-100 text-purple-700 border-purple-200" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative" ref={containerRef} onMouseDown={clearSelection}>
      
      {/* Context "Magic" Menu */}
      {contextMenu.visible && (
          <div 
            className="fixed z-50 bg-slate-900 text-white rounded-lg shadow-xl flex items-center gap-1 p-1 transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-200"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent clearing selection when clicking menu
          >
              <button onClick={() => handleContextAction('simplify')} className="px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors">
                  <Sparkles className="w-3 h-3 text-yellow-400" /> Simplify
              </button>
              <div className="w-px h-4 bg-slate-700"></div>
              <button onClick={() => handleContextAction('example')} className="px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors">
                  <BookOpen className="w-3 h-3 text-blue-400" /> Example
              </button>
              <div className="w-px h-4 bg-slate-700"></div>
              <button onClick={() => handleContextAction('quiz')} className="px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors">
                  <HelpCircle className="w-3 h-3 text-purple-400" /> Quiz Me
              </button>
              <div className="w-px h-4 bg-slate-700"></div>
              <button onClick={handleDeepDive} className="px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors text-teal-300">
                  <Globe className="w-3 h-3" /> Deep Dive
              </button>
              
              {/* Arrow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-slate-900 rotate-45"></div>
          </div>
      )}

      {/* Explanation Side Drawer */}
      {(explaining || explanation || diving || deepDive) && (
          <div className="fixed top-24 right-4 z-40 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right fade-in duration-300 flex flex-col max-h-[80vh]">
               <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                   <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm capitalize">
                       {diving || deepDive ? <Globe className="w-4 h-4 text-teal-600"/> : <Sparkles className="w-4 h-4 text-teal-600"/>} 
                       {explaining || diving ? "Thinking..." : (deepDive ? "Deep Dive Research" : explanation?.type)}
                   </h3>
                   <button onClick={() => { setExplanation(null); setDeepDive(null); }} className="text-slate-400 hover:text-slate-600">
                       <X className="w-4 h-4" />
                   </button>
               </div>
               <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                   {explaining || diving ? (
                       <div className="flex flex-col items-center py-8">
                           <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
                           <p className="text-xs text-slate-400 font-medium">
                               {diving ? "Searching the web for latest info..." : "Consulting AI..."}
                           </p>
                       </div>
                   ) : deepDive ? (
                       <div className="space-y-4">
                           <div className="text-sm text-slate-700 leading-relaxed markdown-body">
                               <ReactMarkdown>{deepDive.content}</ReactMarkdown>
                           </div>
                           {deepDive.sources.length > 0 && (
                               <div className="border-t border-slate-100 pt-4 mt-4">
                                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Sources</h4>
                                   <ul className="space-y-2">
                                       {deepDive.sources.map((s, i) => (
                                           <li key={i}>
                                               <a href={s.uri} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-xs text-teal-600 hover:underline">
                                                   <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0"/>
                                                   {s.title}
                                               </a>
                                           </li>
                                       ))}
                                   </ul>
                               </div>
                           )}
                       </div>
                   ) : (
                       <div className="text-sm text-slate-700 leading-relaxed">
                           {explanation?.text}
                       </div>
                   )}
               </div>
          </div>
      )}

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            Generate Study Material
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => handleGenerate(lvl.id)}
                disabled={loading}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 hover:shadow-md ${
                  currentLevel === lvl.id ? 'ring-2 ring-offset-2 ring-teal-500 border-transparent shadow-lg transform scale-[1.02]' : 'border-slate-100 hover:border-teal-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''} bg-slate-50`}
              >
                <div className={`p-2 rounded-full ${lvl.color}`}>
                  <lvl.icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-700">{lvl.label}</span>
              </button>
            ))}
          </div>
      </div>

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-4" />
          <p className="animate-pulse text-lg font-medium text-slate-600">Generating structured content & diagrams...</p>
          <p className="text-sm mt-2 text-slate-400">This may take up to a minute due to image generation.</p>
        </div>
      )}

      {/* Preview & Actions */}
      {guide && !loading && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 z-20 gap-4">
             <div>
                <h3 className="font-bold text-slate-800">{guide.title}</h3>
                <p className="text-sm text-slate-500">{currentLevel}</p>
             </div>
             
             <div className="flex items-center gap-2">
                 {speakingSection !== null && (
                     <button
                        onClick={stopSpeaking}
                        className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors animate-pulse"
                     >
                         <StopCircle className="w-4 h-4" /> Stop Audio
                     </button>
                 )}

                 <button 
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50"
                 >
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                    {generatingPdf ? "Saving..." : "Download PDF"}
                 </button>
             </div>
          </div>

          <div className="w-full overflow-x-auto bg-slate-100 p-8 rounded-xl border border-slate-200 flex justify-center">
              {/* A4 Paper Container - 210mm x 297mm approx 794px x 1123px at 96dpi */}
              <div 
                ref={pdfRef}
                id="pdf-content"
                className="bg-white shadow-2xl p-[40px] w-[794px] min-h-[1123px] text-slate-900 box-border mx-auto origin-top"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                  {/* Header */}
                  <div className="border-b-2 border-slate-800 pb-6 mb-8">
                      <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">{guide.title}</h1>
                      <div className="flex justify-between text-slate-500 font-sans text-sm uppercase tracking-wider">
                          <span>{currentLevel}</span>
                          <span>VivaMentor AI Guide</span>
                          <span>{new Date().toLocaleDateString()}</span>
                      </div>
                  </div>

                  {/* Overview */}
                  <div className="mb-8 bg-slate-50 p-6 rounded-lg border-l-4 border-teal-600 group relative">
                      <button 
                        onClick={() => handleSpeak(guide.overview, -1)}
                        className={`absolute top-2 right-2 p-2 rounded-full shadow-sm transition-all ${
                            speakingSection === -1 
                            ? 'bg-teal-600 text-white' 
                            : 'bg-white text-slate-400 hover:text-teal-600 border border-slate-200'
                        }`}
                        title="Read Aloud"
                      >
                         {speakingSection === -1 ? <Square className="w-4 h-4 fill-current"/> : <Volume2 className="w-4 h-4"/>}
                      </button>
                      <h2 className="text-sm font-bold text-teal-700 uppercase tracking-widest mb-2 font-sans">Executive Summary</h2>
                      <p className="text-lg leading-relaxed text-slate-700 italic font-serif">
                          {guide.overview}
                      </p>
                  </div>

                  {/* Glossary Box - Displayed Explicitly as well for PDF readability */}
                  {guide.glossary && guide.glossary.length > 0 && (
                      <div className="mb-10 p-6 bg-slate-100 rounded-lg border border-slate-200">
                           <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 font-sans">
                               <BookOpen className="w-5 h-5 text-teal-600"/> Key Terms Glossary
                           </h2>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {guide.glossary.map((term, i) => (
                                   <div key={i} className="text-sm">
                                       <span className="font-bold text-slate-900 block">{term.term}</span>
                                       <span className="text-slate-600 font-serif">{term.definition}</span>
                                   </div>
                               ))}
                           </div>
                           <p className="text-xs text-slate-400 mt-4 italic">Tip: Hover over these terms in the text below for quick definitions.</p>
                      </div>
                  )}

                  {/* Sections */}
                  <div className="space-y-10">
                      {guide.sections.map((section, idx) => {
                          const processedContent = injectInteractiveElements(section.content, guide.glossary || []);
                          return (
                              <div key={idx} className="break-inside-avoid relative group">
                                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                                      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                          <span className="text-teal-600 text-3xl opacity-50">0{idx + 1}</span>
                                          {section.heading}
                                      </h2>
                                      <button 
                                        onClick={() => handleSpeak(section.content, idx)}
                                        className={`p-2 rounded-full shadow-sm transition-all ${
                                            speakingSection === idx 
                                            ? 'bg-teal-600 text-white' 
                                            : 'bg-slate-50 text-slate-400 hover:text-teal-600 border border-slate-200'
                                        }`}
                                        title="Read Section"
                                      >
                                         {speakingSection === idx ? <Square className="w-4 h-4 fill-current"/> : <Volume2 className="w-4 h-4"/>}
                                      </button>
                                  </div>
                                  
                                  {/* Diagram Render */}
                                  {section.diagram && (
                                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center">
                                       <div className="mermaid bg-white p-2 rounded w-full flex justify-center">
                                         {section.diagram}
                                       </div>
                                       <p className="text-xs text-slate-400 mt-2 font-sans flex items-center gap-1">
                                          <GitGraph className="w-3 h-3"/> Process Diagram
                                       </p>
                                    </div>
                                  )}

                                  {section.imageUrl && (
                                      <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50 p-2">
                                          <img 
                                            src={section.imageUrl} 
                                            alt={`Diagram for ${section.heading}`}
                                            className="w-full h-auto object-cover max-h-[300px] rounded" 
                                          />
                                          <p className="text-center text-xs text-slate-500 mt-2 font-sans italic">Figure {idx + 1}: AI Generated Visualization</p>
                                      </div>
                                  )}

                                  <div 
                                    className="prose prose-slate max-w-none font-serif text-justify text-slate-800 prose-headings:font-bold prose-headings:text-slate-900 prose-p:leading-relaxed prose-li:marker:text-teal-600 prose-a:text-teal-600 prose-a:underline hover:prose-a:text-teal-800"
                                    dangerouslySetInnerHTML={{ __html: processedContent }}
                                  />
                              </div>
                          );
                      })}
                  </div>

                  {/* Footer */}
                  <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 font-sans">
                      Generated by VivaMentor • Powered by Gemini
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyGuideGenerator;