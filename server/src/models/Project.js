import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectName: { type: String, required: true, trim: true },
  originalImage: { type: String, default: '' },
  furnitureCategory: { type: String, default: 'other' },
  furnitureType: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'analyzed', 'generated', 'exported'],
    default: 'draft',
  },
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
