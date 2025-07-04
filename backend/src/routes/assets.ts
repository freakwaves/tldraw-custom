import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create assets directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../../public/assets/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `asset-${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = config.tldraw.allowedAssetTypes;
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.tldraw.maxAssetSize, // 10MB
    files: 1
  }
});

// Upload asset endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const roomId = req.body.roomId;

    // Validate file size
    if (file.size > config.tldraw.maxAssetSize) {
      // Remove uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({ 
        error: `File too large. Maximum size: ${config.tldraw.maxAssetSize / (1024 * 1024)}MB` 
      });
    }

    // Generate public URL for the asset
    const assetUrl = `${config.server.baseUrl}/assets/uploads/${file.filename}`;
    
    // Create asset record
    const asset = {
      id: file.filename,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      url: assetUrl,
      roomId: roomId,
      uploadedAt: new Date().toISOString()
    };

    logger.info('Asset uploaded successfully', { 
      assetId: asset.id, 
      roomId, 
      size: file.size 
    });

    res.json({
      success: true,
      asset: asset
    });

  } catch (error) {
    logger.error('Error uploading asset:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to upload asset',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get asset info endpoint
router.get('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const assetPath = path.join(__dirname, '../../public/assets/uploads', assetId);
    
    if (!fs.existsSync(assetPath)) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const stats = fs.statSync(assetPath);
    const ext = path.extname(assetId);
    const mimeType = getMimeType(ext);
    
    const asset = {
      id: assetId,
      size: stats.size,
      type: mimeType,
      url: `${config.server.baseUrl}/assets/uploads/${assetId}`,
      uploadedAt: stats.birthtime.toISOString()
    };

    res.json({
      success: true,
      asset: asset
    });

  } catch (error) {
    logger.error('Error getting asset info:', error);
    res.status(500).json({ error: 'Failed to get asset info' });
  }
});

// Delete asset endpoint
router.delete('/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const assetPath = path.join(__dirname, '../../public/assets/uploads', assetId);
    
    if (!fs.existsSync(assetPath)) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Remove file
    fs.unlinkSync(assetPath);
    
    logger.info('Asset deleted successfully', { assetId });

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// Helper function to get MIME type from file extension
function getMimeType(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf'
  };
  
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

export default router; 