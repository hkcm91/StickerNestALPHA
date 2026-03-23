/**
 * OnboardingOverlay — First-time experience for Creator Mode.
 *
 * Full-screen overlay with "What do you want to create?" header and
 * three path cards:
 * 1. Start from template — opens a template picker
 * 2. Describe it — AI generates a widget from a text description
 * 3. Build visually — opens the Graph view with a starter node
 *
 * Spring-animated entry with staggered cards. Dismiss via card
 * selection or explicit close.
 *
 * @module lab/components
 * @layer L2
 */

import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';

import { HEX, hexToRgb, SPRING } from './shared/palette';

export type OnboardingPath = 'template' | 'describe' | 'visual';

export interface OnboardingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Called when a path is selected */
  onSelectPath: (path: OnboardingPath) => void;
  /** Called when the overlay is dismissed without selecting */
  onDismiss: () => void;
  /** Called when user submits a description (describe path) */
  onDescribe?: (description: string) => void;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
};

const cardStagger = (index: number) => ({
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SPRING_TRANSITION, delay: 0.15 + index * 0.1 },
  },
  exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } },
});

interface PathCard {
  id: OnboardingPath;
  icon: string;
  title: string;
  description: string;
  color: string;
  hex: string;
}

const PATHS: PathCard[] = [
  {
    id: 'template',
    icon: '📐',
    title: 'Start from a template',
    description: 'Choose from pre-built widgets — counter, weather, todo, and more. Customize to make it yours.',
    color: 'storm',
    hex: HEX.storm,
  },
  {
    id: 'describe',
    icon: '✨',
    title: 'Describe what you want',
    description: 'Tell the AI what to build in plain language. It will generate a working widget in seconds.',
    color: 'ember',
    hex: HEX.ember,
  },
  {
    id: 'visual',
    icon: '🔗',
    title: 'Build visually',
    description: 'Drag and connect nodes on the graph. No code required — like snapping puzzle pieces together.',
    color: 'violet',
    hex: HEX.violet,
  },
];

const PathCardComponent: React.FC<{
  card: PathCard;
  index: number;
  onSelect: (path: OnboardingPath) => void;
}> = ({ card, index, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const [r, g, b] = hexToRgb(card.hex);

  return (
    <motion.div {...cardStagger(index)}>
      <button
        onClick={() => onSelect(card.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-testid={`onboarding-card-${card.id}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '32px 24px',
          width: '260px',
          background: hovered
            ? `linear-gradient(135deg, rgba(${r},${g},${b},0.08) 0%, rgba(${r},${g},${b},0.02) 100%)`
            : 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
          border: `1px solid rgba(${r},${g},${b},${hovered ? 0.3 : 0.1})`,
          borderRadius: '16px',
          cursor: 'pointer',
          transition: `all 400ms ${SPRING}`,
          transform: hovered ? 'translateY(-4px)' : 'none',
          boxShadow: hovered
            ? `0 0 20px rgba(${r},${g},${b},0.15), 0 8px 32px rgba(0,0,0,0.2)`
            : '0 2px 8px rgba(0,0,0,0.2)',
          outline: 'none',
          textAlign: 'center',
          fontFamily: 'var(--sn-font-family)',
        }}
      >
        <span style={{ fontSize: '36px' }} aria-hidden="true">{card.icon}</span>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--sn-text, #E8E6ED)',
        }}>
          {card.title}
        </h3>
        <p style={{
          margin: 0,
          fontSize: '13px',
          lineHeight: 1.5,
          color: 'var(--sn-text-muted, #7A7784)',
        }}>
          {card.description}
        </p>
      </button>
    </motion.div>
  );
};

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  visible,
  onSelectPath,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          data-testid="onboarding-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,10,14,0.85)',
            backdropFilter: 'blur(12px)',
            fontFamily: 'var(--sn-font-family)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            aria-label="Close onboarding"
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              padding: '8px 16px',
              fontSize: '12px',
              fontFamily: 'var(--sn-font-family)',
              color: 'var(--sn-text-muted)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 200ms',
            }}
          >
            Skip
          </button>

          {/* Header — generous breathing room */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: SPRING_TRANSITION }}
            style={{
              margin: '0 0 16px 0',
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--sn-text, #E8E6ED)',
              fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
              textAlign: 'center',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            What do you want to create?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { ...SPRING_TRANSITION, delay: 0.08 } }}
            style={{
              margin: '0 0 48px 0',
              fontSize: '15px',
              color: 'var(--sn-text-muted, #7A7784)',
              textAlign: 'center',
              fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}
          >
            Pick a starting point — you can always switch approaches later.
          </motion.p>

          {/* Path cards */}
          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {PATHS.map((card, index) => (
              <PathCardComponent
                key={card.id}
                card={card}
                index={index}
                onSelect={onSelectPath}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
