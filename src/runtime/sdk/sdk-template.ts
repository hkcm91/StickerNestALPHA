/**
 * Widget SDK Template
 *
 * The StickerNest global object injected into every widget iframe.
 * This is the API surface that widget authors interact with.
 * Runs inside the sandboxed iframe, not in the host.
 *
 * @module runtime/sdk
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * The StickerNest SDK interface available to widgets as `window.StickerNest`.
 */
export interface StickerNestSDK {
  /** Emit an event to the host bus via bridge */
  emit(type: string, payload: unknown): void;
  /** Subscribe to events from the host bus */
  subscribe(type: string, handler: (payload: unknown) => void): void;
  /** Unsubscribe from events */
  unsubscribe(type: string, handler: (payload: unknown) => void): void;
  /** Save per-instance state (1MB limit) */
  setState(key: string, value: unknown): void;
  /** Retrieve per-instance state */
  getState(key: string): Promise<unknown>;
  /** Save cross-canvas user state (10MB total) */
  setUserState(key: string, value: unknown): void;
  /** Retrieve cross-canvas user state */
  getUserState(key: string): Promise<unknown>;
  /** Get user-configured values for this instance */
  getConfig(): Record<string, unknown>;
  /** Register widget manifest (must be called before ready) */
  register(manifest: unknown): void;
  /** Signal initialization complete (must be called within 500ms) */
  ready(): void;
  /** Receive theme token updates */
  onThemeChange(handler: (tokens: Record<string, string>) => void): void;
  /** Receive viewport resize events */
  onResize(handler: (width: number, height: number) => void): void;
  /** Proxied external data read */
  integration(name: string): {
    query(params: unknown): Promise<unknown>;
    mutate(params: unknown): Promise<unknown>;
  };
  /** Cross-canvas event emission */
  emitCrossCanvas(channel: string, payload: unknown): void;
  /** Cross-canvas event subscription */
  subscribeCrossCanvas(channel: string, handler: (payload: unknown) => void): void;
}

/**
 * Generates the SDK template JavaScript source for injection into srcdoc.
 *
 * @returns The SDK source code as a string
 */
export function generateSDKTemplate(): string {
  // TODO: Implement — see runtime plan section 2.3
  throw new Error('Not implemented: generateSDKTemplate');
}
