import {useEffect, useRef, useState} from 'react';

/** Remount trailer + brief cover after leaving fullscreen to hide orientation flash. */
export function usePreviewExitCover(isFullscreen: boolean) {
  const [showExitCover, setShowExitCover] = useState(false);
  const [headerMountKey, setHeaderMountKey] = useState(0);
  const wasFullscreenRef = useRef(isFullscreen);
  const exitCoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (wasFullscreenRef.current && !isFullscreen) {
      setShowExitCover(true);
      setHeaderMountKey(k => k + 1);
      if (exitCoverTimerRef.current) {
        clearTimeout(exitCoverTimerRef.current);
      }
      exitCoverTimerRef.current = setTimeout(() => {
        setShowExitCover(false);
        exitCoverTimerRef.current = null;
      }, 500);
    }
    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      if (exitCoverTimerRef.current) {
        clearTimeout(exitCoverTimerRef.current);
      }
    };
  }, []);

  return {showExitCover, headerMountKey};
}
