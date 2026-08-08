import type {VttCue} from '@/Utils/contentUtils';

/**
 * Build long-running test cues so selecting English (Test) mid-video still shows text.
 */
export function buildSampleEnglishCues(): VttCue[] {
  const lines = [
    'ReePlay subtitle test — line 1.',
    'If you can read this, overlay captions are working.',
    'Toggle Off from the Subtitle control to hide them.',
    'English (Test) track is active.',
  ];

  const cues: VttCue[] = [];
  // 5s cadence for 3 hours — enough for any VOD test.
  for (let i = 0; i < 2160; i++) {
    const start = i * 5;
    cues.push({
      start,
      end: start + 4.8,
      text: lines[i % lines.length],
    });
  }
  return cues;
}

/**
 * Bundled sample English captions for local subtitle testing.
 * Prefer buildSampleEnglishCues() for the player overlay.
 */
export const SAMPLE_ENGLISH_VTT = `WEBVTT

00:00:00.000 --> 00:00:04.800
ReePlay subtitle test — line 1.

00:00:05.000 --> 00:00:09.800
If you can read this, overlay captions are working.

00:00:10.000 --> 00:00:14.800
Toggle Off from the Subtitle control to hide them.

00:00:15.000 --> 00:00:19.800
English (Test) track is active.
`;
