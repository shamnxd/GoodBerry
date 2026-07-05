const Coupon = require('../../models/Coupon');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const couponController = {
  getAllCoupons: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
      const searchQuery = search
        ? {
          $or: [
            { code: { $regex: search, $options: 'i' } },
            { status: { $regex: search, $options: 'i' } },
          ],
        }
        : {};

      const finalQuery = {
        ...searchQuery,
        ...(status !== 'all' ? { status } : {})
      };

      const coupons = await Coupon.find(finalQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });     

      const totalCoupons = await Coupon.countDocuments(finalQuery);

      const currentDate = new Date();
      for (const coupon of coupons) {
        if (coupon.endDate < currentDate && coupon.status !== 'expired') {
          coupon.status = 'expired';
          await coupon.save();
        }
      }

      for (const coupon of coupons) {
        if (coupon.used >= coupon.usageLimit && coupon.status !== 'inactive' && coupon.status !== 'expired') {
          coupon.status = 'expired';
          await coupon.save();
        }
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: MESSAGES.COUPONS_FETCHED_SUCCESSFULLY,
        coupons,
        totalPages: Math.ceil(totalCoupons / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGES.FAILED_TO_FETCH_COUPONS,
        error: error.message,
      });
    }
  },

  // Add a new coupon
  addCoupon: async (req, res) => {
    try {
      const { code, description, discount, startDate, endDate, usageLimit, minimumAmount, status } = req.body;

      if (!code || typeof code !== 'string' || code.trim() === '') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_CODE_REQUIRED });
      }
      const trimmedCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_CODE_INVALID });
      }
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_DESCRIPTION_REQUIRED });
      }
      const numDiscount = Number(discount);
      if (isNaN(numDiscount) || numDiscount <= 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_DISCOUNT_INVALID });
      }
      const numMinAmount = Number(minimumAmount);
      if (isNaN(numMinAmount) || numMinAmount < 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_MIN_AMOUNT_NEGATIVE });
      }
      if (numMinAmount < numDiscount) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_MIN_AMOUNT_LESS_THAN_DISCOUNT });
      }
      const numUsageLimit = Number(usageLimit);
      if (isNaN(numUsageLimit) || !Number.isInteger(numUsageLimit) || numUsageLimit <= 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_USAGE_LIMIT_INVALID });
      }
      if (!startDate || !endDate) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_START_END_DATE_REQUIRED });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_DATE_FORMAT_INVALID });
      }
      if (end < start) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_END_DATE_BEFORE_START });
      }
      const today = new Date();
      today.setHours(0,0,0,0);
      const endCheck = new Date(endDate);
      endCheck.setHours(0,0,0,0);
      if (endCheck < today) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_END_DATE_IN_PAST });
      }

      const existingCoupon = await Coupon.findOne({ code: trimmedCode });
      if (existingCoupon) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.COUPON_CODE_ALREADY_EXISTS,
        });
      }

      const newCoupon = new Coupon({ 
        code: trimmedCode, 
        description: description.trim(), 
        discount: numDiscount, 
        startDate, 
        endDate, 
        usageLimit: numUsageLimit, 
        minimumAmount: numMinAmount, 
        status 
      });
      const savedCoupon = await newCoupon.save();

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: MESSAGES.COUPON_ADDED_SUCCESSFULLY,
        coupon: savedCoupon,
      });
    } catch (error) {
      console.error("Error adding coupon:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGES.FAILED_TO_ADD_COUPON,
        error: error.message,
      });
    }
  },

  // Update a coupon
  updateCoupon: async (req, res) => {
    const { id } = req.params;
    const { code, description, discount, startDate, endDate, usageLimit, minimumAmount, status } = req.body;

    try {
      if (!code || typeof code !== 'string' || code.trim() === '') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_CODE_REQUIRED });
      }
      const trimmedCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_CODE_INVALID });
      }
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_DESCRIPTION_REQUIRED });
      }
      const numDiscount = Number(discount);
      if (isNaN(numDiscount) || numDiscount <= 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_DISCOUNT_INVALID });
      }
      const numMinAmount = Number(minimumAmount);
      if (isNaN(numMinAmount) || numMinAmount < 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_MIN_AMOUNT_NEGATIVE });
      }
      if (numMinAmount < numDiscount) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_MIN_AMOUNT_LESS_THAN_DISCOUNT });
      }
      const numUsageLimit = Number(usageLimit);
      if (isNaN(numUsageLimit) || !Number.isInteger(numUsageLimit) || numUsageLimit <= 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_USAGE_LIMIT_INVALID });
      }
      if (!startDate || !endDate) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_START_END_DATE_REQUIRED });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_DATE_FORMAT_INVALID });
      }
      if (end < start) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_END_DATE_BEFORE_START });
      }
      const today = new Date();
      today.setHours(0,0,0,0);
      const endCheck = new Date(endDate);
      endCheck.setHours(0,0,0,0);
      if (endCheck < today) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.COUPON_END_DATE_IN_PAST });
      }

      const existingCoupon = await Coupon.findOne({ code: trimmedCode, _id: { $ne: id } });
      if (existingCoupon) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: MESSAGES.COUPON_CODE_ALREADY_EXISTS,
        });
      }

      const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        { 
          code: trimmedCode, 
          description: description.trim(), 
          discount: numDiscount, 
          startDate, 
          endDate, 
          usageLimit: numUsageLimit, 
          minimumAmount: numMinAmount, 
          status 
        },
        { new: true }
      );

      if (!updatedCoupon) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.COUPON_NOT_FOUND });
      }

      res.json({
        success: true,
        message: MESSAGES.COUPON_UPDATED_SUCCESSFULLY,
        coupon: updatedCoupon,
      });
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_UPDATE_COUPON, error: error.message });
    }
  },

  // Toggle coupon status
  toggleCouponStatus: async (req, res) => {
    const { id } = req.params;

    try {
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ 
          success: false,
          message: MESSAGES.COUPON_NOT_FOUND 
        });
      }

      // Toggle status between active and inactive
      coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
      await coupon.save();

      res.json({
        success: true,
        message: `Coupon ${coupon.status === 'active' ? 'activated' : 'deactivated'} successfully`,
        coupon,
      });
    } catch (error) {
      console.error("Error toggling coupon status:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Failed to toggle coupon status", 
        error: error.message 
      });
    }
  },

  applyCoupon: async (req, res) => {
    try {
      const { code, total } = req.body;
      const userId = req.user.id;

      const coupon = await Coupon.findOne({ code, status: 'active' });

      if (!coupon) {
        return res.json({
          success: false,
          message: MESSAGES.INVALID_OR_EXPIRED_COUPON_CODE,
        });
      }

      const cart = await Cart.findOne({ userId });

      if (!cart) {
        return res.json({
          success: false,
          message: MESSAGES.CART_NOT_FOUND,
        });
      }

      cart.couponId = coupon._id;
      
      await cart.save();

      if (coupon.startDate > new Date() || coupon.endDate < new Date()) {
        return res.json({
          success: false,
          message: MESSAGES.COUPON_IS_NOT_VALID_AT_THIS_TIME,
        });
      }

      if (coupon.usageLimit <= coupon.used) {
        return res.json({
          success: false,
          message: MESSAGES.COUPON_USAGE_LIMIT_HAS_BEEN_REACHED,
        });
      }

      const existingOrder = await Order.findOne({ userId, couponId: coupon._id });
      if (existingOrder) {
        return res.json({
          success: false,
          message: MESSAGES.YOU_HAVE_ALREADY_USED_THIS_COUPON,
        });
      }

      if (total < coupon.minimumAmount) {
        return res.json({
          success: false,
          message: `This coupon is only valid for order amounts of ₹${coupon.minimumAmount} or more.`,
        });
      }

      await coupon.save();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Coupon applied (${coupon.code} - ${coupon.discount} off)`,
        discount: coupon.discount,
        couponId: coupon._id,
      });
    } catch (error) {
      console.error('Error applying coupon:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGES.FAILED_TO_APPLY_COUPON,
        error: error.message,
      });
    }
  },

  checkCoupon: async (req, res) => {
    try {
      const { code, total } = req.body;
      const coupon = await Coupon.findOne({ code });
      if (!coupon) return res.json({});

      if(coupon.startDate > new Date() || coupon.endDate < new Date())  return res.json({});

      if (coupon.usageLimit <= coupon.used) return res.json({})

      if (total < coupon.minimumAmount) return res.json({});

      const existingOrder = await Order.findOne({ userId, couponId: coupon._id });
      if (existingOrder) {
        return res.json({
          success: false,
          message: MESSAGES.YOU_HAVE_ALREADY_USED_THIS_COUPON,
        });
      }

      res.json({
        success: true,
        message: MESSAGES.COUPON_FOUND,
        discount: coupon.discount,
        couponId: coupon._id,
      });
    } catch (error) {
      console.error('Error checking coupon:', error);
    }
  },

  getValidCoupons: async (req, res) => {
    try {
      const coupons = await Coupon.find({ status: 'active' });
      
      res.json(coupons);
    } catch (error) {
      console.error('Error fetching valid coupons:', error);
    }
  },
};

module.exports = couponController;