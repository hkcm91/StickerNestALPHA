import { z } from 'zod';

/**
 * Green Screen Remover Widget configuration schema.
 */
export const greenScreenRemoverConfigSchema = z.object({
  /** Hue center for green detection (0–360). Default 120 = pure green */
  hueCenterDeg: z.number().min(0).max(360).default(120),
  /** Hue range ± from center to consider as "green" */
  hueRangeDeg: z.number().min(5).max(90).default(40),
  /** Minimum saturation (0–1) for a pixel to be considered green */
  minSaturation: z.number().min(0).max(1).default(0.15),
  /** Minimum lightness (0–1) for a pixel to be considered green */
  minLightness: z.number().min(0).max(1).default(0.10),
  /** Maximum lightness (0–1) for a pixel to be considered green */
  maxLightness: z.number().min(0).max(1).default(0.90),
  /** Edge softness — number of pixels to feather at green/non-green boundary */
  edgeSoftness: z.number().min(0).max(10).default(1),
});

/**
 * Inferred configuration type.
 */
export type GreenScreenRemoverConfig = z.infer<typeof greenScreenRemoverConfigSchema>;
