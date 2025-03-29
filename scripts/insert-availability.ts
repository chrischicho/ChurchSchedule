
import { db } from '../server/db';
import { availability } from '../shared/schema';

async function insertAvailability(userId: number, date: string, isAvailable: boolean) {
  try {
    await db.insert(availability).values({
      userId,
      serviceDate: new Date(date),
      isAvailable,
    });
    console.log(`Successfully added availability for user ${userId} on ${date}`);
  } catch (error) {
    console.error(`Failed to insert availability for user ${userId} on ${date}:`, error);
  }
}

// Example usage:
// To mark a member as available for a service:
// await insertAvailability(1, "2024-03-24", true);

// You can add multiple entries by listing them here:
async function addBulkAvailability() {
  // Add your availability data here in the format:
  // await insertAvailability(userId, "YYYY-MM-DD", isAvailable);
  
  // Example:
  // await insertAvailability(1, "2024-03-24", true);
  // await insertAvailability(2, "2024-03-24", false);
}

addBulkAvailability().then(() => {
  console.log("Finished adding availability");
  process.exit(0);
}).catch(error => {
  console.error("Error:", error);
  process.exit(1);
});
