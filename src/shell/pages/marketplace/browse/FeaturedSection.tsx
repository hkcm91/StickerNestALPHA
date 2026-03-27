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
    scrollToIndex(activeIndex + 1);
  }, [activeIndex, scrollToIndex]);

  // Auto-advance
  useEffect(() => {
    if (featured.length <= 1) return;

    autoAdvanceRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % featured.length;
        const el = scrollRef.current;
        if (el) {
          el.scrollTo({
            left: next * (CARD_WIDTH + CARD_GAP),
            behavior: 'smooth',
          });
        }
        return next;
      });
    }, AUTO_ADVANCE_MS);

    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [featured.length]);

  const handleMouseEnter = useCallback(() => { pausedRef.current = true; }, []);
  const handleMouseLeave = useCallback(() => { pausedRef.current = false; }, []);

  // Sync activeIndex on manual scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const index = Math.round(scrollLeft / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(Math.max(0, Math.min(index, featured.length - 1)));
  }, [featured.length]);

  if (loading) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <h2 style={sectionHeading}>Featured</h2>
        <div style={{ color: themeVar('--sn-text-muted'), fontSize: '14px' }}>
          Loading featured widgets...
        </div>
      </div>
    );
  }

  if (featured.length === 0) return null;

  return (
    <div
      data-testid="featured-section"
      style={{ marginBottom: '32px', position: 'relative' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <h2 style={sectionHeading}>Featured</h2>

      {/* Carousel container */}
      <div style={{ position: 'relative' }}>
        {/* Previous arrow */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous"
            style={{ ...arrowStyle, left: '-12px' }}
          >
            &#8249;
          </button>
        )}

        {/* Next arrow */}
        {activeIndex < featured.length - 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next"
            style={{ ...arrowStyle, right: '-12px' }}
          >
            &#8250;
          </button>
        )}

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            display: 'flex',
            gap: `${CARD_GAP}px`,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '4px',
          }}
        >
          <style>{`[data-testid="featured-section"] div::-webkit-scrollbar { display: none; }`}</style>
          {featured.map((widget) => (
            <div
              key={widget.id}
              style={{
                flex: `0 0 ${CARD_WIDTH}px`,
                scrollSnapAlign: 'start',
              }}
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
      </div>

      {/* Dot indicators */}
      {featured.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '12px',
          }}
        >
          {featured.map((widget, i) => (
            <button
              key={widget.id}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to featured widget ${i + 1}`}
              style={{
                width: i === activeIndex ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: i === activeIndex ? themeVar('--sn-accent') : themeVar('--sn-border'),
                cursor: 'pointer',
                padding: 0,
                transition: `width 200ms ${ANIMATION_EASING.spring}, background 200ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
