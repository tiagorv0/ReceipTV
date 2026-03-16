export function formatDateToUTC_DDMMYYYY(date) {
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();

  const formattedDay = String(day).padStart(2, '0');
  const formattedMonth = String(month).padStart(2, '0');
  const formattedYear = String(year);

  return `${formattedDay}/${formattedMonth}/${formattedYear}`;
}