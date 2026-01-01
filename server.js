
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock Database for Orders
const orders = new Map();

// Helper to generate signature
const generateSignature = (orderId, amount, secret) => {
    return crypto.createHmac('sha256', secret)
        .update(`${orderId}|${amount}`)
        .digest('hex');
};

// 1. Create Order Endpoint
app.post('/api/create-order', (req, res) => {
    try {
        const { planId, amount, currency } = req.body;
        const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // In a real FamPay integration, you would call their API here to get a deep link
        // For this "Real Server" simulation, we generate a UPI intent string
        const upiString = `upi://pay?pa=vivamentor@fampay&pn=VivaMentor&am=${amount}&tr=${orderId}&tn=Upgrade to ${planId}`;
        
        const order = {
            id: orderId,
            planId,
            amount,
            currency,
            status: 'created',
            createdAt: new Date(),
            upiString
        };
        
        orders.set(orderId, order);
        
        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            upiString: order.upiString
        });
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 2. Verify Payment Endpoint (Simulated Webhook/Callback)
app.post('/api/verify-payment', (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        const order = orders.get(orderId);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Simulate verification logic
        order.status = 'paid';
        order.paymentId = paymentId || `pay_${Date.now()}`;
        orders.set(orderId, order);

        res.json({
            success: true,
            status: 'captured',
            planId: order.planId
        });
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ success: false, message: 'Verification Failed' });
    }
});

// 3. Check Status Endpoint (Polling)
app.get('/api/order-status/:orderId', (req, res) => {
    const order = orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ success: false });
    
    // For demo purposes, auto-complete payment after 5 seconds if status is created
    if (order.status === 'created') {
        const timeElapsed = Date.now() - new Date(order.createdAt).getTime();
        if (timeElapsed > 5000) { // Auto-succeed after 5s for demo
            order.status = 'paid';
            orders.set(order.id, order);
        }
    }

    res.json({
        success: true,
        status: order.status,
        planId: order.planId
    });
});

app.listen(PORT, () => {
    console.log(`VivaMentor Payment Server running on port ${PORT}`);
});
