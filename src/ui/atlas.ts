import atlasUrl from './assets/atlas.png?inline';
import atlasJson from './assets/atlas.json';

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const frames = atlasJson.frames as Record<string, Frame>;
let image: HTMLImageElement | null = null;

/** The decoded atlas image, or null until it has loaded (callers fall back to procedural drawing). */
export function atlasImage(): HTMLImageElement | null {
  return image;
}

export function frame(name: string): Frame | undefined {
  return frames[name];
}

/** Loads the inlined atlas once; resolves true when it is ready to draw from. */
export async function loadAtlas(): Promise<boolean> {
  if (image) return true;
  const img = new Image();
  img.src = atlasUrl;
  try {
    await img.decode();
  } catch {
    return false;
  }
  image = img;
  return true;
}
