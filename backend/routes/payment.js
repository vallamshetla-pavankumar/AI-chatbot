const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const prisma = require('../db');

// Instantiate Razorpay client using environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// POST /api/payment/create-order - Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ error: 'Amount and Order ID are required' });
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `order_rcpt_${orderId}`
    };

    const rzpOrder = await razorpay.orders.create(options);

    return res.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// PATCH /api/payment/order/:id/status - Update order payment status
router.patch('/order/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body; // "Paid" or "Failed"

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid Order ID format' });
    }

    if (!payment_status) {
      return res.status(400).json({ error: 'payment_status is required' });
    }

    const validStatuses = ['Pending', 'Paid', 'Failed'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ error: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { payment_status }
    });

    return res.json({
      message: `Payment status successfully updated to ${payment_status}`,
      orderId: updatedOrder.id,
      payment_status: updatedOrder.payment_status
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
