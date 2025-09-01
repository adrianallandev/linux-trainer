import React, { useState, useEffect } from 'react';
import questionsData from './questions.json'; // JSON with multiple-choice questions, correctIndex, and links

function App() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [scores, setScores] = useState({}); // { section: { correct: 0, total: 0 } }
  const [weakQuestions, setWeakQuestions] = useState(new Set());
  const [progress, setProgress] = useState(0); // Overall progress percentage
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set()); // Track answered questions

  useEffect(() => {
    // Load from localStorage
    const storedScores = JSON.parse(localStorage.getItem('scores')) || {};
    const storedWeak = JSON.parse(localStorage.getItem('weakQuestions')) || [];
    const storedAnswered = JSON.parse(localStorage.getItem('answeredQuestions')) || [];
    setScores(storedScores);
    setWeakQuestions(new Set(storedWeak));
    setAnsweredQuestions(new Set(storedAnswered));
    calculateProgress(storedScores);
  }, []);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('scores', JSON.stringify(scores));
    localStorage.setItem('weakQuestions', JSON.stringify(Array.from(weakQuestions)));
    localStorage.setItem('answeredQuestions', JSON.stringify(Array.from(answeredQuestions)));
    calculateProgress(scores);
  }, [scores, weakQuestions, answeredQuestions]);

  const calculateProgress = (currentScores) => {
    let totalCorrect = 0;
    let totalQuestions = 0;
    Object.keys(currentScores).forEach(section => {
      const s = currentScores[section];
      totalCorrect += s.correct;
      totalQuestions += s.total;
    });
    const prog = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    setProgress(prog.toFixed(1));
  };

  const getWeakSections = () => {
    const sectionScores = Object.keys(questionsData.sections).map(section => {
      const score = scores[section] || { correct: 0, total: 0 };
      const rate = score.total > 0 ? score.correct / score.total : 0.5;
      return { section, rate };
    });
    return sectionScores.sort((a, b) => a.rate - b.rate).map(s => s.section);
  };

  const getSectionsToStudy = () => {
    return getWeakSections().filter((section) => {
      const score = scores[section] || { correct: 0, total: 0 };
      const rate = score.total > 0 ? score.correct / score.total : 0;
      return rate < 0.7; // Sections with <70% correct need study
    });
  };

  const selectRandomQuestion = () => {
    const weakSections = getWeakSections();
    const halfLength = Math.ceil(weakSections.length / 2);
    const isWeakBias = Math.random() < 0.7;
    const sectionPool = isWeakBias ? weakSections.slice(0, halfLength) : weakSections;
    const section = sectionPool[Math.floor(Math.random() * sectionPool.length)];

    const levels = Object.keys(questionsData.sections[section]);
    const level = levels[Math.floor(Math.random() * levels.length)];
    const qs = questionsData.sections[section][level];

    // Get weak questions in this section/level
    const weakIndices = Array.from(weakQuestions)
      .filter(id => id.startsWith(`${section}-${level}-`))
      .map(id => parseInt(id.split('-')[2]));

    // Get answered questions in this section/level
    const answeredIndices = Array.from(answeredQuestions)
      .filter(id => id.startsWith(`${section}-${level}-`))
      .map(id => parseInt(id.split('-')[2]));

    // Prioritize weak questions (incorrect or used hint)
    let index;
    if (weakIndices.length > 0) {
      // Select from weak questions if available
      index = weakIndices[Math.floor(Math.random() * weakIndices.length)];
    } else {
      // Select from unanswered questions
      const unansweredIndices = Array.from({ length: qs.length }, (_, i) => i)
        .filter(i => !answeredIndices.includes(i));
      if (unansweredIndices.length > 0) {
        index = unansweredIndices[Math.floor(Math.random() * unansweredIndices.length)];
      } else {
        // If all questions in this section/level answered, fall back to any question
        index = Math.floor(Math.random() * qs.length);
      }
    }

    const q = qs[index];
    setSelectedSection(section);
    setSelectedLevel(level);
    setCurrentQuestion(q);
    setQuestionId(`${section}-${level}-${index}`);
    setShowAnswer(false);
    setShowHint(false);
    setShowExplanation(false);
    setUsedHint(false);
    setSelectedOption(null);
  };

  const handleHint = () => {
    setShowHint(true);
    setUsedHint(true);
  };

  const handleShowExplanation = () => {
    setShowExplanation(true);
  };

  const handleOptionSelect = (optionIndex) => {
    setSelectedOption(optionIndex);
    const isCorrect = optionIndex === currentQuestion.correctIndex;
    setShowAnswer(true);
    updateScore(isCorrect);
  };

  const updateScore = (isCorrect) => {
    const sectionScore = scores[selectedSection] || { correct: 0, total: 0 };
    sectionScore.total += 1;
    if (isCorrect) sectionScore.correct += 1;
    setScores({ ...scores, [selectedSection]: sectionScore });

    const newWeak = new Set(weakQuestions);
    const newAnswered = new Set(answeredQuestions);
    newAnswered.add(questionId); // Mark question as answered
    if (!isCorrect || usedHint) {
      newWeak.add(questionId); // Add to weak if incorrect or hint used
    } else {
      newWeak.delete(questionId); // Remove from weak if answered correctly without hint
    }
    setWeakQuestions(newWeak);
    setAnsweredQuestions(newAnswered);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Linux Trainer App</h1>
      <p>Overall Progress: {progress}%</p>
      <button onClick={selectRandomQuestion}>Start/Next Question</button>
      {currentQuestion && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '20px', maxWidth: '600px', margin: 'auto' }}>
          <h2>Section: {selectedSection} | Level: {selectedLevel}</h2>
          <p><strong>Question:</strong> {currentQuestion.question}</p>
          {!showAnswer ? (
            <>
              <div>
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    style={{ margin: '5px' }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button onClick={handleHint}>Hint</button>
            </>
          ) : (
            <>
              <p><strong>Answer:</strong> {currentQuestion.answer}</p>
              <p>You selected: {currentQuestion.options[selectedOption]}</p>
              <p>{selectedOption === currentQuestion.correctIndex ? 'Correct!' : 'Incorrect'}</p>
              <button onClick={handleShowExplanation}>Show Explanation</button>
              {showExplanation && (
                <>
                  <p><strong>Explanation:</strong> {currentQuestion.explanation}</p>
                  <p><strong>Example:</strong> <pre>{currentQuestion.example}</pre></p>
                  {currentQuestion.link && (
                    <p><strong>More Info:</strong> <a href={currentQuestion.link} target="_blank" rel="noopener noreferrer">{currentQuestion.link}</a></p>
                  )}
                </>
              )}
              <button onClick={selectRandomQuestion}>Next Question</button>
            </>
          )}
          {showHint && <p><strong>Hint:</strong> {currentQuestion.hint}</p>}
        </div>
      )}
      <div style={{ marginTop: '40px' }}>
        <h3>Your Scores</h3>
        {Object.keys(scores).map(section => {
          const s = scores[section];
          const rate = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : 'N/A';
          return <p key={section}>{section}: {s.correct}/{s.total} ({rate}%)</p>;
        })}
      </div>
      <div style={{ marginTop: '40px' }}>
        <h3>Sections to Study</h3>
        {getSectionsToStudy().length > 0 ? (
          <ul>
            {getSectionsToStudy().map(section => <li key={section}>{section}</li>)}
          </ul>
        ) : (
          <p>No sections need extra study at this time.</p>
        )}
      </div>
    </div>
  );
}

export default App;