export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64 string
}

export enum StudyLevel {
  QUICK = 'Quick Summary',
  DETAILED = 'Detailed Explanation',
  ADVANCED = 'Advanced Deep Dive',
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface StudySection {
  heading: string;
  content: string; // HTML format
  image_prompt: string; // JSON key from API
  imageUrl?: string; // Base64 data url
  diagram?: string; // Mermaid.js code
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface StudyGuide {
  title: string;
  overview: string;
  sections: StudySection[];
  glossary?: GlossaryTerm[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
}

export interface VivaReport {
  score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  metrics: {
    accuracy: number; // 0-100
    clarity: number; // 0-100
    depth: number; // 0-100
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface GraphNode {
  id: string;
  label: string;
  group: string; // e.g., 'concept', 'person', 'location'
  importance: number; // 1-10
  description?: string; // Short context for the node
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Study Planner Types
export interface PlanTask {
  time: string; // e.g., "30 mins"
  activity: string; // e.g., "Read Section 1", "Flashcards"
  description: string;
}

export interface DayPlan {
  day: number;
  focus: string;
  tasks: PlanTask[];
}

export interface StudyPlan {
  title: string;
  days: DayPlan[];
}

// Deep Dive Types
export interface SearchResult {
    title: string;
    uri: string;
}

export interface DeepDiveResult {
    content: string;
    sources: SearchResult[];
}

// Essay Grader Types
export interface EssayPrompt {
    id: number;
    prompt: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface EssayFeedback {
    score: number; // 0-100
    letterGrade: string;
    generalFeedback: string;
    rubric: {
        thesis: { score: number; feedback: string };
        evidence: { score: number; feedback: string };
        clarity: { score: number; feedback: string };
    };
    corrections: string[]; // Specific text improvements
}

// Debate Arena Types
export interface DebateTopic {
    id: number;
    topic: string;
    context: string;
}

export interface DebateTurn {
    speaker: 'User' | 'AI';
    text: string;
}

export interface DebateResult {
    winner: 'User' | 'AI' | 'Draw';
    userScore: number;
    aiScore: number;
    feedback: string;
    keyPointUser: string;
    keyPointAI: string;
}

export enum ChatMode {
  ASSISTANT = 'assistant', // Standard Q&A
  SOCRATIC = 'socratic',   // Asks questions to guide
  CHALLENGER = 'challenger' // Devil's Advocate
}

export enum AppView {
  UPLOAD = 'UPLOAD',
  DASHBOARD = 'DASHBOARD',
  STUDY_MATERIAL = 'STUDY_MATERIAL',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ = 'QUIZ',
  VIVA_EXAM = 'VIVA_EXAM',
  CHAT = 'CHAT',
  PODCAST = 'PODCAST',
  KNOWLEDGE_GRAPH = 'KNOWLEDGE_GRAPH',
  PLANNER = 'PLANNER',
  ESSAY_GRADER = 'ESSAY_GRADER',
  DEBATE_ARENA = 'DEBATE_ARENA',
}

// Helper types for Live API
export type AudioBufferSourceNodeWithEnded = AudioBufferSourceNode & {
  onended: ((this: AudioBufferSourceNode, ev: Event) => any) | null;
};