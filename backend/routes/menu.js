const express = require('express');
const router = express.Router();
const prisma = require('../db');
const authenticateToken = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Public route: GET /api/menu/available - Get only available items
router.get('/available', async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: { is_available: true },
      orderBy: { created_at: 'desc' }
    });
    return res.json(menuItems);
  } catch (error) {
    console.error('Fetch available menu items error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Protect all other menu routes
router.use(authenticateToken);

// POST /api/menu/upload - Upload base64 image
router.post('/upload', async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name || !image) {
      return res.status(400).json({ error: 'Name and image base64 are required' });
    }

    // Extract base64 data and mime type
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine extension
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';

    // Generate unique file name
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedName}_${Date.now()}.${ext}`;
    
    // Create uploads folder inside backend if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write file
    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    // Return relative public path (served via static middleware)
    const fileUrl = `/uploads/${filename}`;
    return res.json({ url: fileUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/menu
router.get('/', async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      orderBy: { created_at: 'desc' }
    });
    return res.json(menuItems);
  } catch (error) {
    console.error('Fetch menu items error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/menu
router.post('/', async (req, res) => {
  try {
    const { name, category, price, is_available, image_url, unitType, sizes } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, category, and price are required' });
    }

    const priceFloat = parseFloat(price);
    if (isNaN(priceFloat) || priceFloat < 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        category,
        price: priceFloat,
        is_available: is_available !== undefined ? Boolean(is_available) : true,
        image_url: image_url || null,
        unitType: unitType || 'PIECE',
        sizes: sizes || ''
      }
    });

    return res.status(201).json(menuItem);
  } catch (error) {
    console.error('Create menu item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/menu/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, is_available, image_url, unitType, sizes } = req.body;

    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if item exists
    const existing = await prisma.menuItem.findUnique({
      where: { id: itemId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) {
      const priceFloat = parseFloat(price);
      if (isNaN(priceFloat) || priceFloat < 0) {
        return res.status(400).json({ error: 'Price must be a valid positive number' });
      }
      updateData.price = priceFloat;
    }
    if (is_available !== undefined) updateData.is_available = Boolean(is_available);
    if (image_url !== undefined) updateData.image_url = image_url;
    if (unitType !== undefined) updateData.unitType = unitType;
    if (sizes !== undefined) updateData.sizes = sizes;

    const updatedItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: updateData
    });

    return res.json(updatedItem);
  } catch (error) {
    console.error('Update menu item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if item exists
    const existing = await prisma.menuItem.findUnique({
      where: { id: itemId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await prisma.menuItem.delete({
      where: { id: itemId }
    });

    return res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
