import express from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Serve image files
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Basic security check
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    const filePath = path.join(imagesDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/png'; // default
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    
    // Send the file
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Get list of images for a document
router.get('/document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    const files = await fs.readdir(imagesDir);
    
    // Filter files that belong to this document
    const documentImages = files
      .filter(filename => filename.startsWith(`${documentId}_`))
      .map(filename => ({
        filename,
        url: `/api/images/${filename}`,
        documentId
      }));
    
    res.json(documentImages);
    
  } catch (error) {
    console.error('Error listing document images:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

export default router;