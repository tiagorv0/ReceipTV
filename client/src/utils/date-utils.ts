/** Converte string ISO "yyyy-MM-dd" → "dd/MM/yyyy" para exibição. */
export function formatISOToBR(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

export function formatDateToUTC_DDMMYYYY(date: Date): string {
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();

  const formattedDay = String(day).padStart(2, '0');
  const formattedMonth = String(month).padStart(2, '0');
  const formattedYear = String(year);

  return `${formattedDay}/${formattedMonth}/${formattedYear}`;
}
