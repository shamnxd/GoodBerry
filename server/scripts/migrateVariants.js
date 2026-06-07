const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the server/.env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI environment variable is not defined.');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connected successfully.');

    const db = mongoose.connection.db;
    const variantsCollection = db.collection('variants');

    const variants = await variantsCollection.find({}).toArray();
    console.log(`Found ${variants.length} variant documents to inspect.`);

    let updatedCount = 0;
    for (const variant of variants) {
      const updates = {};

      // If packSizes is undefined or empty, but packSizePricing is defined and has elements
      if (
        (!variant.packSizes || variant.packSizes.length === 0) &&
        variant.packSizePricing &&
        variant.packSizePricing.length > 0
      ) {
        updates.packSizes = variant.packSizePricing;
        console.log(`Migrating packSizePricing to packSizes for variant ID: ${variant._id} (${variant.title || 'No Title'})`);
      }

      if (Object.keys(updates).length > 0) {
        await variantsCollection.updateOne(
          { _id: variant._id },
          { $set: updates }
        );
        updatedCount++;
      }
    }

    console.log(`Successfully migrated ${updatedCount} variant documents.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
