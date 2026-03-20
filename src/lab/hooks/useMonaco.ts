/**
 * useMonaco — Monaco editor setup hook for the Widget Lab.
 *
 * Configures Monaco with:
 * - StickerNest dark theme matching design tokens
 * - StickerNest.* SDK autocompletions with parameter hints
 * - HTML/JS/CSS language defaults for single-file widget editing
 *
 * @module lab/hooks
 * @layer L2
 */

import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════
// Theme Definition
// ═══════════════════════════════════════════════════════════════════

const SN_THEME_NAME = 'sn-dark';

function defineSnTheme(monaco: Monaco): void {
  monaco.editor.defineTheme(SN_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7A7784', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'B8A0D8' },     // violet
      { token: 'string', foreground: '5AA878' },       // moss
      { token: 'number', foreground: 'B0D0D8' },       // opal
      { token: 'type', foreground: '4E7B8E' },          // storm
      { token: 'function', foreground: 'E8806C' },      // ember
      { token: 'variable', foreground: 'E8E6ED' },      // text
      { token: 'tag', foreground: 'E8806C' },           // ember
      { token: 'attribute.name', foreground: 'B0D0D8' },// opal
      { token: 'attribute.value', foreground: '5AA878' },// moss
      { token: 'delimiter', foreground: '7A7784' },
      { token: 'operator', foreground: 'B8A0D8' },
    ],
    colors: {
      'editor.background': '#0A0A0E',
      'editor.foreground': '#E8E6ED',
      'editor.lineHighlightBackground': '#1A1A1F44',
      'editor.selectionBackground': '#4E7B8E33',
      'editor.inactiveSelectionBackground': '#4E7B8E1A',
      'editorCursor.foreground': '#E8806C',
      'editorLineNumber.foreground': '#4A4754',
      'editorLineNumber.activeForeground': '#7A7784',
      'editorIndentGuide.background': '#1A1A1F',
      'editorIndentGuide.activeBackground': '#4A4754',
      'editorBracketMatch.background': '#4E7B8E22',
      'editorBracketMatch.border': '#4E7B8E44',
      'editor.findMatchBackground': '#E8806C33',
      'editor.findMatchHighlightBackground': '#E8806C1A',
      'editorWidget.background': '#131317',
      'editorWidget.border': '#1A1A1F',
      'editorSuggestWidget.background': '#131317',
      'editorSuggestWidget.border': '#1A1A1F',
      'editorSuggestWidget.selectedBackground': '#4E7B8E22',
      'editorHoverWidget.background': '#131317',
      'editorHoverWidget.border': '#1A1A1F',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#4A475444',
      'scrollbarSlider.hoverBackground': '#4A475466',
      'scrollbarSlider.activeBackground': '#4A475488',
      'minimap.background': '#0A0A0E',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// SDK Completions
// ═══════════════════════════════════════════════════════════════════

interface SDKMethod {
  label: string;
  detail: string;
  documentation: string;
  insertText: string;
}

const SDK_METHODS: SDKMethod[] = [
  {
    label: 'emit',
    detail: '(type: string, payload: unknown) => void',
    documentation: 'Emit an event to the host bus via bridge.',
    insertText: "emit('${1:event.type}', ${2:payload})",
  },
  {
    label: 'subscribe',
    detail: '(type: string, handler: (payload) => void) => void',
    documentation: 'Subscribe to events from the host bus.',
    insertText: "subscribe('${1:event.type}', (payload) => {\n\t$0\n})",
  },
  {
    label: 'unsubscribe',
    detail: '(type: string, handler) => void',
    documentation: 'Unsubscribe from events.',
    insertText: "unsubscribe('${1:event.type}', ${2:handler})",
  },
  {
    label: 'setState',
    detail: '(key: string, value: unknown) => void',
    documentation: 'Save per-instance state (1MB limit).',
    insertText: "setState('${1:key}', ${2:value})",
  },
  {
    label: 'getState',
    detail: '(key: string) => Promise<unknown>',
    documentation: 'Retrieve per-instance state.',
    insertText: "getState('${1:key}')",
  },
  {
    label: 'setUserState',
    detail: '(key: string, value: unknown) => void',
    documentation: 'Save cross-canvas user state (10MB total per user).',
    insertText: "setUserState('${1:key}', ${2:value})",
  },
  {
    label: 'getUserState',
    detail: '(key: string) => Promise<unknown>',
    documentation: 'Retrieve cross-canvas user state.',
    insertText: "getUserState('${1:key}')",
  },
  {
    label: 'getConfig',
    detail: '() => Record<string, unknown>',
    documentation: 'Get user-configured values for this widget instance.',
    insertText: 'getConfig()',
  },
  {
    label: 'register',
    detail: '(manifest: object) => void',
    documentation: 'Register widget manifest. Must be called before ready().',
    insertText: "register({\n\tname: '${1:my-widget}',\n\tevents: {\n\t\temits: [${2}],\n\t\tsubscribes: [${3}],\n\t},\n})",
  },
  {
    label: 'ready',
    detail: '() => void',
    documentation: 'Signal initialization complete. Must be called within 500ms of load.',
    insertText: 'ready()',
  },
  {
    label: 'onThemeChange',
    detail: '(handler: (tokens) => void) => void',
    documentation: 'Receive theme token updates.',
    insertText: 'onThemeChange((tokens) => {\n\t$0\n})',
  },
  {
    label: 'onResize',
    detail: '(handler: (width, height) => void) => void',
    documentation: 'Receive viewport resize events.',
    insertText: 'onResize((width, height) => {\n\t$0\n})',
  },
  {
    label: 'integration',
    detail: '(name: string) => { query, mutate }',
    documentation: 'Proxied external data access. Returns { query(params), mutate(params) }.',
    insertText: "integration('${1:serviceName}')",
  },
  {
    label: 'emitCrossCanvas',
    detail: '(channel: string, payload: unknown) => void',
    documentation: 'Emit an event to other canvases via cross-canvas channels.',
    insertText: "emitCrossCanvas('${1:channel}', ${2:payload})",
  },
  {
    label: 'subscribeCrossCanvas',
    detail: '(channel: string, handler: (payload) => void) => void',
    documentation: 'Subscribe to cross-canvas events.',
    insertText: "subscribeCrossCanvas('${1:channel}', (payload) => {\n\t$0\n})",
  },
  {
    label: 'unsubscribeCrossCanvas',
    detail: '(channel: string) => void',
    documentation: 'Unsubscribe from a cross-canvas channel.',
    insertText: "unsubscribeCrossCanvas('${1:channel}')",
  },
];

function createSDKProvider(monaco: Monaco): Parameters<Monaco['languages']['registerCompletionItemProvider']>[1] {
  return {
    triggerCharacters: ['.'],
    provideCompletionItems(model: editor.ITextModel, position: { lineNumber: number; column: number }) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      if (!textUntilPosition.match(/StickerNest\.\s*$/)) {
        return { suggestions: [] };
      }

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: SDK_METHODS.map((m) => ({
          label: m.label,
          kind: monaco.languages.CompletionItemKind.Method,
          detail: m.detail,
          documentation: { value: m.documentation },
          insertText: m.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  };
}

function registerSDKCompletions(monaco: Monaco): void {
  const provider = createSDKProvider(monaco);
  monaco.languages.registerCompletionItemProvider('javascript', provider);
  monaco.languages.registerCompletionItemProvider('html', provider);
}

// ═══════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════

export interface UseMonacoResult {
  /** Call this from Monaco's onMount to get the editor instance */
  handleEditorMount: (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  /** Call this from Monaco's beforeMount to configure theme + completions */
  handleBeforeMount: (monaco: Monaco) => void;
  /** Get the current editor instance (may be null before mount) */
  getEditor: () => editor.IStandaloneCodeEditor | null;
}

export function useMonaco(): UseMonacoResult {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const configuredRef = useRef(false);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    if (configuredRef.current) return;
    configuredRef.current = true;
    defineSnTheme(monaco);
    registerSDKCompletions(monaco);
  }, []);

  const handleEditorMount = useCallback(
    (ed: editor.IStandaloneCodeEditor, _monaco: Monaco) => {
      editorRef.current = ed;

      // Editor options
      ed.updateOptions({
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: '"DM Mono", "Fira Code", "JetBrains Mono", monospace',
        fontLigatures: true,
        lineHeight: 22,
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'gutter',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: true },
        tabSize: 2,
        wordWrap: 'on',
        accessibilitySupport: 'on',
      });
    },
    [],
  );

  const getEditor = useCallback(() => editorRef.current, []);

  return { handleEditorMount, handleBeforeMount, getEditor };
}
