const Category = require('../../models/Categorys.js');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


// Add Category
const addCategory = async (req, res) => {
  try {
    const { name, status, image, offerPercentage } = req.body;

    const existingCategory = await Category.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });

    if (existingCategory) {
      return res.json({ success: false, message: MESSAGES.CATEGORY_ALREADY_EXISTS });
    }

    const category = await Category.create({ name, status, image, offerPercentage });
    return res.status(HTTP_STATUS.CREATED).json({ success: true, message: MESSAGES.CATEGORY_CREATED_SUCCESSFULLY, category });

  } catch (error) {
    console.error('Error creating category:', error.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.FAILED_TO_CREATE_CATEGORY, error: error.message });
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const search = req.query.search || '';
    const status = req.query.status || 'all';

    const filter = {
      ...(status !== 'all' ? { status } : {}),
      ...(search ? { name: { $regex: search, $options: 'i' } } : {})
    };

    let categories;
    const totalCategorys = await Category.countDocuments(filter);

    if (page !== null && limit !== null) {
      categories = await Category.find(filter)
        .skip((page - 1) * limit)
        .limit(limit);
    } else {
      categories = await Category.find(filter);
    }

    res.status(HTTP_STATUS.OK).json({
      categories,
      totalCategorys,
      currentPage: page || 1,
      totalPages: limit ? Math.ceil(totalCategorys / limit) : 1,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.FAILED_TO_FETCH_CATEGORIES });
  }
};

// Update the category
const updateCategory = async (req, res) => {
  try {
    const { name, status, image, offerPercentage } = req.body;
    const { id: categoryId } = req.params;

    console.log(req.body);

    const categoryExists = await Category.findOne({
      $and: [
        { name: { $regex: `^${name}$`, $options: 'i' } },
        { _id: { $ne: categoryId } },
      ],
    });

    if (categoryExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.CATEGORY_ALREADY_EXISTS });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name, status, image, offerPercentage },
      { new: true }
    );

    console.log(updatedCategory);

    if (!updatedCategory) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.CATEGORY_NOT_FOUND });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATEGORY_UPDATED_SUCCESSFULLY,
      category: updatedCategory,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.FAILED_TO_UPDATE_CATEGORY, error: error.message });
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  updateCategory
};
