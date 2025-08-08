import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../../contexts/AppContext';
import './DamageEffects.css';

interface DamageEffectsProps {
  eventsLog: EventsLogRound[];
  playerName?: string;
  playerId: string;
}

interface EventsLogRound {
  round: number;
  events: GameEvent[];
}

interface GameEvent {
  type: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  attackerName?: string;
  abilityName?: string;
}

interface DamageEffect {
  id: number;
  type: string;
  duration: number;
  className: string;
  startTime: number;
}

interface EffectConfig {
  duration: number;
  className: string;
}

type EffectType = 'fire' | 'slash' | 'poison' | 'lightning' | 'ice' | 'blunt' | 'nature' | 'corruption' | 'arcane' | 'burst' | 'divine';

const DamageEffects: React.FC<DamageEffectsProps> = ({ eventsLog, playerName, playerId }) => {
  const [activeEffects, setActiveEffects] = useState<DamageEffect[]>([]);
  const [effectQueue, setEffectQueue] = useState<EffectType[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const abilityToEffect: Record<string, EffectType> = {
    // Fire-based abilities
    Fireball: 'fire',
    Cauterize: 'fire',
    Pyroblast: 'fire',
    'Inferno Blast': 'fire',

    // Physical/slashing attacks
    Slash: 'slash',
    Backstab: 'slash',
    'Twin Strike': 'slash',
    'Reckless Strike': 'slash',
    'Claw Swipe': 'slash',

    // Poison abilities
    'Poison Strike': 'poison',
    'Death Mark': 'poison',
    Shiv: 'poison',
    'Poison Trap': 'poison',
    'Barbed Arrow': 'poison',

    // Lightning abilities
    'Lightning Bolt': 'lightning',
    'Chain Lightning': 'lightning',
    'Psychic Bolt': 'lightning',

    // Arcane abilities (purple-themed)
    'Magic Missile': 'arcane',
    'Arcane Barrage': 'arcane',
    'Meteor Shower': 'arcane',

    // Projectile/Burst abilities (💥 effect)
    'Precise Shot': 'burst',
    'Pistol Shot': 'burst',
    'Aimed Shot': 'burst',
    'Ricochet Round': 'burst',

    // Divine abilities (light yellow orbs)
    'Holy Bolt': 'divine',
    'Sanctuary of Truth': 'divine',
    Heal: 'divine',
    'Swift Mend': 'divine',

    // Blunt/impact abilities
    'Primal Roar': 'blunt',
    'Blood Frenzy': 'blunt',
    'Unstoppable Rage': 'blunt',
    'Control Monster': 'blunt',

    // Nature abilities
    Entangle: 'nature',
    Rejuvenation: 'nature',
    'Ancestral Heal': 'nature',
  };

  const damageEffectConfigs: Record<EffectType, EffectConfig> = {
    fire: { duration: 2500, className: 'fire-effect' },
    slash: { duration: 1800, className: 'slash-effect' },
    poison: { duration: 3000, className: 'poison-effect' },
    lightning: { duration: 1500, className: 'lightning-effect' },
    ice: { duration: 2000, className: 'ice-effect' },
    blunt: { duration: 1200, className: 'blunt-effect' },
    nature: { duration: 2200, className: 'nature-effect' },
    corruption: { duration: 4000, className: 'corruption-effect' },
    arcane: { duration: 2000, className: 'arcane-effect' },
    burst: { duration: 1500, className: 'burst-effect' },
    divine: { duration: 2200, className: 'divine-effect' },
  };

  const triggerDamageEffect = useCallback((effectType: EffectType) => {
    const config = damageEffectConfigs[effectType];
    if (!config) return;

    const effectId = Date.now() + Math.random();
    const newEffect: DamageEffect = {
      id: effectId,
      type: effectType,
      ...config,
      startTime: Date.now(),
    };

    setActiveEffects((prev) => [...prev, newEffect]);

    setTimeout(() => {
      setActiveEffects((prev) => prev.filter((e) => e.id !== effectId));
    }, config.duration);
  }, []);

  useEffect(() => {
    if (effectQueue.length > 0 && !isProcessingQueue) {
      setIsProcessingQueue(true);

      const processNext = () => {
        setEffectQueue((prev) => {
          const [nextEffect, ...remaining] = prev;
          if (nextEffect) {
            triggerDamageEffect(nextEffect);
          }

          if (remaining.length > 0) {
            setTimeout(processNext, 500);
          } else {
            setIsProcessingQueue(false);
          }

          return remaining;
        });
      };

      processNext();
    }
  }, [effectQueue, isProcessingQueue, triggerDamageEffect]);

  useEffect(() => {
    if (!eventsLog.length || !playerId) return;

    const latestRound = eventsLog[eventsLog.length - 1];
    if (!latestRound?.events) return;

    const playerEvents = latestRound.events.filter((event) => {
      if (event.targetId === playerId) {
        return true;
      }
      if (event.targetName === playerName) {
        return true;
      }
      return false;
    });

    console.log('Found player events:', playerEvents);

    const newEffects: EffectType[] = [];

    playerEvents.forEach((event) => {
      console.log('Processing event:', event);

      if (event.type === 'corruption') {
        newEffects.push('corruption');
        return;
      }

      if (event.type === 'damage' && event.damage) {
        const actionEvent = latestRound.events.find(
          (e) =>
            e.type === 'action_announcement' &&
            e.targetId === event.targetId &&
            e.abilityName
        );

        if (actionEvent?.abilityName) {
          const effectType = abilityToEffect[actionEvent.abilityName];
          if (effectType) {
            newEffects.push(effectType);
          }
        }
        else if (event.attackerName === 'The Monster') {
          newEffects.push('blunt');
        }
      }

      if (event.type === 'stone_armor_degradation') {
        newEffects.push('blunt');
      }
    });

    if (newEffects.length > 0) {
      console.log('Queueing effects:', newEffects);
      setEffectQueue((prev) => [...prev, ...newEffects]);
    }
  }, [eventsLog, playerId, playerName]);

  if (activeEffects.length === 0) return null;

  return (
    <div className="damage-effects-container">
      {activeEffects.map((effect) => (
        <div
          key={effect.id}
          className={`damage-effect-overlay ${effect.className}`}
          style={{
            animationDuration: `${effect.duration}ms`,
          }}
        >
          {effect.type === 'corruption' && (
            <div
              className="corruption-text"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '5rem',
                fontWeight: '900',
                textAlign: 'center',
                color: '#cc0000',
                textShadow: `
                  0 0 20px currentColor,
                  0 0 40px currentColor,
                  0 0 60px currentColor,
                  3px 3px 0px rgba(0, 0, 0, 1),
                  -3px -3px 0px rgba(0, 0, 0, 1),
                  3px -3px 0px rgba(0, 0, 0, 1),
                  -3px 3px 0px rgba(0, 0, 0, 1)
                `,
                letterSpacing: '0.2em',
                animation: 'corruptedTextDelayed 4s ease-out forwards',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              CORRUPTED
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DamageEffects;