
import { db } from '../server/db';
import { availability } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function cleanDuplicateAvailability() {
  try {
    console.log("Starting cleanup of duplicate availability records...");

    // Get all availability records ordered by date and user
    const records = await db.select().from(availability).orderBy(
      availability.serviceDate,
      availability.userId
    );

    const seen = new Set<string>();
    const duplicates = [];

    // Find duplicates
    for (const record of records) {
      const key = `${record.userId}-${record.serviceDate.toISOString().split('T')[0]}`;
      if (seen.has(key)) {
        duplicates.push(record.id);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length === 0) {
      console.log("No duplicate records found.");
      return;
    }

    // Delete duplicate records
    const result = await db
      .delete(availability)
      .where(sql`id = ANY(${duplicates})`);

    console.log(`Cleaned up ${duplicates.length} duplicate records`);

  } catch (error) {
    console.error("Error cleaning duplicate availability:", error);
  } finally {
    process.exit(0);
  }
}

cleanDuplicateAvailability();
