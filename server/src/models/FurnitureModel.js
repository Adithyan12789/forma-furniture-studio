import mongoose from 'mongoose';

/**
 * AI analysis is stored separately from the editable furniture
 * configuration (development rule #8): users can keep editing the config
 * without ever re-running the analysis.
 */
const furnitureModelSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  analysis: { type: mongoose.Schema.Types.Mixed, default: null },
  config: { type: mongoose.Schema.Types.Mixed, default: null }, // set in Phase 5
  geometryConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  materialConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  dimensions: {
    width: { type: Number },
    height: { type: Number },
    depth: { type: Number },
  },
  exports: [{
    format: { type: String, enum: ['glb', 'gltf'] },
    url: String,
    createdAt: { type: Date, default: Date.now },
  }],
  version: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('FurnitureModel', furnitureModelSchema);
