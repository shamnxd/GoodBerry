const User = require('../../models/User');
const Order = require('../../models/Order');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    const searchQuery = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const statusQuery = status !== 'all'
      ? { isBlocked: status === 'blocked' }
      : {};

    const finalQuery = {
      ...searchQuery,
      ...statusQuery,
    };

    const users = await User.aggregate([
      { $match: finalQuery }, 
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'userId',
          as: 'orders',
        },
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' }, 
        },
      },
      { $project: { orders: 0 } }, 
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    const totalUsers = await User.countDocuments(finalQuery);

    res.status(HTTP_STATUS.OK).json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.FAILED_TO_FETCH_USERS });
  }
};

const updateUser = async (req, res) => {
  try {
    const { isBlocked } = req.body; 
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
    }

    res.status(HTTP_STATUS.OK).json({ message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR, error: error.message });
  }
};

module.exports = {
  getAllUsers,
  updateUser,
};