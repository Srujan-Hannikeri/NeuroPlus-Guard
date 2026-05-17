const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB');
  const result = await User.updateMany({ role: 'Doctor' }, { verificationStatus: 'Verified' });
  console.log(`Verified ${result.modifiedCount} doctors.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
