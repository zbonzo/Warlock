/**
 * @fileoverview Test page to showcase the rune button styling
 */
import React from 'react';
import RuneButton from '../components/ui/RuneButton';
import ThemeToggle from '../components/common/ThemeToggle';
import './RuneButtonTest.css';

const RuneButtonTest: React.FC = () => {

  const handleClick = (buttonName: string): void => {
    console.log(`${buttonName} clicked!`);
    alert(`${buttonName} activated!`);
  };

  return (
    <div className="rune-test-container">
      <div className="rune-test-header">
        <h1>Rune Button Test</h1>
        <ThemeToggle variant="simple" showLabel />
      </div>
      
      <div className="rune-test-content">
        <div className="button-section">
          <h2>Font Showcase - "Cast the First Rune"</h2>
          <div className="font-grid">
            <div className="font-demo">
              <h3>Uncial Antiqua (Current)</h3>
              <RuneButton className="rune-button--uncial" onClick={() => handleClick('Uncial Antiqua')}>
                Cast the First Rune
              </RuneButton>
            </div>
            
            <div className="font-demo">
              <h3>Cinzel</h3>
              <RuneButton className="rune-button--cinzel" onClick={() => handleClick('Cinzel')}>
                Cast the First Rune
              </RuneButton>
            </div>
            
            <div className="font-demo">
              <h3>Macondo</h3>
              <RuneButton className="rune-button--macondo" onClick={() => handleClick('Macondo')}>
                Cast the First Rune
              </RuneButton>
            </div>
            
            <div className="font-demo">
              <h3>Pirata One</h3>
              <RuneButton className="rune-button--pirata" onClick={() => handleClick('Pirata One')}>
                Cast the First Rune
              </RuneButton>
            </div>
            
            <div className="font-demo">
              <h3>Nosifer</h3>
              <RuneButton className="rune-button--nosifer" onClick={() => handleClick('Nosifer')}>
                Cast the First Rune
              </RuneButton>
            </div>
            
            <div className="font-demo">
              <h3>MedievalSharp</h3>
              <RuneButton className="rune-button--medieval" onClick={() => handleClick('MedievalSharp')}>
                Cast the First Rune
              </RuneButton>
            </div>
            
            <div className="font-demo">
              <h3>Celtic Hand</h3>
              <RuneButton className="rune-button--celtic" onClick={() => handleClick('Celtic Hand')}>
                Cast the First Rune
              </RuneButton>
            </div>
            
            <div className="font-demo">
              <h3>Creepster</h3>
              <RuneButton className="rune-button--creepster" onClick={() => handleClick('Creepster')}>
                Cast the First Rune
              </RuneButton>
            </div>
          </div>
        </div>

        <div className="button-section">
          <h2>Color Variants</h2>
          <div className="button-grid">
            <RuneButton onClick={() => handleClick('Cast the First Rune')}>
              Cast the First Rune
            </RuneButton>
            <RuneButton variant="secondary" onClick={() => handleClick('Take your place')}>
              Take your place
            </RuneButton>
            <RuneButton variant="danger" onClick={() => handleClick('Begin the Quest')}>
              Begin the Quest
            </RuneButton>
            <RuneButton disabled>
              Preparing the betrayal...
            </RuneButton>
          </div>
        </div>

        <div className="button-section">
          <h2>Secondary Variants</h2>
          <div className="button-grid">
            <RuneButton variant="secondary" onClick={() => handleClick('Whisper the Code')}>
              Whisper the Code
            </RuneButton>
            <RuneButton variant="secondary" onClick={() => handleClick('Channel Magic')}>
              Channel Magic
            </RuneButton>
            <RuneButton variant="secondary" disabled>
              Ritual in Progress
            </RuneButton>
          </div>
        </div>

        <div className="button-section">
          <h2>Danger Variants</h2>
          <div className="button-grid">
            <RuneButton variant="danger" onClick={() => handleClick('Break the Seal')}>
              Break the Seal
            </RuneButton>
            <RuneButton variant="danger" onClick={() => handleClick('Embrace Shadow')}>
              Embrace Shadow
            </RuneButton>
            <RuneButton variant="danger" disabled>
              Corruption Spreads...
            </RuneButton>
          </div>
        </div>

        <div className="comparison-section">
          <h2>Current vs Rune Style</h2>
          <div className="comparison-grid">
            <div className="comparison-item">
              <h3>Standard Button</h3>
              <button className="standard-button">
                Cast the First Rune
              </button>
            </div>
            <div className="comparison-item">
              <h3>Rune Button</h3>
              <RuneButton onClick={() => handleClick('Rune Style')}>
                Cast the First Rune
              </RuneButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuneButtonTest;