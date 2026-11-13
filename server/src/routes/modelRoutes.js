import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  generateModel, getModel, saveModelConfig,
  listModelVersions, getModelVersion,
} from '../controllers/modelController.js';

const router = Router();
router.use(protect);
router.post('/:projectId/generate', generateModel);
router.post('/:projectId/save', saveModelConfig);
router.get('/:projectId/versions', listModelVersions);
router.get('/:projectId/versions/:version', getModelVersion);
router.get('/:projectId', getModel);
export default router;
