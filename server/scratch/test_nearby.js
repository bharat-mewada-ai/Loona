
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/user.model.js';

dotenv.config();

async function testNearby() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Get a sample user
    const me = await User.findOne({ campus: 'ogi' });
    if (!me) {
      console.log('No user found in OGI');
      return;
    }

    console.log(`Testing nearby for user: ${me.name} at [${me.location?.coordinates || 'no location'}]`);

    // 2. Simulate location update if missing
    if (!me.location?.coordinates) {
       console.log('Updating user location to simulate nearby...');
       me.location = { type: 'Point', coordinates: [77.4126, 23.2599] }; // Bhopal
       await me.save();
    }

    // 3. Search nearby
    const radiusInKm = 5;
    const nearby = await User.find({
      _id: { $ne: me._id },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: me.location.coordinates },
          $maxDistance: radiusInKm * 1000,
        },
      },
      isPrivate: false,
    })
    .select("name avatar campus location isVerified")
    .limit(10)
    .lean();

    console.log(`Found ${nearby.length} nearby users within ${radiusInKm}km:`);
    nearby.forEach(u => console.log(`- ${u.name} (${u.campus})`));

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await mongoose.connection.close();
  }
}

testNearby();
