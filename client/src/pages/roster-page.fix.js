#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'roster-page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Replace the broken string in both locations
const fixedContent = content
  // Fix line 408-410
  .replace(
    /This roster was finalized on {format\([^}]+\), "d MMMM yyyy"\)} \nand is ready for service\./g,
    'This roster was finalized on {format(new Date(finalizedRosterData.finalizedRoster.finalizedAt || finalizedRosterData.finalizedRoster.createdAt), "d MMMM yyyy")} and is ready for service.'
  );

fs.writeFileSync(filePath, fixedContent, 'utf8');
console.log('Fixed spacing issues in the roster page');