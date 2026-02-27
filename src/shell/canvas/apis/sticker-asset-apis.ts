/**
 * Sticker asset API helpers.
 *
 * Provides lightweight clients for:
 * - Icon search (Iconify API)
 * - Lottie search (configurable endpoint + local fallback catalog)
 *
 * @module shell/canvas/apis
 * @layer L6
 */

export interface IconApiAsset {
  id: string;
  name: string;
  iconKey: string;
  svgContent: string;
  svgUrl: string;
  tags: string[];
  source: 'iconify';
}

export interface LottieApiAsset {
  id: string;
  name: string;
  assetUrl: string;
  previewUrl?: string;
  tags: string[];
  source: 'lottie-api' | 'catalog';
}

interface LottieSearchApiResponse {
  items: Array<{
    id: string;
    name: string;
    assetUrl: string;
    previewUrl?: string;
    tags?: string[];
  }>;
}

interface LottieSearchResultLike {
  id?: string | number;
  name?: string;
  title?: string;
  assetUrl?: string;
  animationUrl?: string;
  lottieUrl?: string;
  jsonUrl?: string;
  file?: string;
  url?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  image?: string;
  tags?: string[] | string;
}

const ICONIFY_SEARCH_URL = 'https://api.iconify.design/search';
const ICONIFY_SVG_URL = 'https://api.iconify.design';
const MAX_ICON_SEARCH_LIMIT = 16;

/**
 * Curated, high-quality icon sets to prioritize in search results.
 * These collections generally have better consistency and visual quality.
 */
const PREFERRED_ICON_PREFIXES = [
  'lucide',
  'mdi',
  'material-symbols',
  'heroicons',
  'tabler',
  'ph',
  'solar',
  'fluent',
  'ri',
  'fa6-solid',
  'openmoji',
  'game-icons',
  'twemoji',
  'logos',
] as const;

const DEFAULT_LOTTIE_CATALOG: LottieApiAsset[] = [
  {
    id: 'lottie-like',
    name: 'Like',
    assetUrl: 'https://assets2.lottiefiles.com/packages/lf20_4kx2q32n.json',
    tags: ['reaction', 'social', 'like'],
    source: 'catalog',
  },
  {
    id: 'lottie-loading',
    name: 'Loading Spinner',
    assetUrl: 'https://assets2.lottiefiles.com/packages/lf20_usmfx6bp.json',
    tags: ['loading', 'spinner', 'utility'],
    source: 'catalog',
  },
  {
    id: 'lottie-celebration',
    name: 'Celebration',
    assetUrl: 'https://assets2.lottiefiles.com/packages/lf20_jbrw3hcz.json',
    tags: ['party', 'celebration', 'confetti'],
    source: 'catalog',
  },
  {
    id: 'lottie-check',
    name: 'Success Check',
    assetUrl: 'https://assets2.lottiefiles.com/packages/lf20_xlkxtmul.json',
    tags: ['success', 'check', 'status'],
    source: 'catalog',
  },
];

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

/**
 * Search icon assets from Iconify and hydrate the SVG payload for direct SVG entity creation.
 */
export async function searchIconAssets(query: string, limit = 8): Promise<IconApiAsset[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const clampedLimit = Math.max(1, Math.min(limit, MAX_ICON_SEARCH_LIMIT));
  const fetchedKeys: string[] = [];
  const seenKeys = new Set<string>();

  // Search each preferred library first, then merge/dedupe.
  const preferredSearches = await Promise.all(
    PREFERRED_ICON_PREFIXES.map(async (prefix) => {
      const scopedUrl =
        `${ICONIFY_SEARCH_URL}?query=${encodeURIComponent(trimmed)}&prefix=${encodeURIComponent(prefix)}&limit=${clampedLimit}`;
      const scopedResponse = await fetch(scopedUrl);
      if (!scopedResponse.ok) return [];
      const scopedPayload = (await scopedResponse.json()) as { icons?: string[] };
      return scopedPayload.icons ?? [];
    }),
  );

  for (const keys of preferredSearches) {
    for (const key of keys) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      fetchedKeys.push(key);
      if (fetchedKeys.length >= clampedLimit) break;
    }
    if (fetchedKeys.length >= clampedLimit) break;
  }

  // Fallback to global Iconify search if curated sets didn't provide enough.
  if (fetchedKeys.length < clampedLimit) {
    const fallbackUrl = `${ICONIFY_SEARCH_URL}?query=${encodeURIComponent(trimmed)}&limit=${clampedLimit}`;
    const fallbackResponse = await fetch(fallbackUrl);
    if (!fallbackResponse.ok) {
      throw new Error(`Icon search failed (${fallbackResponse.status})`);
    }

    const fallbackPayload = (await fallbackResponse.json()) as { icons?: string[] };
    for (const key of fallbackPayload.icons ?? []) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      fetchedKeys.push(key);
      if (fetchedKeys.length >= clampedLimit) break;
    }
  }

  if (fetchedKeys.length === 0) return [];

  const svgResults = await Promise.all(
    fetchedKeys.slice(0, clampedLimit).map(async (iconKey) => {
      const svgUrl = `${ICONIFY_SVG_URL}/${iconKey}.svg`;
      const svgContent = await fetchText(svgUrl);
      const [prefix, name] = iconKey.split(':');
      return {
        id: `icon-${iconKey.replace(':', '-')}`,
        name: name ?? iconKey,
        iconKey,
        svgContent,
        svgUrl,
        tags: [prefix ?? 'icon', name ?? iconKey],
        source: 'iconify' as const,
      };
    }),
  );

  return svgResults;
}

/**
 * Search lottie assets.
 *
 * If `VITE_LOTTIE_SEARCH_API` is configured, this queries that endpoint:
 * `GET {base}?q=<query>&limit=<n>` and expects `{ items: [...] }`.
 *
 * Otherwise, falls back to a built-in catalog filtered by query.
 */
export async function searchLottieAssets(query: string, limit = 8): Promise<LottieApiAsset[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const configuredApi = import.meta.env.VITE_LOTTIE_SEARCH_API as string | undefined;
  if (configuredApi) {
    const url = `${configuredApi}${configuredApi.includes('?') ? '&' : '?'}q=${encodeURIComponent(trimmed)}&limit=${Math.max(1, Math.min(limit, 20))}`;
    const response = await fetch(url);
    if (response.ok) {
      const payload = (await response.json()) as
        | LottieSearchApiResponse
        | { data?: LottieSearchResultLike[]; results?: LottieSearchResultLike[] }
        | LottieSearchResultLike[];

      const items =
        Array.isArray(payload)
          ? payload
          : Array.isArray((payload as { items?: unknown }).items)
            ? ((payload as { items: LottieSearchResultLike[] }).items ?? [])
            : Array.isArray((payload as { data?: unknown }).data)
              ? ((payload as { data: LottieSearchResultLike[] }).data ?? [])
              : Array.isArray((payload as { results?: unknown }).results)
                ? ((payload as { results: LottieSearchResultLike[] }).results ?? [])
                : [];

      const normalized = items
        .map((item, index) => {
          const assetUrl =
            item.assetUrl ??
            item.animationUrl ??
            item.lottieUrl ??
            item.jsonUrl ??
            item.file ??
            item.url;
          if (!assetUrl) return null;

          const rawTags = item.tags;
          const tags = Array.isArray(rawTags)
            ? rawTags
            : typeof rawTags === 'string'
              ? rawTags.split(',').map((tag) => tag.trim()).filter(Boolean)
              : [];

          return {
            id: String(item.id ?? `lottie-${index}`),
            name: item.name ?? item.title ?? `Lottie ${index + 1}`,
            assetUrl,
            previewUrl: item.previewUrl ?? item.thumbnailUrl ?? item.image ?? '',
            tags,
            source: 'lottie-api' as const,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, limit) as LottieApiAsset[];

      if (normalized.length > 0) {
        return normalized;
      }
    }
  }

  return DEFAULT_LOTTIE_CATALOG
    .filter((item) => {
      if (item.name.toLowerCase().includes(trimmed)) return true;
      return item.tags.some((tag) => tag.toLowerCase().includes(trimmed));
    })
    .slice(0, limit);
}
