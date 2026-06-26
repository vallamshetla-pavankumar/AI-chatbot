const express = require('express');
const router = express.Router();
const prisma = require('../db');

// GET /api/chat/menu - Fetch available menu items
router.get('/menu', async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: { is_available: true },
      orderBy: { category: 'asc' }
    });
    return res.json(menuItems);
  } catch (error) {
    console.error('Fetch chat menu items error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat/order - Create an order from chat
router.post('/order', async (req, res) => {
  try {
    const { whatsapp_number, name, address, items, total_amount } = req.body;

    if (!whatsapp_number || !items || !total_amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upsert customer (create if not exists, otherwise update address/name if needed or just use existing)
    const customerName = name || 'WhatsApp User';
    const customerAddress = address || 'No address provided';

    // Find customer by whatsapp number
    let customer = await prisma.customer.findUnique({
      where: { whatsapp_number }
    });

    if (!customer) {
      const placeholderEmail = `guest_${whatsapp_number}@akshayahomelyfoods.com`;
      customer = await prisma.customer.create({
        data: {
          whatsapp_number,
          name: customerName,
          email: placeholderEmail,
          password_hash: 'guest_account_no_password',
          address: customerAddress
        }
      });
    } else {
      // Update address and name
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          address: customerAddress
        }
      });
    }

    // Create the order
    const newOrder = await prisma.order.create({
      data: {
        customer_id: customer.id,
        items: JSON.stringify(items),
        total_amount: parseFloat(total_amount),
        payment_status: 'Pending', // Default
        order_status: 'Received',  // Default
        delivery_address: customerAddress
      }
    });

    return res.status(201).json({
      message: 'Order created successfully',
      orderId: newOrder.id
    });
  } catch (error) {
    console.error('Create chat order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
