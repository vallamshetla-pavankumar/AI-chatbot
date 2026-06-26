const express = require('express');
const router = express.Router();
const prisma = require('../db');
const authenticateToken = require('../middleware/auth');
const { sendWhatsAppMessage } = require('../utils/whatsapp');

// GET /api/orders/:id - Public order tracking endpoint (MUST be above auth middleware)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            name: true,
            whatsapp_number: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const formattedOrder = {
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    };

    return res.json(formattedOrder);
  } catch (error) {
    console.error('Fetch track order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const authenticateCustomer = require('../middleware/customerAuth');

// GET /api/orders/customer/my-orders - Get logged-in customer's orders
router.get('/customer/my-orders', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;

    const orders = await prisma.order.findMany({
      where: { customer_id: customerId },
      include: {
        customer: {
          select: {
            name: true,
            whatsapp_number: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    const formattedOrders = orders.map(order => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    }));

    return res.json(formattedOrders);
  } catch (error) {
    console.error('Fetch customer orders error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Protect all administrative order routes
router.use(authenticateToken);

// GET /api/orders - get all orders with filtering
router.get('/', async (req, res) => {
  try {
    const { payment_status, order_status, date } = req.query;

    const where = {};

    if (payment_status) {
      where.payment_status = payment_status;
    }

    if (order_status) {
      where.order_status = order_status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.created_at = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            name: true,
            whatsapp_number: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    const formattedOrders = orders.map(order => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    }));

    return res.json(formattedOrders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/orders/:id/status - update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status } = req.body;

    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    if (!order_status) {
      return res.status(400).json({ error: 'Order status is required' });
    }

    const validStatuses = ['Received', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ error: `Invalid order status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { order_status },
      include: {
        customer: {
          select: {
            name: true,
            whatsapp_number: true
          }
        }
      }
    });

    // Trigger WhatsApp notification (stub)
    // TODO: Integrate WATI or Twilio WhatsApp API here for live messaging
    const message = `Hello ${order.customer.name}, your order #${order.id} status has been updated to "${order_status}". Thank you for choosing Akshaya Homely Foods!`;
    sendWhatsAppMessage(order.customer.whatsapp_number, message);

    const formattedOrder = {
      ...updatedOrder,
      items: typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items
    };

    return res.json(formattedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/summary/today - daily summary metrics
router.get('/summary/today', async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Fetch all orders for today
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      include: {
        customer: {
          select: {
            name: true,
            whatsapp_number: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.payment_status === 'Paid')
      .reduce((sum, o) => sum + o.total_amount, 0);
    const pendingOrders = orders.filter(o => o.order_status !== 'Delivered').length;
    const deliveredOrders = orders.filter(o => o.order_status === 'Delivered').length;

    // Group orders by hour (0 to 23)
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      orders: 0
    }));

    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourlyData[hour].orders += 1;
    });

    // Filter to active hours (8 AM to 10 PM) for clean display
    const filteredHourlyData = hourlyData.slice(8, 23);

    // Get recent 5 orders for today
    const recentOrders = orders.slice(0, 5);

    const formattedRecentOrders = recentOrders.map(order => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    }));

    return res.json({
      summary: {
        totalOrders,
        totalRevenue,
        pendingOrders,
        deliveredOrders
      },
      hourlyChart: filteredHourlyData,
      recentOrders: formattedRecentOrders
    });
  } catch (error) {
    console.error('Summary API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
