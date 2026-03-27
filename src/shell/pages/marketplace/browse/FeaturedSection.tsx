/**
 * FeaturedSection — hero carousel with navigation arrows and dot indicators.
 *
 * @module shell/pages/marketplace/browse
 * @layer L6
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { MarketplaceAPI } from '../../../../marketplace/api/marketplace-api';
import type { MarketplaceWidgetListing } from '../../../../marketplace/api/types';
import { ANIMATION_EASING } from '../../../theme/animation-tokens';
import { themeVar } from '../../../theme/theme-vars';
import { WidgetCard } from '../shared/WidgetCard';
import { sectionHeading } from '../styles';

export interface FeaturedSectionProps {
  api: MarketplaceAPI;
  onWidgetClick: (widgetId: string) => void;
  /** Render an action slot for each card (e.g., InstallButton). */
  renderAction?: (widget: MarketplaceWidgetListing) => React.ReactNode;
}

const CARD_WIDTH = 320;
const CARD_GAP = 16;
const AUTO_ADVANCE_MS = 6000;

const arrowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  border: `1px solid ${themeVar('--sn-border')}`,
  background: themeVar('--sn-surface'),
  color: themeVar('--sn-text'),
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
  backdropFilter: 'blur(8px)',
  transition: `opacity 150ms, background 150ms`,
};

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({
  api,
  onWidgetClick,
  renderAction,
}) => {
  const [featured, setFeatured] = useState<MarketplaceWidgetListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.getFeatured().then((items) => {
      if (!cancelled) {
        setFeatured(items);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api]);

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clampedIndex = Math.max(0, Math.min(index, featured.length - 1));
    setActiveIndex(clampedIndex);
    el.scrollTo({
      left: clampedIndex * (CARD_WIDTH + CARD_GAP),
      behavior: 'smooth',
    });
  }, [featured.length]);

  const handlePrev = useCallback(() => {
    scrollToIndex(activeIndex - 1);
  }, [activeIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
