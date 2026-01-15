export async function FetchElectricityPricesService(timePeriod: string) {
  const today = new Date();
  let startDate;
  let endDate;

  switch (timePeriod) {
    case "15min":
    case "1hour":
      startDate = formatDate(new Date()); // Today
      endDate = formatDate(new Date(today.setDate(today.getDate() + 1))); // tomorrow
      break;
    case "today":
      startDate = formatDate(new Date()); // Today
      endDate = formatDate(new Date(today.setDate(today.getDate() + 1))); // tomorrow
      break;
    case "week":
      startDate = formatDate(new Date(today.setDate(today.getDate() - 7))); // last 7 days
      endDate = formatDate(new Date()); // today
      break;
    case "month":
      startDate = formatDate(
        new Date(today.getFullYear(), today.getMonth() - 12, 1)
      ); // First day 12 months ago
      endDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 0)); // Last day of last month
      break;
    default:
      startDate = formatDate(new Date()); // Today
      endDate = formatDate(new Date(today.setDate(today.getDate() + 1))); // tomorrow
      break;
  }

  const query = new URLSearchParams({
    startDate: startDate,
    endDate: endDate,
  });

  const response = await fetch(
    `${import.meta.env.VITE_BASE_URL}${import.meta.env.VITE_PRICES}?${query}`
  );

  if (response.ok) {
    const data = await response.json();
    return data;
  } else {
    throw new Error("Fetching didn't work.");
  }
}

const formatDate = (date: Date) => {
  let mm = String(date.getMonth() + 1); // Months are 0-based
  let dd = String(date.getDate());
  let yy = String(date.getFullYear()).slice(-2); // Get last two digits of year
  return `${mm}.${dd}.${yy}`;
};
