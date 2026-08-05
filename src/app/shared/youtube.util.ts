/**
 * Extracts the 11-character video ID from any common YouTube URL shape:
 * watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID. Returns null for
 * anything else (non-YouTube links fall back to a plain "open" link
 * instead of a broken embed).
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * cc_load_policy=0 — captions off by default.
 * rel=0 — limits "related videos" (shown on pause/end) to the same
 *   channel rather than YouTube's algorithmic picks. Note: YouTube's 2018
 *   policy change means this no longer fully suppresses other channels'
 *   videos from that overlay — rel=0 is the closest available lever, not
 *   a hard guarantee.
 * modestbranding=1 — smaller YouTube logo in the player controls.
 */
export function buildYouTubeEmbedUrl(videoId: string, autoplay = false): string {
  const params = new URLSearchParams({
    cc_load_policy: '0',
    rel: '0',
    modestbranding: '1',
  });
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

/**
 * Loads YouTube's IFrame Player API script exactly once (shared across the
 * whole app), resolving once window.YT.Player is ready to use. Needed for
 * a custom control bar — the standard embed URL has no parameter to hide
 * only Share/Settings, so the only supported route is controls=0 (hide
 * everything native) plus building playback controls via this JS API.
 */
export function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}
