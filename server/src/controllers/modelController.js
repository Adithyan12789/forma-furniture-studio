import Project from '../models/Project.js';
import FurnitureModel from '../models/FurnitureModel.js';
import { owns } from '../middleware/auth.js';
import { analysisToConfig, furnitureConfigSchema } from '../services/generation/analysisToConfig.js';

async function findOwnedProject(req, res) {
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return null;
  }
  if (!owns(project.userId, req)) {
    res.status(403).json({ success: false, message: 'This project belongs to another user' });
    return null;
  }
  return project;
}

const latestModel = (projectId) => FurnitureModel.findOne({ projectId }).sort({ version: -1 });

/**
 * POST /api/models/:projectId/generate
 * Converts the latest confirmed analysis into a FurnitureConfig. If the
 * latest version already carries a config, the generated result becomes a
 * new version (history is preserved).
 */
export async function generateModel(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    const model = await latestModel(project._id);
    if (!model?.analysis) {
      return res.status(400).json({ success: false, message: 'Analyze and confirm an image before generating a model' });
    }
    const config = analysisToConfig(model.analysis);
    let target = model;
    if (model.config) {
      target = await FurnitureModel.create({
        projectId: project._id,
        analysis: model.analysis,
        config,
        dimensions: config.dimensions,
        version: model.version + 1,
      });
    } else {
      model.config = config;
      model.dimensions = config.dimensions;
      await model.save();
    }
    project.status = 'model-generated';
    await project.save();
    res.json({ success: true, config, modelId: target._id, version: target.version });
  } catch (err) { next(err); }
}

/**
 * POST /api/models/:projectId/save  { config }
 * Saves Studio edits as a new model version (validated first).
 */
export async function saveModelConfig(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    const parsed = furnitureConfigSchema.safeParse(req.body?.config);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Configuration failed validation',
        errors: parsed.error.flatten(),
      });
    }
    const previous = await latestModel(project._id);
    const model = await FurnitureModel.create({
      projectId: project._id,
      analysis: previous?.analysis ?? null,
      config: parsed.data,
      dimensions: parsed.data.dimensions,
      version: (previous?.version ?? 0) + 1,
    });
    project.status = 'model-generated';
    await project.save();
    res.json({ success: true, modelId: model._id, version: model.version });
  } catch (err) { next(err); }
}

export async function getModel(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    const model = await latestModel(project._id);
    if (!model) return res.status(404).json({ success: false, message: 'No model exists for this project yet' });
    res.json({ success: true, model });
  } catch (err) { next(err); }
}

/** Version history: newest first, summaries only. */
export async function listModelVersions(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    const models = await FurnitureModel.find({ projectId: project._id })
      .sort({ version: -1 })
      .select('version createdAt updatedAt config generator analysis.category')
      .lean();
    res.json({
      success: true,
      versions: models.map((m) => ({
        version: m.version,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        hasConfig: Boolean(m.config),
        generator: m.config?.generator ?? null,
        category: m.analysis?.category?.value ?? m.config?.category ?? null,
      })),
    });
  } catch (err) { next(err); }
}

export async function getModelVersion(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    const version = Number(req.params.version);
    const model = await FurnitureModel.findOne({ projectId: project._id, version });
    if (!model) return res.status(404).json({ success: false, message: 'Version not found' });
    res.json({ success: true, model });
  } catch (err) { next(err); }
}
