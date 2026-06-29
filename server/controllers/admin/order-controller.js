const Order = require('../../models/Order');
const Variant = require('../../models/Variant');
const Product = require('../../models/Product')
const Wallet = require('../../models/Wallet');
const User = require('../../models/User');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const orderController = {
  getAllOrders: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search;
      const status = req.query.status;
      const returnRequests = req.query.returnRequests === 'true';

      let query = {};

      if (status === 'all') {
        query.status = { $in: ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'] };
      } else if (status) {
        query.status = status;
      }

      if (search) {
        const users = await User.find({
          username: { $regex: search, $options: 'i' }
        });
        const userIds = users.map(u => u._id);

        query.$or = [
          { orderId: { $regex: search, $options: 'i' } },
          { userId: { $in: userIds } }
        ];
      }

      if (returnRequests) {
        query['items.returnRequest'] = true;
      }

      const orders = await Order.find(query)
        .populate('userId', 'username')
        .populate('addressId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Order.countDocuments(query);

      res.json({
        orders,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: MESSAGES.ERROR_FETCHING_ORDERS,
        error: error.message
      });
    }
  },
  getOrderById: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id })
        .populate('userId', 'username email')
        .populate('addressId');

      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      res.json(order);
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: MESSAGES.ERROR_FETCHING_ORDER_DETAILS,
        error: error.message
      });
    }
  },

  updateOrderItemStatus: async (req, res) => {
    try {
      const { orderId, productId } = req.params;
      const { status, cancellationReason } = req.body;

      const order = await Order.findById(orderId)
        .populate('userId', 'username')
        .populate('addressId')
        .populate('items.productId')
        .populate('couponId');

      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      const itemIndex = order.items.findIndex(
        (item) => item.productId._id.toString() === productId
      );

      if (itemIndex === -1) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_ITEM_NOT_FOUND });
      }

      order.items[itemIndex].status = status;

      if (status === 'cancelled') {
        order.items[itemIndex].cancellationReason = cancellationReason;

        const variant = await Variant.findOne({ productId: productId, title: order.items[itemIndex].flavor });
        if (variant) {
          const packSize = order.items[itemIndex].packageSize;
          const packSizeIndex = variant.packSizes.findIndex(
            (p) => p.size === packSize
          );
          if (packSizeIndex !== -1) {
            variant.packSizes[packSizeIndex].quantity += order.items[itemIndex].quantity;
            await variant.save();
          }
        }

        let refundAmount = order.items[itemIndex].salePrice * order.items[itemIndex].quantity;

        if (order.couponId) {
          const remainingItems = order.items.filter((item) => item.status !== 'cancelled' && item.status !== 'returned');
          const remainingTotal = remainingItems.reduce(
            (sum, item) => sum + (item.salePrice * item.quantity),
            0
          );

          if (remainingTotal < order.couponId.minimumAmount) {
            const discountToReverse = order.couponDiscount;
            refundAmount -= discountToReverse;
            order.couponId = null;
            order.couponDiscount = 0;
          }
        }

        if (['wallet', 'upi'].includes(order.paymentMethod)) {
          let wallet = await Wallet.findOne({ userId: order.userId });
          if (!wallet) {
            wallet = new Wallet({ userId: order.userId, balance: 0, transactions: [] });
            await wallet.save();
          }
          await wallet.refund(refundAmount, `Refund for cancelled item ${order.items[itemIndex].name}`);
        }
      }


      if (status === 'delivered') {
        order.paymentStatus = "paid"
        order.items[itemIndex].deliveredAt = new Date();

        // Handle referral bonuses
        const user = await User.findById(order.userId);

        if (user.referredBy && !user.referralBonusApplied) {
          const referrer = await User.findOne({ referralCode: user.referredBy });

          if (referrer) {
            let referrerWallet = await Wallet.findOne({ userId: referrer._id });
            let userWallet = await Wallet.findOne({ userId: user._id });

            if (!referrerWallet) {
              referrerWallet = new Wallet({ userId: referrer._id, balance: 0, transactions: [] });
              await referrerWallet.save(); // Save the new wallet instance
            }

            await referrerWallet.credit(50, 'Referral bonus for referring a new user');

            if (!userWallet) {
              userWallet = new Wallet({ userId: user._id, balance: 0, transactions: [] });
              await userWallet.save();
            }

            await userWallet.credit(25, 'Referral bonus for being referred');


            user.referralBonusApplied = true;
            await user.save();
          }
        }
      }

      const remainingItems = order.items.filter((item) => item.status !== 'cancelled');
      order.subtotal = remainingItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );


      order.discount = remainingItems.reduce(
        (totalDiscount, i) =>
          totalDiscount + (i.price * i.quantity - i.salePrice * i.quantity),
        0
      );

      order.total = order.subtotal - order.couponDiscount - order.discount;

      const allCancelled = order.items.every((item) => item.status === 'cancelled');
      if (allCancelled) {
        order.status = 'cancelled';
      } else {
        const statuses = order.items.map((item) => item.status);
        if (statuses.some((s) => s === 'delivered')) {
          order.status = 'delivered';
        } else if (statuses.some((s) => s === 'shipped')) {
          order.status = 'shipped';
        } else if (statuses.some((s) => s === 'processing')) {
          order.status = 'processing';
        } else if (statuses.every((s) => s === 'returned')) {
          order.status = 'returned';
        }
      }

      await order.save();

      res.json({
        message: MESSAGES.ORDER_ITEM_STATUS_UPDATED_SUCCESSFULLY,
        order,
      });
    } catch (error) {
      console.error('Error updating order item status:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_UPDATING_ORDER_ITEM_STATUS });
    }
  },

  approveReturnRequest: async (req, res) => {
    try {
      const { orderId, productId } = req.params;

      const order = await Order.findById(orderId)
        .populate('userId', 'username')
        .populate('addressId')
        .populate('items.productId')
        .populate('couponId');

      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      const itemIndex = order.items.findIndex(
        (item) => item.productId._id.toString() === productId
      );

      if (itemIndex === -1) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_ITEM_NOT_FOUND });
      }

      const item = order.items[itemIndex];

      if (!item.returnRequest) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: MESSAGES.NO_RETURN_REQUEST_FOUND_FOR_THIS_ITEM,
        });
      }

      // Update stock quantity
      const variant = await Variant.findOne({ productId: productId, title: item.flavor });
      if (variant) {
        const packSize = item.packageSize;
        const packSizeIndex = variant.packSizes.findIndex(
          (p) => p.size === packSize
        );
        if (packSizeIndex !== -1) {
          variant.packSizes[packSizeIndex].quantity += item.quantity;
          await variant.save();
        }
      }

      item.status = 'returned';
      item.returnRequest = false;

      let refundAmount = item.salePrice * item.quantity;

      if (order.couponId) {
        const remainingItems = order.items.filter(
          (i) => i.status !== 'returned'
        );
        const remainingTotal = remainingItems.reduce(
          (sum, i) => sum + i.salePrice * i.quantity,
          0
        );

        if (remainingTotal < order.couponId.minimumAmount) {
          const discountToReverse = order.couponDiscount;
          refundAmount -= discountToReverse;
          order.couponId = null;
          order.couponDiscount = 0;
        }
      }

      const remainingItems = order.items.filter((i) => i.status !== 'returned' && i.status !== 'cancelled');
      order.subtotal = remainingItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      order.discount = remainingItems.reduce(
        (totalDiscount, i) =>
          totalDiscount + (i.price * i.quantity - i.salePrice * i.quantity),
        0
      );

      order.total = order.subtotal - order.couponDiscount - order.discount;

      if (['wallet', 'upi', 'cod'].includes(order.paymentMethod)) {
        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
          wallet = new Wallet({ userId: order.userId, balance: 0, transactions: [] });
          await wallet.save();
        }
        await wallet.refund(refundAmount, `Refund for returned item ${item.name}`);
      }

      const allReturned = order.items.every((item) => item.status === 'returned');
      if (allReturned) {
        order.status = 'returned';
      } else {
        const statuses = order.items.map((i) => i.status);
        if (statuses.some((s) => s === 'delivered')) {
          order.status = 'delivered';
        } else if (statuses.some((s) => s === 'shipped')) {
          order.status = 'shipped';
        } else if (statuses.some((s) => s === 'processing')) {
          order.status = 'processing';
        } else if (statuses.every((s) => s === 'cancelled')) {
          order.status = 'cancelled';
        }
      }

      await order.save();

      res.json({
        message: MESSAGES.RETURN_REQUEST_APPROVED_AND_REFUND_PROCESSED_SUCCESSFULLY,
        order,
        refundAmount,
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: MESSAGES.ERROR_APPROVING_RETURN_REQUEST,
        error: error.message,
      });
    }
  },


  rejectReturnRequest: async (req, res) => {
    try {
      const { orderId, productId } = req.params;

      const order = await Order.findById(orderId)
        .populate('userId', 'username')
        .populate('addressId')
        .populate('items.productId');

      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      const itemIndex = order.items.findIndex(
        item => item.productId._id.toString() === productId
      );

      if (itemIndex === -1) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_ITEM_NOT_FOUND });
      }

      const item = order.items[itemIndex];

      if (!item.returnRequest) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: MESSAGES.NO_RETURN_REQUEST_FOUND_FOR_THIS_ITEM
        });
      }

      item.status = 'delivered';
      item.returnRequest = false;

      await order.save();

      res.json(order);
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: MESSAGES.ERROR_REJECTING_RETURN_REQUEST,
        error: error.message
      });
    }
  }
}

module.exports = orderController;
