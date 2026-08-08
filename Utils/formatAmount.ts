export type FormatAmountOptions = {
  /** ISO 4217 currency code — drives fraction digit count (USD/NGN=2, JPY=0, …). */
  currency?: string | null;
  /** Override fraction digits from currency. */
  fractionDigits?: number;
  /**
   * Pad with trailing zeros to fractionDigits (0.5 → 0.50).
   * Defaults to true when a currency is provided, otherwise false.
   */
  padFraction?: boolean;
};

/**
 * ISO currency minor-unit digits via Intl (falls back to 2).
 */
export function getCurrencyFractionDigits(currency?: string | null): number {
  if (!currency) {
    return 2;
  }
  try {
    const digits = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).resolvedOptions().maximumFractionDigits;
    return typeof digits === 'number' ? digits : 2;
  } catch {
    return 2;
  }
}

/**
 * Parse a display/input amount into a number.
 * Accepts "1,234.56", "0.5", 0.5, etc.
 */
export function parseAmount(
  amount: string | number | null | undefined,
): number {
  if (amount == null || amount === '') {
    return NaN;
  }
  if (typeof amount === 'number') {
    return amount;
  }
  const normalized = String(amount)
    .trim()
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return NaN;
  }
  return Number(normalized);
}

function resolveArgs(
  currencyOrOptions?: string | null | FormatAmountOptions,
): FormatAmountOptions {
  if (
    currencyOrOptions == null ||
    typeof currencyOrOptions === 'string'
  ) {
    return {currency: currencyOrOptions};
  }
  return currencyOrOptions;
}

/**
 * Format a monetary amount for display.
 * Preserves decimals and applies thousand separators.
 * When `currency` is provided, fraction digits follow that currency.
 *
 * @example formatAmount(0.5, 'USD') → "0.50"
 * @example formatAmount('1234.5', 'NGN') → "1,234.50"
 * @example formatAmount(1500) → "1,500"
 */
export function formatAmount(
  amount: string | number | null | undefined,
  currencyOrOptions?: string | null | FormatAmountOptions,
): string {
  if (amount == null || amount === '') {
    return '';
  }

  const options = resolveArgs(currencyOrOptions);
  const currency = options.currency;
  const fractionDigits =
    options.fractionDigits ?? getCurrencyFractionDigits(currency);
  const padFraction =
    options.padFraction ?? (currency != null && currency !== '');

  const raw = String(amount).trim();
  // Allow in-progress typed values like "0." or "."
  if (/^-?\d*\.$/.test(raw.replace(/,/g, ''))) {
    const intPart = raw.replace(/,/g, '').replace(/\.$/, '') || '0';
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${grouped}.`;
  }

  const value = parseAmount(amount);
  if (!Number.isFinite(value)) {
    return '';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      useGrouping: true,
      minimumFractionDigits: padFraction ? fractionDigits : 0,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return fallbackFormat(value, fractionDigits, padFraction);
  }
}

/**
 * Sanitize free-text money input while keeping a single decimal separator.
 * Use for TextInput onChange — does not add grouping commas.
 */
export function sanitizeAmountInput(
  value: string,
  currency?: string | null,
): string {
  const maxFraction = getCurrencyFractionDigits(currency);
  let next = value.replace(/,/g, '').replace(/[^\d.]/g, '');

  const firstDot = next.indexOf('.');
  if (firstDot !== -1) {
    next =
      next.slice(0, firstDot + 1) +
      next.slice(firstDot + 1).replace(/\./g, '');
    const [whole, fraction = ''] = next.split('.');
    next = `${whole}.${fraction.slice(0, maxFraction)}`;
  }

  // Avoid leading zeros like "05" unless it's "0.…"
  if (/^0\d/.test(next)) {
    next = next.replace(/^0+/, '') || '0';
  }

  return next;
}

function fallbackFormat(
  value: number,
  fractionDigits: number,
  padFraction: boolean,
): string {
  const fixed = padFraction
    ? value.toFixed(fractionDigits)
    : String(
        Number(
          value.toFixed(
            // trim trailing zeros when not padding
            Math.min(
              fractionDigits,
              (String(value).split('.')[1] || '').length,
            ),
          ),
        ),
      );
  const [intPart, fracPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fracPart != null && fracPart.length > 0
    ? `${grouped}.${fracPart}`
    : grouped;
}

export function formatLikesNumber(variable: number): string {
  if (variable >= 1_000_000_000) {
    if (variable % 1_000_000_000 === 0) {
      return `${variable / 1_000_000_000}B+`;
    }
    return `${(variable / 1_000_000_000).toFixed(1)}B+`;
  }
  if (variable >= 1_000_000) {
    if (variable % 1_000_000 === 0) {
      return `${variable / 1_000_000}M+`;
    }
    return `${(variable / 1_000_000).toFixed(1)}M+`;
  }
  if (variable >= 1_000) {
    if (variable % 1_000 === 0) {
      return `${variable / 1_000}K+`;
    }
    return `${(variable / 1_000).toFixed(1)}K+`;
  }

  return variable.toString();
}
