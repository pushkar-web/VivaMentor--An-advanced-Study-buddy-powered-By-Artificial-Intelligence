# VivaMentor

**Your AI-Powered Active Recall Study Assistant**

VivaMentor transforms static study materials into a dynamic, interactive learning ecosystem. Powered by Google's Gemini 1.5 Pro and Flash models, it helps students master any subject through Socratic dialogue, real-time voice-based oral exams, automated essay grading, and adaptive study planning.

<img width="1861" height="916" alt="image" src="https://github.com/user-attachments/assets/b831d56c-241e-4309-b5d7-e6809d9082d6" />


## 🚀 Features

### 1. 🎙️ Viva Examiner (Live API)
Experience a real-time oral exam with an AI professor.
- **Voice-to-Voice:** Speak naturally to the AI, and it responds with low-latency audio.
- **Dynamic Questioning:** The AI asks follow-up questions based on your answers, testing depth of knowledge.
- **Performance Analysis:** Get a detailed report card with scores for Accuracy, Clarity, and Depth after every session.

### 2. ⚔️ Debate Arena
Challenge your critical thinking by debating an AI opponent.
- **Controversial Topics:** The AI extracts nuanced topics from your document.
- **Stance Defense:** Choose a side (Agree/Disagree) and defend it against a devil's advocate.
- **AI Judge:** An impartial AI judge evaluates the transcript and declares a winner based on logic and evidence.

### 3. 📝 Essay Grader
Write essays on generated prompts and receive instant feedback.
- **Rubric-Based Grading:** Get scores for Thesis, Evidence, and Clarity.
- **Actionable Feedback:** Receive specific line-by-line corrections and improvements.

### 4. 🧠 Knowledge Graph
Visualize connections between concepts.
- **Interactive D3.js Graph:** Explore nodes and links representing key entities in your document.
- **Contextual Details:** Click on nodes to see definitions and importance scores.

### 5. 🎧 Audio Notebook
Turn your notes into a podcast.
- **Two-Host Format:** Generate a script for "Alex" and "Jamie" discussing your material.
- **TTS Generation:** Listen to the discussion on the go.

### 6. 📅 Study Planner
- **Adaptive Scheduling:** Input your exam date and available hours to generate a day-by-day plan.
- **Task Tracking:** Track progress and earn XP for completing tasks.

### 7. 🤖 Socratic Chat
- **Tutor Mode:** The AI guides you to the answer with questions rather than giving it away.
- **Challenger Mode:** The AI plays Devil's Advocate to test your arguments.

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **AI Models:** Google Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.5 Flash-8B
- **Voice/Audio:** Google Gemini Multimodal Live API, Web Audio API
- **Visualization:** D3.js, Mermaid.js
- **Icons:** Lucide React

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/vivamentor.git
    cd vivamentor
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory and add your Google Gemini API Key:
    ```env
    API_KEY=your_google_gemini_api_key
    ```

4.  **Run the application**
    ```bash
    npm start
    ```

## 🎮 Gamification

VivaMentor keeps you motivated with a built-in XP system:
- **Upload File:** +50 XP
- **Complete Quiz:** +10 XP per correct answer
- **Finish Viva Exam:** +100 XP
- **Win Debate:** +150 XP
- **Streak System:** Maintain a daily streak to boost your learning habit.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
