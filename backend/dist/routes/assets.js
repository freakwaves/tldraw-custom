"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../public/assets/uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `asset-${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = config_1.config.tldraw.allowedAssetTypes;
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config_1.config.tldraw.maxAssetSize,
        files: 1
    }
});
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const file = req.file;
        const roomId = req.body.roomId;
        if (!roomId) {
            res.status(400).json({ error: 'Room ID is required' });
            return;
        }
        if (file.size > config_1.config.tldraw.maxAssetSize) {
            fs_1.default.unlinkSync(file.path);
            res.status(400).json({
                error: `File too large. Maximum size: ${config_1.config.tldraw.maxAssetSize / (1024 * 1024)}MB`
            });
            return;
        }
        const assetUrl = `${config_1.config.baseUrl}/assets/uploads/${file.filename}`;
        const asset = {
            id: file.filename,
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            url: assetUrl,
            roomId: roomId,
            uploadedAt: new Date().toISOString()
        };
        logger_1.logger.info('Asset uploaded successfully', {
            assetId: asset.id,
            roomId,
            size: file.size
        });
        res.json({
            success: true,
            asset: asset
        });
    }
    catch (error) {
        logger_1.logger.error('Error uploading asset:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({
            error: 'Failed to upload asset',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:assetId', async (req, res) => {
    try {
        const { assetId } = req.params;
        if (!assetId) {
            res.status(400).json({ error: 'Asset ID is required' });
            return;
        }
        const assetPath = path_1.default.join(__dirname, '../../public/assets/uploads', assetId);
        if (!fs_1.default.existsSync(assetPath)) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        const stats = fs_1.default.statSync(assetPath);
        const ext = path_1.default.extname(assetId);
        const mimeType = getMimeType(ext);
        const asset = {
            id: assetId,
            size: stats.size,
            type: mimeType,
            url: `${config_1.config.baseUrl}/assets/uploads/${assetId}`,
            uploadedAt: stats.birthtime.toISOString()
        };
        res.json({
            success: true,
            asset: asset
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting asset info:', error);
        res.status(500).json({ error: 'Failed to get asset info' });
    }
});
router.delete('/:assetId', async (req, res) => {
    try {
        const { assetId } = req.params;
        if (!assetId) {
            res.status(400).json({ error: 'Asset ID is required' });
            return;
        }
        const assetPath = path_1.default.join(__dirname, '../../public/assets/uploads', assetId);
        if (!fs_1.default.existsSync(assetPath)) {
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        fs_1.default.unlinkSync(assetPath);
        logger_1.logger.info('Asset deleted successfully', { assetId });
        res.json({
            success: true,
            message: 'Asset deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting asset:', error);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});
function getMimeType(ext) {
    const mimeTypes = {
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
exports.default = router;
//# sourceMappingURL=assets.js.map