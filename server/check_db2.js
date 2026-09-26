const mongoose = require('mongoose');
require('dotenv').config();
const schema = new mongoose.Schema({ driverid: String, driverStatus: String, eyeStatus: String, time: Date });
const DriverEvent = mongoose.model('DriverEvent', schema);
mongoose.connect(process.env.DB_URL).then(async () => {
  const total = await DriverEvent.countDocuments();
  const byStatus = await DriverEvent.aggregate([{ $group: { _id: '$driverStatus', count: { $sum: 1 } } }]);
  console.log('Total DriverEvent documents in MongoDB: ' + total);
  byStatus.forEach(s => console.log('  ' + s._id + ': ' + s.count + ' events'));
  const recent = await DriverEvent.find().sort({ time: -1 }).limit(3).lean();
  console.log('Most recent 3:');
  recent.forEach(d => console.log('  ' + d.driverStatus + ' / eye:' + d.eyeStatus + ' @ ' + d.time));
  mongoose.disconnect();
});
