import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  stack: { type: String },
  component: { type: String }, // e.g., 'ErrorBoundary', 'GlobalHandler'
  platform: { type: String, enum: ['mobile', 'web', 'server'], required: true },
  version: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: Object }, // e.g., device info, URL, method
  createdAt: { type: Date, default: Date.now, expires: '30d' } // Auto-delete logs after 30 days
});

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);
export default ErrorLog;
