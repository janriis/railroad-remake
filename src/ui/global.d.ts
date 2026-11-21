/** The claude.ai page host may provide a hot-reload hook. */
interface ClaudeHot {
  data?: unknown;
  snapshot?: (fn: () => unknown) => void;
  ready?: (start: (data: unknown) => void) => void;
}
interface Window {
  claude?: { hot?: ClaudeHot };
}
