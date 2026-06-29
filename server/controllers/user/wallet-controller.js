const Wallet = require('../../models/Wallet');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


const walletController = {
  getWallet: async (req, res) => {
    try {
      let wallet = await Wallet.findOne({ userId: req.user.id });
      if (!wallet) {
        wallet = new Wallet({ userId: req.user.id, balance: 0, transactions: [] });
        await wallet.save();
      }
      res.json(wallet);
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_FETCHING_WALLET, error: error.message });
    }
  },



  getTransactions: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      let wallet = await Wallet.findOne({ userId: req.user.id });
      if (!wallet) {
        wallet = new Wallet({ userId: req.user.id, balance: 0, transactions: [] });
        await wallet.save();
      }

      const reversedTransactions = [...wallet.transactions].reverse();
      const transactions = reversedTransactions.slice((page - 1) * limit, page * limit);
      const totalTransactions = wallet.transactions.length;

      res.json({
        transactions,
        totalPages: Math.ceil(totalTransactions / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_FETCHING_TRANSACTIONS, error: error.message });
    }
  },
  handleWalletPayment: async (req, res) => {
      try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId).populate('userId');
        if (!order) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
        }
  
        const wallet = await Wallet.findOne({ userId: order.userId._id });
        if (!wallet || wallet.balance < order.total) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.INSUFFICIENT_WALLET_BALANCE });
        }
  
        wallet.balance -= order.total;
        wallet.transactions.push({
          type: 'debit',
          amount: order.total,
          description: `Payment for order ${order.orderId}`
        });
        await wallet.save();
  
        order.paymentStatus = 'paid';
        order.status = 'processing';
        await order.save();
        
        const cart = await Cart.findOne({ userId: order.userId._id });
        cart.items = [];
        await cart.save();
  
        res.json({ message: MESSAGES.PAYMENT_SUCCESSFUL, orderId: order.orderId });
      } catch (error) {
        console.error('Error handling wallet payment:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_HANDLING_WALLET_PAYMENT, error: error.message });
      }
    },

  createWalletRazorpayOrder: async (req, res) => {
    try {
      const { amount } = req.body;
      const options = {
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `wlt_${req.user.id.toString().slice(-10)}_${Date.now()}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);
      res.json({
        orderId: razorpayOrder.id,
        currency: razorpayOrder.currency,
        amount: razorpayOrder.amount,
      });
    } catch (error) {
      console.error('Error creating wallet Razorpay order:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_CREATING_PAYMENT_ORDER, error: error.message });
    }
  },

  verifyWalletPayment: async (req, res) => {
    try {
      const {
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        amount
      } = req.body;

      const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
      const digest = shasum.digest('hex');

      if (digest !== razorpaySignature) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.TRANSACTION_NOT_LEGITIMATE });
      }

      let wallet = await Wallet.findOne({ userId: req.user.id });
      if (!wallet) {
        wallet = new Wallet({ userId: req.user.id, balance: 0, transactions: [] });
      }

      const parsedAmount = parseFloat(amount);
      wallet.balance += parsedAmount;
      wallet.transactions.push({
        type: 'credit',
        amount: parsedAmount,
        description: 'Wallet Top-up',
        razorpayPaymentId
      });

      await wallet.save();
      res.json({ message: MESSAGES.PAYMENT_VERIFIED_SUCCESSFULLY, balance: wallet.balance });
    } catch (error) {
      console.error('Error verifying wallet payment:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_VERIFYING_PAYMENT, error: error.message });
    }
  }
};

module.exports = walletController;
