import { IVODRatings } from "@/types/api/content.types";
import {BASE_URL} from '@env';

export function generateGradientColors(hexColor: string): string[] {
  const fallback = '#333333';
  const raw = (hexColor || fallback).trim();
  let hex = raw.replace(/^#/, '');

  // Expand #RGB → #RRGGBB
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(ch => ch + ch)
      .join('');
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    hex = fallback.replace(/^#/, '');
  }

  // HEX → RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // RGB → HSL
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
        case g: h = ((b - r) / d + 2); break;
        case b: h = ((r - g) / d + 4); break;
      }
      h /= 6;
    }

    return { h, s, l };
  };

  // HSL → RGB
  const hslToRgb = (h: number, s: number, l: number) => {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  const rgbToHex = ({ r, g, b }: { r: number, g: number, b: number }) =>
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  const baseHSL = rgbToHsl(r, g, b);

  // Brighten
  const color1 = hslToRgb(baseHSL.h, Math.min(1, baseHSL.s * 1.4), Math.min(1, baseHSL.l + 0.25)); // strong bright
  const color2 = hslToRgb(baseHSL.h, baseHSL.s, Math.min(1, baseHSL.l + 0.1));                     // slight bright

  // Transparent black variants
  const lightBlack = '#00000030';   // ~18% opacity
  const mediumBlack = '#00000080';  // ~50% opacity

  return [
    rgbToHex(color1),
    rgbToHex(color2),
    `#${hex}`,
    lightBlack,
    mediumBlack
  ];
}





export const subtractYears = (date: Date, years: number): Date => {
  date.setFullYear(date.getFullYear() - years);
  return date;
};

export function getWatchTag(type?: string | null, live?: boolean): string {
  const normalized = (type ?? '').toLowerCase();
  if (live && normalized === 'exclusive') {
    return 'live-watch-exclusive';
  }

  if (!live && normalized === 'exclusive') {
    return 'video-watch-exclusive';
  }

  if (!live && normalized === 'premium') {
    return 'video-watch-premium';
  }

  return '';
}

export function formatRatingStats(data: IVODRatings|null): Record<string, number> {
  const result: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    total: 0,
  };

  // Set total
  if(data !== null){
    if (data.totalStats.length > 0) {
      result.total = data.totalStats[0].totalRatingsDocuments;
    }
  
    // Fill rates 1 to 5
    for (const stat of data.groupStats) {
      const rateKey = String(stat.rate);
      if (["1", "2", "3", "4", "5"].includes(rateKey)) {
        result[rateKey] = stat.count;
      }
    }
  }

  return result;
}


/**
 * @deprecated Prefer FastImage with cacheControl.immutable.
 * Kept for any legacy callers; no longer used by home posters.
 */
export async function getCachedImage(
  url: string,
  _id: string,
): Promise<string> {
  return url;
}


export function srtToVtt(srt: string): string {
  let vtt = srt
    // Normalize line endings
    .replace(/\r+/g, '')
    .replace(/^\uFEFF/, '') // remove BOM

    // Remove subtitle index numbers
    .replace(/^\d+\n/gm, '')

    // Convert timestamps (comma → dot) — HH:MM:SS,mmm or MM:SS,mmm
    .replace(
      /(\d{1,2}:\d{2}:\d{2}),(\d{3})/g,
      '$1.$2',
    )
    .replace(/(\d{1,2}:\d{2}),(\d{3})/g, '$1.$2')

    // Remove HTML tags (<b>, <i>, etc.)
    .replace(/<\/?[^>]+>/g, '')

    // Trim extra blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return `WEBVTT\n\n${vtt}`;
}

/** Normalize arbitrary caption text to WEBVTT (SRT, VTT body, or full VTT). */
export function ensureWebVtt(text: string): string {
  const cleaned = (text || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return 'WEBVTT\n\n';
  }
  if (/^WEBVTT/i.test(cleaned)) {
    return cleaned;
  }
  // VTT-style timestamps already use dots
  if (/\d{1,2}:\d{2}(?::\d{2})?\.\d{3}\s*-->/.test(cleaned)) {
    return `WEBVTT\n\n${cleaned}`;
  }
  return srtToVtt(cleaned);
}

/**
 * Resolve subtitle download URLs from mixed API shapes:
 * absolute http(s), protocol-relative, s3://, bare host/path, or bucket+key.
 */
export function normalizeSubtitleUrl(
  src?: string | null,
  bucket?: string | null,
  key?: string | null,
): string {
  const mediaOrigin = (BASE_URL || 'https://api.reeplay.app/api/v1')
    .replace(/\/api\/v\d+\/?$/i, '')
    .replace(/\/$/, '');
  const brandedSubtitleUrl = (objectKey: string) =>
    `${mediaOrigin}/media/subtitles/${encodeURIComponent(objectKey.replace(/^\/+/, ''))}`;
  let raw = String(src ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\/g, '/');

  const hasScheme = /^https?:\/\//i.test(raw) || /^s3:\/\//i.test(raw);
  const isProtocolRelative = raw.startsWith('//');

  if ((!raw || (!hasScheme && !isProtocolRelative)) && bucket) {
    const objectKey = String(key || raw || '')
      .trim()
      .replace(/^\/+/, '');
    if (objectKey) {
      raw = brandedSubtitleUrl(objectKey);
    }
  }

  if (!raw) {
    throw new Error('Missing subtitle URL');
  }

  if (raw.startsWith('//')) {
    raw = `https:${raw}`;
  }

  const s3Match = raw.match(/^s3:\/\/([^/]+)\/(.+)$/i);
  if (s3Match) {
    raw = brandedSubtitleUrl(s3Match[2]);
  }

  const awsUrl = raw.match(/^https?:\/\/[^/]+\.s3(?:[.-][^/]+)?\.amazonaws\.com\/(.+)$/i)
    ?? raw.match(/^https?:\/\/s3(?:[.-][^/]+)?\.amazonaws\.com\/[^/]+\/(.+)$/i);
  if (awsUrl) {
    raw = brandedSubtitleUrl(decodeURIComponent(awsUrl[1]));
  }

  if (!/^https?:\/\//i.test(raw)) {
    if (raw.startsWith('/')) {
      const origin =
        (BASE_URL || 'https://api.reeplay.app/api/v1')
        .replace(/\/api\/v\d+\/?$/i, '')
        .replace(/\/$/, '');
      raw = `${origin}${raw}`;
    } else {
      raw = `https://${raw}`;
    }
  }

  // Encode spaces / unsafe chars but keep query string delimiters intact.
  try {
    const parsed = new URL(raw);
    parsed.pathname = parsed.pathname
      .split('/')
      .map(seg => {
        try {
          return encodeURIComponent(decodeURIComponent(seg || ''));
        } catch {
          return encodeURIComponent(seg || '');
        }
      })
      .join('/');
    return parsed.toString();
  } catch {
    return raw.replace(/ /g, '%20');
  }
}

export type VttCue = {
  start: number;
  end: number;
  text: string;
};

/** Parse `HH:MM:SS.mmm` or `MM:SS.mmm` into seconds. */
export function parseVttTimestamp(raw: string): number {
  const cleaned = raw.trim().split(/\s+/)[0]?.replace(',', '.') ?? '';
  const parts = cleaned.split(':').map(Number);
  if (parts.some(n => Number.isNaN(n))) {
    return 0;
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/** Minimal WEBVTT cue parser for overlay captions. */
export function parseVttCues(vtt: string): VttCue[] {
  const normalized = vtt.replace(/^\uFEFF/, '').replace(/\r+/g, '').trim();
  if (!normalized) {
    return [];
  }

  const body = normalized.replace(/^WEBVTT[^\n]*\n?/i, '').trim();
  const lines = body.split('\n');
  const cues: VttCue[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes('-->')) continue;
    const [startRaw, endRaw] = lines[index].split('-->');
    if (!startRaw || !endRaw) {
      continue;
    }

    const start = parseVttTimestamp(startRaw);
    const end = parseVttTimestamp(endRaw);
    const textLines: string[] = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.includes('-->')) {
        index -= 1;
        break;
      }
      if (/^\d+$/.test(line.trim()) && lines[index + 1]?.includes('-->')) {
        index -= 1;
        break;
      }
      if (!line.trim()) break;
      textLines.push(line.trim());
    }
    const text = textLines
      .join('\n')
      .replace(/<\/?[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .trim();

    if (text && end > start) {
      cues.push({start, end, text});
    }
  }

  return cues;
}

export function cueTextAtTime(cues: VttCue[] | undefined, time: number): string {
  if (!cues?.length || !(time >= 0)) {
    return '';
  }
  const cue = cues.find(c => time >= c.start && time < c.end);
  return cue?.text ?? '';
}
