/**
 * Publish Pipeline
 *
 * Orchestrates the full publish flow: validate → test → thumbnail → submit.
 * Steps cannot be skipped. Failure at any step halts the pipeline.
 *
 * @module lab/publish
 * @layer L2
 */

import type { WidgetManifest } from '@sn/types';

import { submitWidget } from './submitter';
import type { SubmitResult } from './submitter';
import { testWidget } from './tester';
import { generateThumbnail } from './thumbnail';
import { validateWidget } from './validator';

export type PipelineStep = 'idle' | 'validating' | 'testing' | 'thumbnail' | 'submitting' | 'done' | 'failed';

export interface PipelineStatus {
  step: PipelineStep;
  error?: string;
  errors?: string[];
  result?: SubmitResult;
}

export interface PublishPipeline {
  run(html: string, manifest: WidgetManifest, authorId?: string): Promise<PipelineStatus>;
  getStatus(): PipelineStatus;
  reset(): void;
}

/**
 * Creates a publish pipeline that enforces the full validation flow.
 */
export function createPublishPipeline(): PublishPipeline {
  let status: PipelineStatus = { step: 'idle' };

  return {
    async run(html: string, manifest: WidgetManifest, authorId?: string): Promise<PipelineStatus> {
      // Step 1: Validate
      status = { step: 'validating' };
      const validation = validateWidget(html);
      if (!validation.valid) {
        status = { step: 'failed', error: 'Validation failed', errors: validation.errors };
        return status;
      }

      // Step 2: Test
      status = { step: 'testing' };
      const testResult = testWidget(html, manifest);
      if (!testResult.passed) {
        status = { step: 'failed', error: 'Testing failed', errors: testResult.errors };
        return status;
      }

      // Step 3: Thumbnail
      status = { step: 'thumbnail' };
      const thumbnailResult = await generateThumbnail(html);
      if (!thumbnailResult.success) {
        status = { step: 'failed', error: 'Thumbnail generation failed', errors: [thumbnailResult.error ?? 'Unknown error'] };
        return status;
      }

      // Step 4: Submit
      status = { step: 'submitting' };
      const submitResult = await submitWidget({
        html,
        manifest,
        thumbnail: thumbnailResult.data,
        authorId: authorId ?? '',
      });
      if (!submitResult.success) {
        status = { step: 'failed', error: 'Submission failed', errors: [submitResult.error ?? 'Unknown error'] };
        return status;
      }

      status = { step: 'done', result: submitResult };
      return status;
    },

    getStatus() {
      return status;
    },

    reset() {
      status = { step: 'idle' };
    },
  };
}
