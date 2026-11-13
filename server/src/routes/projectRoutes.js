import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import {
  createProject, listProjects, getProject, deleteProject,
  uploadProjectImage, analyzeProject, saveAnalysis,
} from '../controllers/projectController.js';

const router = Router();
router.use(protect);
router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);
router.post('/:id/upload', uploadImage, uploadProjectImage);
router.post('/:id/analyze', analyzeProject);
router.put('/:id/analysis', saveAnalysis);
export default router;
