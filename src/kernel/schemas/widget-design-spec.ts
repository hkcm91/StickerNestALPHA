/**
 * Widget Design Spec schema — portable design rules for widgets.
 *
 * Inspired by Google Stitch's DESIGN.md concept: a transferable
 * specification of fonts, spacing, colors, borders, shadows, and
 * component styles that travels with the widget.
 *
 * @module @sn/types/widget-design-spec
 */

import { z } from 'zod';

/**
 * Color palette for a widget design spec.
 */
export const DesignSpecColorsSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  background: z.string().optional(),
  surface: z.string().optional(),
  text: z.string().optional(),
  textMuted: z.string().optional(),
  accent: z.string().optional(),
  error: z.string().optional(),
  success: z.string().optional(),
  warning: z.string().optional(),
});

export type DesignSpecColors = z.infer<typeof DesignSpecColorsSchema>;

/**
 * Typography specification.
 */
export const DesignSpecTypographySchema = z.object({
  fontFamily: z.string().optional(),
  fontFamilyMono: z.string().optional(),
  fontSizeBase: z.string().optional(),
  fontSizeSm: z.string().optional(),
  fontSizeLg: z.string().optional(),
  fontSizeXl: z.string().optional(),
  fontWeightNormal: z.number().optional(),
  fontWeightBold: z.number().optional(),
  lineHeight: z.string().optional(),
});

export type DesignSpecTypography = z.infer<typeof DesignSpecTypographySchema>;

/**
 * Spacing scale.
 */
export const DesignSpecSpacingSchema = z.object({
  unit: z.string().optional(),
  xs: z.string().optional(),
  sm: z.string().optional(),
  md: z.string().optional(),
  lg: z.string().optional(),
  xl: z.string().optional(),
});

export type DesignSpecSpacing = z.infer<typeof DesignSpecSpacingSchema>;

/**
 * Border specification.
 */
export const DesignSpecBordersSchema = z.object({
  radius: z.string().optional(),
  radiusSm: z.string().optional(),
  radiusLg: z.string().optional(),
  radiusFull: z.string().optional(),
  width: z.string().optional(),
  color: z.string().optional(),
});

export type DesignSpecBorders = z.infer<typeof DesignSpecBordersSchema>;

/**
 * Shadow specification.
 */
export const DesignSpecShadowsSchema = z.object({
  sm: z.string().optional(),
  md: z.string().optional(),
  lg: z.string().optional(),
});

export type DesignSpecShadows = z.infer<typeof DesignSpecShadowsSchema>;

/**
 * Named component style overrides.
 */
export const DesignSpecComponentSchema = z.object({
  name: z.string().min(1),
  tokens: z.record(z.string(), z.string()),
});

export type DesignSpecComponent = z.infer<typeof DesignSpecComponentSchema>;

/**
 * Complete Widget Design Spec.
 *
 * All fields are optional — widgets without a design spec fall back
 * to the platform's 8 core theme tokens.
 */
export const WidgetDesignSpecSchema = z.object({
  /** Spec version for forward compatibility */
  version: z.literal(1).default(1),
  /** Human-readable name for this design system */
  name: z.string().max(100).optional(),
  /** Color palette */
  colors: DesignSpecColorsSchema.optional(),
  /** Typography rules */
  typography: DesignSpecTypographySchema.optional(),
  /** Spacing scale */
  spacing: DesignSpecSpacingSchema.optional(),
  /** Border rules */
  borders: DesignSpecBordersSchema.optional(),
  /** Shadow definitions */
  shadows: DesignSpecShadowsSchema.optional(),
  /** Named component style overrides */
  components: z.array(DesignSpecComponentSchema).optional(),
  /** Arbitrary custom tokens (key = CSS custom property name, value = CSS value) */
  customTokens: z.record(z.string(), z.string()).optional(),
});

export type WidgetDesignSpec = z.infer<typeof WidgetDesignSpecSchema>;

/**
 * JSON Schema export for external validation.
 */
export const WidgetDesignSpecJSONSchema = WidgetDesignSpecSchema.toJSONSchema();
