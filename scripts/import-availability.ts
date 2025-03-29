
import { db } from '../server/db';
import { availability } from '../shared/schema';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

async function importAvailability(filePath: string) {
  const parser = parse({
    columns: true,
    skip_empty_lines: true
  });

  const records: any[] = [];

  createReadStream(filePath)
    .pipe(parser)
    .on('data', (row) => {
      records.push({
        userId: parseInt(row['Member ID']),
        serviceDate: new Date(row['Date']),
        isAvailable: row['Available'].toLowerCase() === 'true'
      });
    })
    .on('end', async () => {
      try {
        for (const record of records) {
          await db.insert(availability).values(record);
          console.log(`Added availability for user ${record.userId} on ${record.serviceDate}`);
        }
        console.log('Import completed successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
      }
    });
}

// Check if file path is provided
const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide the CSV file path');
  process.exit(1);
}

importAvailability(filePath);
