function formatDateToUTC_DDMMYYYY(date) {
  // Get UTC components
  const day = date.getUTCDate();
  // Month is 0-indexed, so add 1
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();

  // Pad with leading zeros if necessary
  const formattedDay = String(day).padStart(2, '0');
  const formattedMonth = String(month).padStart(2, '0');
  const formattedYear = String(year);

  // Assemble the string in dd/mm/yyyy format
  return `${formattedDay}/${formattedMonth}/${formattedYear}`;
}