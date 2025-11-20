import express from 'express';
import authMiniApp from '../middleware/authMiniApp';
import { upload, uploadPhoto } from '../controllers/uploadController';

const router = express.Router();

router.post('/photo', authMiniApp, upload.single('photo'), uploadPhoto);

export default router;
