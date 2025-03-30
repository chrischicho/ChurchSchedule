import { addMonths, startOfMonth } from "date-fns";

/**
 * Returns the appropriate default month for display in the application.
 * If the current day is after the 15th of the month, it returns the next month.
 * Otherwise, it returns the current month.
 */
export function getDefaultMonth(): Date {
  const today = new Date();
  const dayOfMonth = today.getDate();
  
  if (dayOfMonth > 15) {
    // If we're past the 15th, return the start of next month
    return startOfMonth(addMonths(today, 1));
  } else {
    // Otherwise, return the start of the current month
    return startOfMonth(today);
  }
}