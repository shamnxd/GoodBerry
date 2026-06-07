const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/Order');
const Wallet = require('../../models/Wallet');
const Variant = require('../../models/Variant');
const Cart = require('../../models/Cart');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const paymentController = {
  createRazorpayOrder: async (req, res) => {
    try {
      const order = await Order.findById(req.body.orderId);
      if (!order) {                                   
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      const options = {
        amount: Math.round(order.total * 100), 
        currency: "INR",
        receipt: order.orderId,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      res.json({
        orderId: razorpayOrder.id,
        currency: razorpayOrder.currency,
        amount: razorpayOrder.amount,
      });
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_CREATING_PAYMENT_ORDER, error: error.message });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const {
        orderCreationId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        orderData
      } = req.body;

      const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
      const digest = shasum.digest('hex');

      if (digest !== razorpaySignature) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.TRANSACTION_NOT_LEGITIMATE });
      }

      const order = await Order.findById(orderData._id);
      if (!order) {
        console.log('Order not found:', orderData._id);
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      order.razorpay = {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature
      };
      order.paymentStatus = 'paid';
      order.status = 'processing';

      for (const item of order.items) {
        item.status = 'processing';
        const variant = await Variant.findOne({ productId: item.productId, title: item.flavor });
        if (variant) {
          const packSize = variant.packSizes.find(pack => pack.size === item.packageSize);
          if (packSize) {
            packSize.quantity -= item.quantity;
            await variant.save();
          }
        }
      }

      await order.save();

      res.json({
        message: MESSAGES.PAYMENT_VERIFIED_SUCCESSFULLY,
        orderId: order.orderId
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_VERIFYING_PAYMENT, error: error.message });
    }
  },

  handlePaymentFailure: async (req, res) => {
    try {
      const { orderId } = req.body;
      const userId = req.user.id;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      order.paymentStatus = 'failed';
      order.status = 'failed';

      const cart = await Cart.findOne({ userId });
      cart.items = [];
      await cart.save();
      
      await order.save();

      res.json({ message: MESSAGES.PAYMENT_STATUS_UPDATED_TO_FAILED });
    } catch (error) {
      console.error('Error handling payment failure:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_HANDLING_PAYMENT_FAILURE, error: error.message });
    }
  },

};

module.exports = paymentController;