const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const prisma = require('../db');

// Ensure env variables are loaded if file is loaded directly
require('dotenv').config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('[PAYMENT] Initializing Razorpay route...');
console.log('[PAYMENT] RAZORPAY_KEY_ID is:', keyId ? `Present (${keyId})` : 'Undefined');

let razorpay = null;
if (!keyId || !keySecret) {
  console.error('[PAYMENT] Error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in backend/.env');
} else {
  try {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  } catch (err) {
    console.error('[PAYMENT] Failed to initialize Razorpay client:', err);
  }
}

// POST /api/payment/create-order - Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    console.log('[PAYMENT] Received request to create order:', { amount, orderId });

    if (amount === undefined || !orderId) {
      return res.status(400).json({ error: 'Amount and Order ID are required' });
    }

    if (!razorpay) {
      return res.status(500).json({
        error: 'Razorpay integration is not configured',
        details: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing or empty in backend/.env'
      });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_rcpt_${orderId}`
    };

    try {
      const rzpOrder = await razorpay.orders.create(options);
      console.log('[PAYMENT] Razorpay order created successfully:', rzpOrder.id);
      
      return res.json({
        success: true,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: keyId,
        order: rzpOrder
      });
    } catch (rzpError) {
      console.error('[PAYMENT] Razorpay API orders.create failed:', rzpError);
      return res.status(500).json({ 
        error: 'Failed to create payment order via Razorpay',
        details: rzpError.message || rzpError,
        help: 'Verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env are valid API keys from the Razorpay Dashboard.'
      });
    }
  } catch (error) {
    console.error('[PAYMENT] Create-order handler unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error occurred while creating payment order' });
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
