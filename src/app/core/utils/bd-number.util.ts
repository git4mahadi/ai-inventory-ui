/**
 * Formats a number using the Bangladesh / South Asian numbering system:
 * last three digits grouped, then pairs (e.g. 12,34,567).
 * Fractional digits are included only when non-zero (no trailing .00).
 */
export function formatToBdNumberingSystem(
  number: number,
  maxFractionDigits = 2,
): string {
  if (!Number.isFinite(number)) {
    return '';
  }

  const negative = number < 0;
  const abs = Math.abs(number);
  const factor = 10 ** Math.max(0, maxFractionDigits);
  const rounded =
    maxFractionDigits > 0
      ? Math.round(abs * factor) / factor
      : Math.trunc(abs);
  const intPart = Math.trunc(rounded);
  const numStr = String(intPart);

  let formatted: string;
  if (numStr.length <= 3) {
    formatted = numStr;
  } else {
    const lastThree = numStr.substring(numStr.length - 3);
    let rest = numStr.substring(0, numStr.length - 3);
    for (let i = rest.length - 2; i > 0; i -= 2) {
      rest = `${rest.slice(0, i)},${rest.slice(i)}`;
    }
    formatted = `${rest},${lastThree}`;
  }

  if (maxFractionDigits > 0) {
    const fixed = rounded.toFixed(maxFractionDigits);
    const dotIndex = fixed.indexOf('.');
    if (dotIndex >= 0) {
      let fraction = fixed.slice(dotIndex);
      fraction = fraction.replace(/0+$/, '').replace(/\.$/, '');
      if (fraction.length > 1) {
        formatted += fraction;
      }
    }
  }

  return negative ? `-${formatted}` : formatted;
}
