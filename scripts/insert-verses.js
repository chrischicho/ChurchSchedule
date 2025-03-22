// Insert Bible verses about serving
const { pool } = require('../server/db');

async function insertVerses() {
  try {
    console.log('Connecting to database...');

    // Bible verses about serving
    const servingVerses = [
      {
        text: "Each of you should use whatever gift you have received to serve others, as faithful stewards of God's grace in its various forms.",
        reference: "1 Peter 4:10",
        category: "serving"
      },
      {
        text: "For even the Son of Man did not come to be served, but to serve, and to give his life as a ransom for many.",
        reference: "Mark 10:45",
        category: "serving"
      },
      {
        text: "Therefore, my dear brothers and sisters, stand firm. Let nothing move you. Always give yourselves fully to the work of the Lord, because you know that your labor in the Lord is not in vain.",
        reference: "1 Corinthians 15:58",
        category: "serving"
      },
      {
        text: "Serve wholeheartedly, as if you were serving the Lord, not people.",
        reference: "Ephesians 6:7",
        category: "serving"
      },
      {
        text: "Now that I, your Lord and Teacher, have washed your feet, you also should wash one another's feet. I have set you an example that you should do as I have done for you.",
        reference: "John 13:14-15",
        category: "serving"
      },
      {
        text: "Whoever serves me must follow me; and where I am, my servant also will be. My Father will honor the one who serves me.",
        reference: "John 12:26",
        category: "serving"
      },
      {
        text: "You, my brothers and sisters, were called to be free. But do not use your freedom to indulge the flesh; rather, serve one another humbly in love.",
        reference: "Galatians 5:13",
        category: "serving"
      },
      {
        text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
        reference: "Galatians 6:9",
        category: "serving"
      },
      {
        text: "And do not forget to do good and to share with others, for with such sacrifices God is pleased.",
        reference: "Hebrews 13:16",
        category: "serving"
      },
      {
        text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
        reference: "Colossians 3:23",
        category: "serving"
      }
    ];

    // Check if verses table exists and has data
    const checkQuery = `SELECT COUNT(*) FROM verses`;
    const checkResult = await pool.query(checkQuery);
    const verseCount = parseInt(checkResult.rows[0].count);

    if (verseCount > 0) {
      console.log(`Found ${verseCount} verses already in the database. Skipping insertion.`);
      return;
    }

    // Insert the verses
    for (const verse of servingVerses) {
      const insertQuery = `
        INSERT INTO verses (text, reference, category)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `;
      await pool.query(insertQuery, [verse.text, verse.reference, verse.category]);
      console.log(`Inserted verse: ${verse.reference}`);
    }

    console.log('All verses have been inserted!');
  } catch (error) {
    console.error('Error inserting verses:', error);
  } finally {
    // Don't close the pool as it may be used elsewhere
  }
}

// Execute if run directly
if (require.main === module) {
  insertVerses().catch(console.error);
}

module.exports = { insertVerses };