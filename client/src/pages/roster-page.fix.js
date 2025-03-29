#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'roster-page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Fix date format and remove line break
const updatedContent = content
  // Update date formats throughout the file to match Australian format
  .replace(/format\(.*?, "MMMM d, yyyy"\)/g, match => {
    return match.replace('"MMMM d, yyyy"', '"d MMMM yyyy"');
  })
  // Fix the alert description text (joining the lines and maintaining indentation)
  .replace(
    /This roster was finalized on {format\(.*?\)} \n            and is ready for service\./g,
    match => match.replace(" \n            and", " and")
  );

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('File updated successfully');