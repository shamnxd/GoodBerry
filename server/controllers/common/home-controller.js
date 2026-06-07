const Product = require('../../models/Product');
const Variant = require('../../models/Variant');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const getFeatured = async (req, res) => {
  try {
    const featuredProducts = await Product.aggregate([
      {
        $match: {
          isFeatured: true,
          unListed: false,
        },
      },
      {
        $lookup: {
          from: "variants", 
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $addFields: {
          firstVariant: { $arrayElemAt: ["$variants", 0] }, 
        },
      },
      {
        $lookup: {
          from: "categories", 
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $addFields: {
          categoryDetails: { $arrayElemAt: ["$categoryDetails", 0] }, 
        },
      },
      {
        $match: {
          "categoryDetails.status": "Active", 
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          categoryName: "$categoryDetails.name",
          "firstVariant.title": 1,
          "firstVariant.description": 1,
          "firstVariant.price": { $arrayElemAt: ["$firstVariant.packSizes.price", 0] },
          "firstVariant.salePrice": { $arrayElemAt: ["$firstVariant.packSizes.salePrice", 0] },
          "firstVariant.images": { $arrayElemAt: ["$firstVariant.images", 0] }, 
        },
      },
    ]);

    return res.json({
      success: true,
      data: featuredProducts,
    });
  } catch (error) {
    console.error("Error fetching featured products:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
  }
};


module.exports = {
  getFeatured
};