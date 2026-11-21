/** The claude.ai page host may provide a hot-reload hook. */
interface ClaudeHot {
  data?: unknown;
  snapshot?: (fn: () => unknown) => void;
  ready?: (start: (data: unknown) => void) => void;
}
interface Window {
  claude?: { hot?: ClaudeHot };
}

interface Window {
  /** Read-only debug handle for automated smoke tests. */
  railroadsim?: {
    readonly game: import('../sim/game').Game;
    readonly tool: string;
    readonly paused: boolean;
    readonly speed: number;
    /** Converts a tile centre to client (CSS pixel) coordinates. */
    /** Moves the camera (tile coordinates) for tests. */
    setView(x: number, y: number, zoom: number): void;
    tileToClient(x: number, y: number): { x: number; y: number };
  };
}
