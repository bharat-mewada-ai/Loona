import mongoose from 'mongoose';

const uri = 'mongodb+srv://bharatmewada477_db_user:o596T7A1ejcQxNAR@cluster0.tu8f3qh.mongodb.net/loona';

async function clean() {
  await mongoose.connect(uri);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  // Reset the primary user's stats to 0
  const result = await User.updateMany(
    { email: 'bharatmewada477@gmail.com' },
    { 
      $set: { 
        karma: 0, 
        postCount: 0, 
        upvotesReceived: 0, 
        streak: 0, 
        badges: [],
        commentsCount: 0
      } 
    }
  );
  
  // Delete fake test users
  await User.deleteMany({ email: /fake|test/i });
  
  console.log(`DATABASE CLEANED: Reset ${result.modifiedCount} user profiles.`);
  process.exit(0);
}

clean().catch(err => {
  console.error(err);
  process.exit(1);
});
