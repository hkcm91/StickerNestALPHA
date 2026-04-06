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

const CARD_WIDTH = 260;
const CARD_GAP = 14;
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
    scrollToIndex(activeIndex + 1);
  }, [activeIndex, scrollToIndex]);

  // Auto-advance carousel
  useEffect(() => {
    if (featured.length <= 1) return;
    autoAdvanceRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setActiveIndex((prev) => {
        const next = prev >= featured.length - 1 ? 0 : prev + 1;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [featured.length, scrollToIndex]);

  if (loading) {
    return (
      <div style={{ marginBottom: '24px', padding: '40px', textAlign: 'center', color: themeVar('--sn-text-muted') }}>
        Loading featured...
      </div>
    );
  }

  if (featured.length === 0) return null;

  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ ...sectionHeading, fontSize: '16px', margin: '0 0 12px' }}>Featured</h2>
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {/* Left arrow */}
        {activeIndex > 0 && (
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            style={{ ...arrowStyle, left: '-18px' }}
          >
            ‹
          </button>
        )}

        {/* Scrollable card row */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: `${CARD_GAP}px`,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            padding: '4px 0',
          }}
        >
          {featured.map((widget) => (
            <div
              key={widget.id}
              style={{ flex: `0 0 ${CARD_WIDTH}px`, scrollSnapAlign: 'start' }}
            >
              <WidgetCard
                id={widget.id}
                name={widget.name}
                description={widget.description}
                thumbnailUrl={widget.thumbnailUrl}
                category={widget.category}
                ratingAverage={widget.ratingAverage}
                ratingCount={widget.ratingCount}
                installCount={widget.installCount}
                isFree={widget.isFree}
                priceCents={widget.priceCents}
                currency={widget.currency}
                isOfficial={!!(widget.metadata as Record<string, unknown>)?.official}
                onClick={onWidgetClick}
                action={renderAction?.(widget)}
              />
            </div>
          ))}
        </div>

        {/* Right arrow */}
        {activeIndex < featured.length - 1 && (
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            style={{ ...arrowStyle, right: '-18px' }}
          >
            ›
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {featured.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          {featured.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === activeIndex ? themeVar('--sn-accent') : themeVar('--sn-border'),
                transition: `background 150ms ${ANIMATION_EASING.smooth}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
