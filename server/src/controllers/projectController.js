import Project from '../models/Project.js';
import FurnitureModel from '../models/FurnitureModel.js';
import { owns } from '../middleware/auth.js';
import { analyzeImage } from '../services/ai/analysisService.js';
import { furnitureAnalysisSchema } from '../validators/analysisValidators.js';
import { storeUploadedImage, readStoredImage, deleteLocalImage, mimeFromUrl } from '../services/storage/storageService.js';

async function findOwnedProject(req, res) {
  const project = await Project.findById(req.params.id);
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

async function latestModel(projectId) {
  return FurnitureModel.findOne({ projectId }).sort({ version: -1 });
}

export async function createProject(req, res, next) {
  try {
    const name = String(req.body?.projectName ?? '').trim();
    if (name.length < 2) {
      return res.status(400).json({ success: false, message: 'projectName must be at least 2 characters' });
    }
    const project = await Project.create({ userId: req.user._id, projectName: name });
    res.status(201).json({ success: true, project });
  } catch (err) { next(err); }
}

export async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    const enriched = await Promise.all(projects.map(async (p) => {
      const model = await latestModel(p._id);
      return {
        ...p,
        modelVersion: model?.version ?? 0,
        hasConfig: Boolean(model?.config),
        hasAnalysis: Boolean(model?.analysis),
      };
    }));
    res.json({ success: true, projects: enriched });
  } catch (err) { next(err); }
}

export async function getProject(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    const model = await latestModel(project._id);
    res.json({ success: true, project, model });
  } catch (err) { next(err); }
}

export async function deleteProject(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    if (project.originalImage) deleteLocalImage(project.originalImage);
    await FurnitureModel.deleteMany({ projectId: project._id });
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
}

export async function uploadProjectImage(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file received (field name: "image")' });
    }
    const stored = await storeUploadedImage(req.file);
    project.originalImage = stored.url;
    project.status = 'draft';
    await project.save();
    res.json({ success: true, project, imageUrl: project.originalImage, storage: stored.provider });
  } catch (err) { next(err); }
}

export async function analyzeProject(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    if (!project.originalImage) {
      return res.status(400).json({ success: false, message: 'Upload an image before running analysis' });
    }
    let buffer;
    try {
      buffer = await readStoredImage(project.originalImage);
    } catch {
      return res.status(404).json({ success: false, message: 'Stored image could not be read' });
    }
    const analysis = await analyzeImage(buffer, mimeFromUrl(project.originalImage));

    // Each analysis is a new model version (Phase 7 version history).
    const previous = await latestModel(project._id);
    const model = await FurnitureModel.create({
      projectId: project._id,
      analysis,
      dimensions: analysis.dimensions.value,
      version: (previous?.version ?? 0) + 1,
    });
    project.furnitureCategory = analysis.category.value;
    project.furnitureType = analysis.subcategory.value;
    project.status = 'analyzed';
    await project.save();

    res.json({ success: true, analysis, modelId: model._id, version: model.version, project });
  } catch (err) { next(err); }
}

/** Save the user's confirmed/corrected analysis onto the latest version. */
export async function saveAnalysis(req, res, next) {
  try {
    const project = await findOwnedProject(req, res);
    if (!project) return;
    const parsed = furnitureAnalysisSchema.safeParse(req.body?.analysis);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Analysis failed validation',
        errors: parsed.error.flatten(),
      });
    }
    let model = await latestModel(project._id);
    if (!model) {
      model = await FurnitureModel.create({
        projectId: project._id, version: 1,
        analysis: parsed.data, dimensions: parsed.data.dimensions.value,
      });
    } else {
      model.analysis = parsed.data;
      model.dimensions = parsed.data.dimensions.value;
      await model.save();
    }
    project.furnitureCategory = parsed.data.category.value;
    project.furnitureType = parsed.data.subcategory.value;
    await project.save();
    res.json({ success: true, analysis: parsed.data, modelId: model._id, version: model.version });
  } catch (err) { next(err); }
}
