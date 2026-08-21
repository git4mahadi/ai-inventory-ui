/** Formats a datepicker value to API LocalDate string (YYYY-MM-DD). */
export function toApiDate(
  value: Date | string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return undefined;
    }
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 10) : undefined;
}

/** Parses an API LocalDate string into a Date for ngx-bootstrap datepicker. */
export function toDatePickerValue(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const datePart = value.length >= 10 ? value.slice(0, 10) : value;
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DISPLAY_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Formats an API LocalDate (YYYY-MM-DD) for UI display as DD-MMM-YY (e.g. 23-Aug-26). */
export function toDisplayDate(value?: string | null): string {
  const date = toDatePickerValue(value);
  if (!date) {
    return '';
  }
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = DISPLAY_MONTHS[date.getMonth()];
  const year = `${date.getFullYear()}`.slice(-2);
  return `${day}-${month}-${year}`;
}
