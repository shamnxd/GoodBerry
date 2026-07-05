const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Category = require('../../models/Categorys');
const Variant = require('../../models/Variant');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');
const ORDER_STATUS = require('../../constants/orderStatus');



const dashboardController = {
  getDashboardData: async (req, res) => {
    try {
      const timeRange = req.query.timeRange || 'weekly';
      const today = new Date();
      let dateFilter = {};

      switch (timeRange) {
        case 'yearly':
          dateFilter = {
            $gte: new Date(today.getFullYear() - 4, 0, 1),
            $lte: today
          };
          break;
        case 'monthly':
          dateFilter = {
            $gte: new Date(today.getFullYear(), 0, 1),
            $lte: today
          };
          break;
        case 'weekly':
          const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = {
            $gte: lastWeek,
            $lte: today
          };
          break;
      }

      const totalRevenue = await Order.aggregate([
        { $match: { status: ORDER_STATUS.DELIVERED, createdAt: dateFilter } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);

      const totalCustomers = await User.countDocuments({
        createdAt: dateFilter,
        isBlocked: false
      });

      const totalSales = await Order.countDocuments({
        status: ORDER_STATUS.DELIVERED,
        createdAt: dateFilter
      });

      const totalCancelled = await Order.countDocuments({
        status: ORDER_STATUS.CANCELLED,
        createdAt: dateFilter
      });

      const overviewData = await Order.aggregate([
        {
          $match: {
            status: ORDER_STATUS.DELIVERED,
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: timeRange === 'yearly'
              ? { $year: '$createdAt' }
              : timeRange === 'monthly'
                ? { $month: '$createdAt' }
                : { $dayOfWeek: '$createdAt' },
            total: { $sum: '$total' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      const top10Categories = await Order.aggregate([
        { $match: { status: ORDER_STATUS.DELIVERED } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $group: {
            _id: { $arrayElemAt: ['$product.category', 0] },
            totalSales: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $project: {
            name: { $arrayElemAt: ['$category.name', 0] },
            sales: '$totalSales'
          }
        }
      ]);

      const top10Products = await Order.aggregate([
        { $match: { status: ORDER_STATUS.DELIVERED } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalSales: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            name: { $arrayElemAt: ['$product.name', 0] },
            sales: '$totalSales'
          }
        }
      ]);

      const recentSales = await Order.find({ status: ORDER_STATUS.DELIVERED })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('userId', 'username email')
        .select('total createdAt userId orderId');

      res.json({
        totalRevenue: {
          value: totalRevenue[0]?.total || 0,
          change: 0
        },
        totalCancelled: {
          value: totalCancelled,
          change: 0
        },
        newCustomers: {
          value: totalCustomers,
          change: 0
        },
        totalSales: {
          value: totalSales,
          change: 0
        },
        top10Categories,
        top10Products,
        activeUsers: {
          value: 0,
          change: 0
        },
        recentSales: recentSales.map(sale => ({
          orderId: sale.orderId,
          name: sale.userId?.username || "dff",
          sale: sale.total 
        })),
        overviewData: overviewData.map(data => ({
          name: timeRange === 'yearly'
            ? data._id.toString()
            : timeRange === 'monthly'
              ? new Date(0, data._id - 1).toLocaleString('en-US', { month: 'short' })
              : new Date(2024, 0, data._id).toLocaleString('en-US', { weekday: 'short' }),
          total: data.total
        })),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.FAILED_TO_FETCH_DASHBOARD_DATA });
    }
  }
};

module.exports = dashboardController;