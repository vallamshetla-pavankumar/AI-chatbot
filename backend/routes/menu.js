const express = require('express');
const router = express.Router();
const prisma = require('../db');
const authenticateToken = require('../middleware/auth');

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
    const { name, category, price, is_available, image_url } = req.body;

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
        image_url: image_url || null
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
    const { name, category, price, is_available, image_url } = req.body;

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
