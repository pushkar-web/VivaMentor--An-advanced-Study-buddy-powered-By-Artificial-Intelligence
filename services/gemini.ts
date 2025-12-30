import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Flashcard, StudyLevel, UploadedFile, StudyGuide, QuizQuestion, VivaReport, ChatMessage, KnowledgeGraphData, StudyPlan, ChatMode, DeepDiveResult, EssayPrompt, EssayFeedback, DebateTopic, DebateResult, DebateTurn } from "../types";

// Helper to get text content from file
const getFilePart = (file: UploadedFile) => {
    let mimeType = file.type || 'application/pdf';
    const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType.includes('csv') || mimeType.includes('javascript') || mimeType.includes('html');
  
    if (isText) {
        try {
            return { text: atob(file.data) };
        } catch (e) {
            return { inlineData: { mimeType: 'text/plain', data: file.data } };
        }
    } else {
        if (!mimeType.includes('pdf') && !mimeType.includes('image')) {
            mimeType = 'application/pdf';
        }
        return { 
            inlineData: { 
                mimeType: mimeType, 
                data: file.data 
            } 
        };
    }
};

// Helper to generate an image based on a prompt
const generateIllustration = async (prompt: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  if (!prompt || prompt.trim() === "") return undefined;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Generate a high quality, educational illustration for: ${prompt}. White background, clear diagram style.` }]
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.warn("Failed to generate image for prompt:", prompt, error);
    return undefined;
  }
};

export const generateStudyMaterial = async (
  file: UploadedFile,
  level: StudyLevel
): Promise<StudyGuide | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = level === StudyLevel.ADVANCED 
    ? "gemini-3-pro-preview" 
    : "gemini-3-flash-preview";

  let promptContext = "";
  if (level === StudyLevel.QUICK) {
    promptContext = "Create a quick, high-level summary. Focus on key takeaways. Limit to 3 key sections.";
  } else if (level === StudyLevel.DETAILED) {
    promptContext = "Create a detailed study guide. Explain concepts clearly with examples. Structure logically. Include 2-3 visual prompts for key complex topics.";
  } else if (level === StudyLevel.ADVANCED) {
    promptContext = "Create an advanced academic analysis. Explore nuances and theoretical underpinnings. Include 3 visual prompts for abstract or complex data representations.";
  }

  const systemInstruction = `You are an expert educational content creator. 
  Your task is to analyze the provided document and generate a structured study guide in JSON format.
  
  The output must be a JSON object with this schema:
  {
    "title": "Document Title",
    "overview": "A brief executive summary of the document",
    "glossary": [
        { "term": "Key Term", "definition": "Short definition" }
    ],
    "sections": [
      {
        "heading": "Section Title",
        "content": "Rich HTML formatted text content. Use <b> for emphasis, <ul>/<li> for lists, <p> for paragraphs.",
        "image_prompt": "A descriptive prompt for an AI image generator (optional).",
        "diagram": "A Mermaid.js diagram code string (e.g., 'graph TD; A-->B;') if the content benefits from a flowchart, sequence diagram, or mindmap. Otherwise empty string."
      }
    ]
  }
  
  Instructions:
  1. Extract 5-10 key technical terms from the content and populate the 'glossary' array.
  2. For sections involving processes, hierarchies, or workflows, PROVIDE A VALID MERMAID.JS CODE in the 'diagram' field.
  
  ${promptContext}`;

  const parts: any[] = [getFilePart(file)];
  parts.push({ text: "Generate the study guide JSON." });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            overview: { type: Type.STRING },
            glossary: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        term: { type: Type.STRING },
                        definition: { type: Type.STRING }
                    },
                    required: ["term", "definition"],
                    propertyOrdering: ["term", "definition"]
                }
            },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  content: { type: Type.STRING },
                  image_prompt: { type: Type.STRING },
                  diagram: { type: Type.STRING }
                },
                required: ["heading", "content", "image_prompt", "diagram"],
                propertyOrdering: ["heading", "content", "image_prompt", "diagram"]
              }
            }
          },
          required: ["title", "overview", "sections", "glossary"],
          propertyOrdering: ["title", "overview", "glossary", "sections"]
        },
      }
    });

    if (!response.text) throw new Error("No text response from Gemini");
    
    const studyGuide: StudyGuide = JSON.parse(response.text);

    // 2. Generate Images for sections with prompts
    let imageCount = 0;
    
    for (let i = 0; i < studyGuide.sections.length; i++) {
        const section = studyGuide.sections[i];
        if (section.image_prompt && section.image_prompt.trim() !== "" && imageCount < 4) { 
            const imageUrl = await generateIllustration(section.image_prompt);
            if (imageUrl) {
                studyGuide.sections[i].imageUrl = imageUrl;
                imageCount++;
            }
        }
    }

    return studyGuide;

  } catch (error) {
    console.error("Error generating structured study material:", error);
    return null;
  }
};

export const generateFlashcards = async (file: UploadedFile): Promise<Flashcard[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const parts: any[] = [getFilePart(file)];
    parts.push({ text: "Generate 10 high-quality flashcards based on the key concepts in this document. Return a JSON object with a 'flashcards' array." });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                    },
                    required: ["front", "back"],
                    propertyOrdering: ["front", "back"]
                }
            }
          },
          required: ["flashcards"],
          propertyOrdering: ["flashcards"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const result = JSON.parse(jsonText);
    return result.flashcards || [];
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
};

export const generateQuiz = async (file: UploadedFile): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const parts: any[] = [getFilePart(file)];
    parts.push({ text: "Generate 10 multiple choice questions based on the document. Return a JSON object." });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING } 
                  },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });
    
    const result = JSON.parse(response.text || "{}");
    return result.questions || [];
  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};

export const analyzeVivaPerformance = async (
  history: { role: string, text: string }[]
): Promise<VivaReport | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (history.length < 2) return null;

  try {
    const transcript = history.map(h => `${h.role}: ${h.text}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Here is the transcript of a Viva Voce exam between a student (user) and an examiner (model)." },
          { text: transcript },
          { text: "Analyze the student's performance. Grade them on a scale of 0-100. Provide specific feedback, strengths, and areas for improvement." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            metrics: {
              type: Type.OBJECT,
              properties: {
                accuracy: { type: Type.INTEGER },
                clarity: { type: Type.INTEGER },
                depth: { type: Type.INTEGER },
              },
              required: ["accuracy", "clarity", "depth"]
            }
          },
          required: ["score", "feedback", "strengths", "improvements", "metrics"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Error analyzing viva:", e);
    return null;
  }
};

// --- CHAT FEATURE ---

export const getChatResponse = async (
    file: UploadedFile,
    history: ChatMessage[],
    newMessage: string,
    mode: ChatMode = ChatMode.ASSISTANT
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [getFilePart(file)];
    
    // Convert history to compatible format (limit to last 10 messages for context)
    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
        parts.push({ text: `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}` });
    });
    
    parts.push({ text: `User: ${newMessage}` });
    parts.push({ text: "Assistant:" });

    let systemInstruction = "You are a helpful study assistant. Answer questions based on the provided document context. Keep answers concise.";

    if (mode === ChatMode.SOCRATIC) {
        systemInstruction = "You are a Socratic Tutor. Do NOT give the direct answer. Instead, ask guiding questions to help the user discover the answer themselves based on the document. Be encouraging but firm in making them think.";
    } else if (mode === ChatMode.CHALLENGER) {
        systemInstruction = "You are a Devil's Advocate / Challenger. Whatever the user says, politely challenge their understanding, ask for proof from the document, or present a counter-argument to test their critical thinking.";
    }
    
    // Append instruction for suggested questions
    systemInstruction += "\n\nIMPORTANT: After your response, you MUST provide 3 short, relevant follow-up questions for the user to ask next. Format them at the very end of your response exactly like this: \n\n|||SUGGESTIONS: [Question 1] | [Question 2] | [Question 3]";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                systemInstruction: systemInstruction,
            }
        });
        return response.text || "I couldn't generate a response.";
    } catch (e) {
        console.error("Chat error:", e);
        return "Sorry, I encountered an error responding to that.";
    }
};


// --- PODCAST FEATURE ---

export const generatePodcastScript = async (file: UploadedFile): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    parts.push({ 
        text: `Write a lively and educational podcast script summarizing the key points of this document. 
        There are two hosts: 'Alex' (The inquisitive host) and 'Jamie' (The expert).
        Format the output exactly like this:
        Alex: [text]
        Jamie: [text]
        Alex: [text]
        ...
        Keep it under 500 words. Make it sound natural, like a real conversation.` 
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts }
        });
        return response.text || "";
    } catch (e) {
        console.error("Script generation error:", e);
        return "";
    }
};

export const generatePodcastAudio = async (script: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `TTS the following conversation between Alex and Jamie:\n${script}`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            {
                                speaker: 'Alex',
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                            },
                            {
                                speaker: 'Jamie',
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
                            }
                        ]
                    }
                }
            }
        });

        // Extract base64 audio
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;

    } catch (e) {
        console.error("Podcast audio generation error:", e);
        return null;
    }
};

// --- KNOWLEDGE GRAPH FEATURE ---

export const generateKnowledgeGraph = async (file: UploadedFile): Promise<KnowledgeGraphData | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    parts.push({ 
        text: `Analyze this document and extract a knowledge graph.
        Identify key concepts (nodes) and their relationships (links).
        Group nodes into categories like 'concept', 'person', 'event', 'location', etc.
        Assign an 'importance' score (1-10) to each node.
        Include a 'description' (max 15 words) for each node explaining its context in the document.
        Return a JSON object with 'nodes' and 'links' arrays.
        Limit to the top 20 most important nodes.
        ` 
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nodes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    label: { type: Type.STRING },
                                    group: { type: Type.STRING },
                                    importance: { type: Type.NUMBER },
                                    description: { type: Type.STRING }
                                },
                                required: ["id", "label", "group", "importance", "description"]
                            }
                        },
                        links: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    source: { type: Type.STRING },
                                    target: { type: Type.STRING },
                                    relation: { type: Type.STRING }
                                },
                                required: ["source", "target", "relation"]
                            }
                        }
                    },
                    required: ["nodes", "links"]
                }
            }
        });
        
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Knowledge Graph generation error:", e);
        return null;
    }
};

// --- DASHBOARD INSIGHTS ---

export const generateKeyInsights = async (file: UploadedFile): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    parts.push({ 
        text: `Provide 3 brief, high-impact key insights or takeaways from this document. 
        Each insight should be one sentence long.
        Return a JSON object with an 'insights' array of strings.` 
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        insights: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["insights"]
                }
            }
        });
        
        const result = JSON.parse(response.text || "{}");
        return result.insights || [];
    } catch (e) {
        console.error("Insights generation error:", e);
        return [];
    }
};


// --- STUDY PLANNER FEATURE ---

export const generateStudyPlan = async (file: UploadedFile, days: number, hoursPerDay: number): Promise<StudyPlan | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    parts.push({ 
        text: `Create a comprehensive study plan for this document.
        The user has ${days} days until the exam and can study ${hoursPerDay} hours per day.
        Break down the document into logical chunks.
        Assign specific tasks like "Read", "Review", "Quiz", "Flashcards" to fill the time.
        
        Return a JSON object with:
        - title (string)
        - days (array of objects):
            - day (number)
            - focus (string, theme of the day)
            - tasks (array of objects):
                - time (string, duration)
                - activity (string, type of task)
                - description (string, specific detail)
        ` 
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        days: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    day: { type: Type.INTEGER },
                                    focus: { type: Type.STRING },
                                    tasks: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                time: { type: Type.STRING },
                                                activity: { type: Type.STRING },
                                                description: { type: Type.STRING }
                                            },
                                            required: ["time", "activity", "description"]
                                        }
                                    }
                                },
                                required: ["day", "focus", "tasks"]
                            }
                        }
                    },
                    required: ["title", "days"]
                }
            }
        });
        
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Study Plan generation error:", e);
        return null;
    }
};

// --- CONTEXTUAL EXPLANATION & DEEP DIVE ---

export const explainSelectedText = async (file: UploadedFile, selectedText: string, action: 'simplify' | 'example' | 'quiz'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    
    let prompt = "";
    if (action === 'simplify') {
        prompt = `The user has highlighted this text: "${selectedText}". Explain it in simple terms like I'm 10 years old. Keep it under 2 sentences.`;
    } else if (action === 'example') {
        prompt = `The user has highlighted this text: "${selectedText}". Provide a concrete real-world example or analogy to help understand this. Keep it brief.`;
    } else if (action === 'quiz') {
        prompt = `The user has highlighted this text: "${selectedText}". Ask a single challenging multiple choice question to test understanding of this specific part. Include the answer after the options.`;
    }

    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts }
        });
        return response.text || "Could not generate explanation.";
    } catch (e) {
        console.error("Contextual explanation error:", e);
        return "Error connecting to AI.";
    }
};

export const generateDeepDive = async (selectedText: string): Promise<DeepDiveResult | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", // Search requires stronger reasoning often, using strongest available
            contents: `Research the concept "${selectedText}" in depth.
            Provide a comprehensive explanation including recent developments, real-world applications, and academic context.
            Focus on information that might NOT be in a standard textbook.
            `,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        // Extract sources from grounding metadata
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
            .filter((s: any) => s !== null) || [];

        return {
            content: response.text || "No information found.",
            sources: sources
        };
    } catch (e) {
        console.error("Deep dive error:", e);
        return null;
    }
};

// --- ESSAY GRADER ---

export const generateEssayPrompts = async (file: UploadedFile): Promise<EssayPrompt[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    parts.push({ 
        text: `Generate 3 essay prompts based on this document.
        One Easy, one Medium, one Hard (requires synthesis/critique).
        Return JSON.` 
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prompts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    prompt: { type: Type.STRING },
                                    difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
                                },
                                required: ["id", "prompt", "difficulty"]
                            }
                        }
                    },
                    required: ["prompts"]
                }
            }
        });
        return JSON.parse(response.text || "{}").prompts || [];
    } catch (e) {
        console.error("Essay prompt error:", e);
        return [];
    }
};

export const gradeEssay = async (file: UploadedFile, prompt: string, essay: string): Promise<EssayFeedback | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    parts.push({ 
        text: `You are a strict professor. 
        The student was asked: "${prompt}".
        Here is their essay: "${essay}".
        
        Grade it based on the document content.
        Return JSON with:
        - score (0-100)
        - letterGrade (A, B, C, D, F)
        - generalFeedback (2-3 sentences summary)
        - rubric (scores 0-10 and feedback for thesis, evidence, clarity)
        - corrections (list of specific improvements)
        ` 
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        letterGrade: { type: Type.STRING },
                        generalFeedback: { type: Type.STRING },
                        rubric: {
                            type: Type.OBJECT,
                            properties: {
                                thesis: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} } },
                                evidence: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} } },
                                clarity: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} } },
                            }
                        },
                        corrections: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["score", "letterGrade", "generalFeedback", "rubric", "corrections"]
                }
            }
        });
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Grading error:", e);
        return null;
    }
};

// --- DEBATE ARENA ---

export const generateDebateTopics = async (file: UploadedFile): Promise<DebateTopic[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    parts.push({ 
        text: `Analyze this document and identify 3 nuanced, controversial, or complex topics that would be suitable for an academic debate.
        For each topic, provide a short context.
        Return JSON.`
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topics: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    topic: { type: Type.STRING },
                                    context: { type: Type.STRING }
                                },
                                required: ["id", "topic", "context"]
                            }
                        }
                    },
                    required: ["topics"]
                }
            }
        });
        return JSON.parse(response.text || "{}").topics || [];
    } catch (e) {
        console.error("Debate topics error:", e);
        return [];
    }
};

export const getDebateResponse = async (
    file: UploadedFile,
    history: DebateTurn[],
    topic: string,
    userStance: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    
    // Construct debate context
    let debateContext = `We are in a formal debate.
    Topic: "${topic}"
    User Stance: ${userStance}
    AI Stance: ${userStance === 'Agree' ? 'Disagree' : 'Agree'}
    
    Current Transcript:
    `;
    
    history.forEach(turn => {
        debateContext += `${turn.speaker}: ${turn.text}\n`;
    });
    
    debateContext += `
    \nInstructions:
    - Respond as the opponent.
    - Be competitive, logical, and use evidence from the text.
    - Keep it under 150 words.
    - If this is the final round, make a closing statement.
    `;

    parts.push({ text: debateContext });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts }
        });
        return response.text || "I yield my time.";
    } catch (e) {
        console.error("Debate turn error:", e);
        return "Error in debate stream.";
    }
};

export const judgeDebate = async (
    file: UploadedFile,
    history: DebateTurn[],
    topic: string
): Promise<DebateResult | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [getFilePart(file)];
    
    let transcript = "";
    history.forEach(turn => {
        transcript += `${turn.speaker}: ${turn.text}\n`;
    });

    parts.push({
        text: `You are an impartial Debate Judge.
        Topic: "${topic}"
        
        Transcript:
        ${transcript}
        
        Evaluate the debate based on Logic, Evidence from the text, and Rhetoric.
        Decide a winner.
        Return JSON.`
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        winner: { type: Type.STRING, enum: ["User", "AI", "Draw"] },
                        userScore: { type: Type.INTEGER },
                        aiScore: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        keyPointUser: { type: Type.STRING },
                        keyPointAI: { type: Type.STRING }
                    },
                    required: ["winner", "userScore", "aiScore", "feedback", "keyPointUser", "keyPointAI"]
                }
            }
        });
        return JSON.parse(response.text || "null");
    } catch (e) {
        console.error("Judging error:", e);
        return null;
    }
};

export const getGeminiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });