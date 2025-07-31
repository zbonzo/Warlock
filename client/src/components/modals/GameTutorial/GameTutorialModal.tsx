/**
 * @fileoverview Updated tutorial modal with new game mechanics
 * Mobile-optimized with concise content and better UX
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { TUTORIAL_STEPS } from './constants';
import './GameTutorialModal.css';

export interface GameTutorialModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const GameTutorialModal: React.FC<GameTutorialModalProps> = ({ isOpen, onComplete }) => {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      } else if (e.key === 'ArrowRight') {
        nextStep();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const nextStep = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setExiting(true);

    setTimeout(() => {
      setExiting(false);
      setStep(0);
      onComplete();
    }, 300);
  };

  const renderStepContent = (stepData: typeof TUTORIAL_STEPS[0]) => {
    const {
      type,
      content,
      highlights,
      steps,
      tips,
      formula,
      rules,
      races,
      classes,
      strategy,
      tells,
      methods,
      goodTips,
      warlockTips,
      reminders,
    } = stepData;

    return (
      <div className="tutorial-step-content">
        <p className="tutorial-main-content">{content}</p>

        {highlights && (
          <div className="tutorial-highlights">
            {highlights.map((highlight, index) => (
              <div key={index} className="tutorial-highlight">
                <span className="highlight-icon">{highlight.icon}</span>
                <span className="highlight-text">{highlight.text}</span>
              </div>
            ))}
          </div>
        )}

        {steps && (
          <div className="tutorial-steps">
            {steps.map((stepText, index) => (
              <div key={index} className="tutorial-step-item">
                {stepText}
              </div>
            ))}
          </div>
        )}

        {tips && (
          <div className="tutorial-tips">
            <h4>💡 Key Points:</h4>
            <ul>
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {formula && <div className="tutorial-formula">{formula}</div>}

        {rules && (
          <div className="tutorial-rules">
            <h4>Important Rules:</h4>
            <ul>
              {rules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
        )}

        {races && (
          <div className="tutorial-races">
            {races.map((race, index) => (
              <div key={index} className="tutorial-race-card">
                <div className="race-header">
                  <span className="race-emoji">{race.emoji}</span>
                  <span className="race-name">{race.name}</span>
                  <span className="race-type">({race.type})</span>
                </div>
                <div className="race-ability">{race.ability}</div>
              </div>
            ))}
          </div>
        )}

        {classes && (
          <div className="tutorial-classes">
            {classes.map((cls, index) => (
              <div key={index} className="tutorial-class-card">
                <div className="class-header">
                  <span className="class-emoji">{cls.emoji}</span>
                  <span className="class-name">{cls.name}</span>
                  <span className="class-type">({cls.type})</span>
                </div>
                <div className="class-desc">{cls.desc}</div>
              </div>
            ))}
            {strategy && (
              <div className="tutorial-strategy">
                <strong>🎯 Strategy:</strong> {strategy}
              </div>
            )}
          </div>
        )}

        {tells && (
          <div className="tutorial-tells">
            <div className="warlock-tells">
              <h4>👹 Warlock Tells:</h4>
              <ul>
                {tells.map((tell, index) => (
                  <li key={index}>{tell}</li>
                ))}
              </ul>
            </div>
            {methods && (
              <div className="detection-methods">
                <h4>🔎 Detection Methods:</h4>
                {methods.map((method, index) => (
                  <div key={index} className="detection-method">
                    <span className="method-icon">{method.icon}</span>
                    <span className="method-name">{method.name}:</span>
                    <span className="method-desc">{method.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(goodTips || warlockTips) && (
          <div className="tutorial-strategy-tips">
            {goodTips && (
              <div className="good-tips">
                <h4>🕵️ For Good Players:</h4>
                <ul>
                  {goodTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {warlockTips && (
              <div className="warlock-tips">
                <h4>👹 For Warlocks:</h4>
                <ul>
                  {warlockTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {reminders && type === 'ready' && (
          <div className="tutorial-ready">
            <div className="ready-icon">🧙‍♂️⚔️👹</div>
            <div className="ready-reminders">
              <h4>🌟 Remember:</h4>
              <ul>
                {reminders.map((reminder, index) => (
                  <li key={index}>{reminder}</li>
                ))}
              </ul>
            </div>
            <div className="ready-message">
              <strong>Good luck, and may the best team win! 🏆</strong>
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentStep = TUTORIAL_STEPS[step];

  return (
    <div className={`tutorial-overlay ${exiting ? 'exiting' : ''}`}>
      <div className="tutorial-modal">
        <h2 className="tutorial-title">{currentStep.title}</h2>

        <div className="tutorial-content">{renderStepContent(currentStep)}</div>

        <div className="tutorial-navigation">
          <button
            className="tutorial-button back-button"
            onClick={prevStep}
            disabled={step === 0}
          >
            ← Prev
          </button>

          <div className="tutorial-counter">
            <span>{step + 1}</span> / <span>{TUTORIAL_STEPS.length}</span>
          </div>

          <button className="tutorial-button next-button" onClick={nextStep}>
            {step < TUTORIAL_STEPS.length - 1 ? 'Next →' : 'Play! 🎮'}
          </button>
        </div>

        <button
          className="close-button"
          onClick={handleComplete}
          aria-label="Close tutorial"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default GameTutorialModal;