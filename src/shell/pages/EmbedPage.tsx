/**
 * EmbedPage — stripped-down canvas view for iframe embedding on external sites.
 *
 * - No GlobalNav, sidebar, toolbar, or any shell chrome
 * - Always preview mode (locked layout, widgets interactive)
 * - Fetches canvas by slug from Supabase (canvases.slug + is_public = true)
 *
 * @module shell/pages
 * @layer L6
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import type { BackgroundSpec, ViewportConfig } from '@sn/types';
import { DEFAULT_BACKGROUND } from '@sn/types';

import { initCanvasCore, teardownCanvasCore } from '../../canvas/core';
import type { SceneGraph } from '../../canvas/core';
import { supabase } from '../../kernel/supabase/client';
import { useUIStore } from '../../kernel/stores/ui/ui.store';
import { WidgetFrame, InlineWidgetFrame } from '../../runtime';
import { BUILT_IN_WIDGET_HTML, BUILT_IN_WIDGET_COMPONENTS } from '../../runtime/widgets';
import { CanvasWorkspace, useSceneGraph } from '../canvas';
import { THEME_TOKENS } from '../theme/theme-tokens';
import { themeVar } from '../theme/theme-vars';

type EmbedStatus = 'loading' | 'ready' | 'not-found' | 'error';

interface PublicCanvasData {
  id: string;
  name: string;
  slug: string;
  background?: BackgroundSpec;
  viewportWidth?: number;
  viewportHeight?: number;
}

async function fetchPublicCanvas(slug: string): Promise<PublicCanvasData | null> {
  const { data, error } = await supabase
    .from('canvases')
    .select('id, name, slug, metadata')
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !data) return null;

  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  return {
    id: data.id,
    name: data.name ?? slug,
    slug: data.slug ?? slug,
    background: metadata.background as BackgroundSpec | undefined,
    viewportWidth: metadata.viewportWidth as number | undefined,
    viewportHeight: metadata.viewportHeight as number | undefined,
  };
}

async function fetchCanvasEntities(canvasId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('z_index', { ascending: true });

  if (error || !data) return [];
  return data;
}

export const EmbedPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const setMode = useUIStore((s) => s.setCanvasInteractionMode);
  const activeTheme = useUIStore((s) => s.theme);
  const [status, setStatus] = useState<EmbedStatus>('loading');
  const [canvasData, setCanvasData] = useState<PublicCanvasData | null>(null);
  const [sceneGraph, setSceneGraph] = useState<SceneGraph | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setMode('preview');
  }, [setMode]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const canvas = await fetchPublicCanvas(slug);
      if (cancelled) return;
      if (!canvas) { setStatus('not-found'); return; }
      setCanvasData(canvas);
      setStatus('ready');
    }
    load().catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!canvasData) return;
    const coreCtx = initCanvasCore();
    setSceneGraph(coreCtx.sceneGraph);
    hydratedRef.current = false;
    return () => {
      teardownCanvasCore();
      setSceneGraph(null);
      hydratedRef.current = false;
    };
  }, [canvasData?.id]);

  useEffect(() => {
    if (!canvasData || !sceneGraph || hydratedRef.current) return;
    let cancelled = false;
    async function hydrate() {
      const entities = await fetchCanvasEntities(canvasData!.id);
      if (cancelled || !sceneGraph) return;
      for (const rawEntity of entities) {
        sceneGraph.addEntity(rawEntity as never);
      }
      hydratedRef.current = true;
    }
    hydrate().catch(() => {});
    return () => { cancelled = true; };
  }, [canvasData, sceneGraph]);

  const entities = useSceneGraph(sceneGraph);

  const widgetHtmlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entity of entities) {
      if (entity.type === 'widget') {
        const wEntity = entity as { widgetInstanceId: string; widgetId: string };
        const html = BUILT_IN_WIDGET_HTML[wEntity.widgetId];
        if (html) map.set(wEntity.widgetInstanceId, html);
      }
    }
    return map;
  }, [entities]);

  const widgetTheme = useMemo(() => ({ ...THEME_TOKENS[activeTheme] }), [activeTheme]);
  const background = canvasData?.background ?? DEFAULT_BACKGROUND;

  if (status === 'loading') {
    return (
      <div data-testid="embed-loading" style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: themeVar('--sn-bg'), color: themeVar('--sn-text-muted'), fontFamily: themeVar('--sn-font-family') }}>
        Loading...
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div data-testid="embed-not-found" style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: themeVar('--sn-bg'), color: themeVar('--sn-text-muted'), fontFamily: themeVar('--sn-font-family') }}>
        Canvas not found
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div data-testid="embed-error" style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: themeVar('--sn-bg'), color: themeVar('--sn-text-muted'), fontFamily: themeVar('--sn-font-family') }}>
        Failed to load canvas
      </div>
    );
  }

  return (
    <div data-testid="embed-canvas" style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: themeVar('--sn-bg') }}>
      <CanvasWorkspace
        sceneGraph={sceneGraph}
        dashboardSlug={slug}
        maxArtboardsPerDashboard={1}
        widgetHtmlMap={widgetHtmlMap}
        background={background}
        theme={widgetTheme}
      />
    </div>
  );
};
