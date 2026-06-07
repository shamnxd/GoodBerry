const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Address = require('../../models/Address');
const Variant = require('../../models/Variant');
const Wallet = require('../../models/Wallet');
const Coupon = require('../../models/Coupon');
const User = require('../../models/User');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const orderController = {  
  createOrder : async (req, res) => {
    try {
      const { 
        addressId, 
        shippingMethod, 
        paymentMethod,
        discount,
        coupon,
      } = req.body;
      
      if (!addressId || !shippingMethod || !paymentMethod) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          message: MESSAGES.ADDRESS_SHIPPING_METHOD_AND_PAYMENT_METHOD_ARE_REQUIRED 
        });
      }

      const address = await Address.findOne({ 
        _id: addressId,
        userId: req.user.id
      });
      
      if (!address) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.INVALID_ADDRESS });
      }
  
      const cart = await Cart.findOne({ userId: req.user.id });
      if (!cart || cart.items.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.CART_IS_EMPTY });
      }

      for (const cartItem of cart.items) {
        const variant = await Variant.findOne({ productId: cartItem.productId, title : cartItem.flavor, isListed: true });

        if (!variant) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            message: `Product variant not found for product ID: ${cartItem.productId}` 
          });
        }

        const packSize = variant.packSizes.find(
          pack => pack.size === cartItem.packageSize
        );

        if (!packSize) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            message: `Pack size ${cartItem.packageSize} not found for this product` 
          });
        }

        if (packSize.quantity < cartItem.quantity) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            message: `Insufficient quantity available for ${cartItem.name}. Required: ${cartItem.quantity}, Available: ${packSize.quantity}` 
          });
        }

        if(paymentMethod == 'cod' || paymentMethod == 'wallet') {
          packSize.quantity -= cartItem.quantity;
        }
        await variant.save();
      }
  
      const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingCost = shippingMethod.price || 0;
      const couponDiscount = coupon?.discount || 0;
      const total = subtotal + shippingCost - discount - couponDiscount;
  
      const order = new Order({
        userId: req.user.id,
        items: cart.items,
        addressId,
        shippingMethod,
        paymentMethod,
        cancellation: {
          reason: '',
          message: '',
          date: null
        },
        subtotal: Number(subtotal),
        shippingCost,
        discount: Number(discount),
        couponDiscount: Number(couponDiscount),
        couponId: coupon?.couponId,
        total: Number(total),
      });

      if (coupon?.couponId) {
        const usedCoupon = await Coupon.findById(coupon.couponId);
        if (usedCoupon) {
          usedCoupon.used += 1;
          await usedCoupon.save();
        }
      }
  
      if(paymentMethod == 'cod' || paymentMethod == 'upi') {
        cart.items = [];
        await cart.save();
      }

      await order.save();
      await order.populate('addressId');
      
      res.status(HTTP_STATUS.CREATED).json(order);
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        message: MESSAGES.ERROR_CREATING_ORDER, 
        error: error.message 
      });
    }
  },
  
  getOrders : async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const search = req.query.search;
      
      let query = { userId: req.user.id}; 

      if(status === 'all') {
        query.status = { $in: ['processing', 'shipped', 'delivered', 'cancelled', 'returned', 'failed'] };
      } else if (status) {
        query.status = status;
      }

      if (search) {
        query.orderId = { $regex: search, $options: 'i' };
      }

      const orders = await Order.find(query,{status: 1, createdAt: 1, orderId: 1})
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
  
  getOrderById : async (req, res) => {
    try {
      const order = await Order.findOne({ 
        orderId: req.params.id, 
        userId: req.user.id 
      }).populate('addressId');
      
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }
      
      res.json(order);
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        message: MESSAGES.ERROR_FETCHING_ORDER, 
        error: error.message 
      });
    }
  },
  
  cancelOrder: async (req, res) => {
    try {
        const { itemId, reason } = req.body;

        if (!reason) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.CANCELLATION_REASON_IS_REQUIRED });
        }

        const order = await Order.findOne({
            orderId: req.params.id,
            userId: req.user.id,
        }).populate('addressId').populate('couponId');

        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ITEM_NOT_FOUND_IN_ORDER });
        }

        if (!['processing', 'delivered'].includes(item.status)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.ITEM_CANNOT_BE_CANCELLED_IN_ITEM_STATUS_STATUS });
        }

        const variant = await Variant.findOne({
            productId: item.productId,
            title: item.flavor,
        });

        if (!variant) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.PRODUCT_VARIANT_NOT_FOUND });
        }

        const packSize = variant.packSizes.find(pack => pack.size === item.packageSize);
        if (packSize) {
            packSize.quantity += item.quantity;
            await variant.save();
        }

        item.status = 'cancelled';
        item.cancellationReason = reason;
        item.cancellation = {
            reason,
            date: new Date(),
        };

        const remainingItems = order.items.filter(i => i.status !== 'cancelled' && i.status !== 'returned');
        order.discount = remainingItems.reduce((total, i) => total + (i.price - i.salePrice) * i.quantity, 0);

        let couponRefundAmount = 0;
        let isCouponRemoved = false;

        if (order.couponId) {
            const remainingTotal = remainingItems.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
            if (remainingTotal < order.couponId.minimumAmount) {
                couponRefundAmount = order.couponDiscount; 
                order.couponId = null;
                order.couponDiscount = 0;
                isCouponRemoved = true;
            }
        }

        order.subtotal = remainingItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        order.total = order.subtotal - order.couponDiscount - order.discount;

        if (order.items.every(i => i.status === 'cancelled')) {
            order.status = 'cancelled';
        } else if (order.items.some(i => i.status === 'processing')) {
            order.status = 'processing';
        } else if (order.items.some(i => i.status === 'shipped')) {
            order.status = 'shipped';
        } else if (order.items.some(i => i.status === 'delivered')) {
            order.status = 'delivered';
        } else if (order.items.every(i => i.status === 'returned')) {
            order.status = 'returned';
        }

        await order.save();

        if (['wallet', 'upi'].includes(order.paymentMethod)) {
            let wallet = await Wallet.findOne({ userId: req.user.id });
            if (!wallet) {
                wallet = new Wallet({ userId: req.user.id, balance: 0, transactions: [] });
                await wallet.save();
            }

            const refundAmount = isCouponRemoved
                ? (item.salePrice * item.quantity) - couponRefundAmount
                  : (item.salePrice * item.quantity);

            await wallet.refund(refundAmount, `Refund for cancelled item ${item.name}`);
        }

        res.json(order);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.ERROR_CANCELLING_ITEM, error: error.message });
    }
  },

  returnOrderItem: async (req, res) => {
    try {
      const { itemId, reason } = req.body;

      if (!reason) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.RETURN_REASON_IS_REQUIRED });
      }

      const order = await Order.findOne({
        orderId: req.params.id,
        userId: req.user.id
      }).populate('addressId');

      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ORDER_NOT_FOUND });
      }

      
      const item = order.items.id(itemId);
      if (!item) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.ITEM_NOT_FOUND_IN_ORDER });
      }

      if (item.status !== 'delivered') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: MESSAGES.ITEM_CANNOT_BE_RETURNED_IN_ITEM_STATUS_STATUS
        });
      }

      const deliveredDate = new Date(item.deliveredAt);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate - deliveredDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 5) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: MESSAGES.RETURN_PERIOD_HAS_EXPIRED_YOU_CAN_ONLY_RETURN_ITEMS_WITHIN_5_DAYS_OF_DELIVERY
        });
      }

      item.returnRequest = true;
      item.returnReason = reason;
      item.status = 'Return Requested';
      item.return = {
        reason,
        message: '',
        date: new Date()
      };

      await order.save();

      res.json(order);
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: MESSAGES.ERROR_REQUESTING_RETURN,
        error: error.message
      });
    }
  }
}

module.exports = orderController;