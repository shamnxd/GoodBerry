const Product = require('../../models/Product');
const Variant = require('../../models/Variant');
const mongoose = require('mongoose');
const Category = require('../../models/Categorys');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: MESSAGES.INVALID_PRODUCT_ID
      });
    }

    const product = await Product.findOne({
      _id: id,
      unListed: false
    }).populate('category', 'name');

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.PRODUCT_NOT_FOUND
      });
    }

    console.log(product)
    const variants = await Variant.find({ productId: id, isListed: true });

    const variantsFormatted = variants.reduce((acc, variant) => {
      const pSizes = variant.packSizes || [];
      acc[variant.title.toLowerCase().replace(/\s+/g, '')] = {
        _id: variant._id,
        title: variant.title,
        description: variant.description,
        images: variant.images,
        packageSizes: pSizes.map(p => p.size),
        packSizes: pSizes,
        stock: pSizes.reduce((sum, p) => sum + (p.quantity || 0), 0)
      };
      return acc;
    }, {});

    const recommendedProducts = await Product.aggregate([
      { $match: { category: product.category._id, unListed: false, _id: { $ne: new mongoose.Types.ObjectId(id) } } },
      {
        $lookup: {
          from: 'variants',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productId', '$$productId'] },
                    { $eq: ['$isListed', true] }
                  ]
                }
              }
            }
          ],
          as: 'variants',
        },
      },
      {
        $addFields: {
          firstVariant: { $arrayElemAt: ['$variants', 0] },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          'firstVariant.salePrice': { $arrayElemAt: ['$firstVariant.packSizes.salePrice', 0] },
          'firstVariant.price': { $arrayElemAt: ['$firstVariant.packSizes.price', 0] },
          'firstVariant.images': { $arrayElemAt: ['$firstVariant.images', 0] },
        },
      },
      { $limit: 5 },
    ]);

    res.status(HTTP_STATUS.OK).json({ variantsFormatted, product, recommendedProducts });

  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'featured',
      search = '',
      minPrice = 0,
      maxPrice = 1000000,
      categories = [''],
      flavors = '',
      statuses = ''
    } = req.query;

    const skip = (page - 1) * limit;

    const categoryArray = typeof categories === 'string' ? (categories ? categories.split(',') : []) : categories;
    const validCategoryIds = categoryArray.filter(cat => cat).map(cat => new mongoose.Types.ObjectId(cat));

    const flavorArray = typeof flavors === 'string' ? (flavors ? flavors.split(',') : []) : flavors;
    const statusArray = typeof statuses === 'string' ? (statuses ? statuses.split(',') : []) : statuses;

    const sortConfigurations = {
      'price-asc': { 'firstVariant.salePrice': 1 },
      'price-desc': { 'firstVariant.salePrice': -1 },
      'featured': { 'featured': -1, 'createdAt': -1 },
      'new-arrivals': { 'createdAt': -1 },
      'name-asc': { 'name': 1 },
      'name-desc': { 'name': -1 }
    };

    const sortStage = { $sort: sortConfigurations[sort] || sortConfigurations['featured'] };

    const searchPipeline = search ? [
      {
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { 'categoryDetails.name': { $regex: search, $options: 'i' } }
          ]
        }
      }
    ] : [];

    const categoryFilter = validCategoryIds.length > 0 ? {
      category: { 
        $in: validCategoryIds
      }
    } : {};

    const products = await Product.aggregate([
      {
        $match: {
          unListed: false,
          ...categoryFilter,
          ...(statusArray.includes('New') ? {
            createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 2)) }
          } : {})
        },
      },
      {
        $addFields: {
          isNew: {
            $gte: [
              "$createdAt",
              new Date(new Date().setDate(new Date().getDate() - 2)),
            ],
          },
        },
      },
      {
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productId"] },
                    { $eq: ["$isListed", true] },
                    ...(flavorArray.length > 0 ? [{ $in: ["$title", flavorArray] }] : []),
                  ]
                }
              }
            },
            ...(statusArray.includes('In stock') ? [
              {
                $match: {
                  "packSizes.quantity": { $gt: 0 }
                }
              }
            ] : []),
            ...(statusArray.includes('Special Offers') ? [
              {
                $match: {
                  $expr: {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: "$packSizes",
                            as: "p",
                            cond: { $lt: ["$$p.salePrice", "$$p.price"] }
                          }
                        }
                      },
                      0
                    ]
                  }
                }
              }
            ] : [])
          ],
          as: "variants",
        },
      },
      {
        $match: {
          variants: { $ne: [] }
        }
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
        $match: {
          "categoryDetails.status": "Active",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "productId",
          as: "reviews"
        },
      },
      ...searchPipeline,
      {
        $match: {
          $and: [
            { "firstVariant.packSizes.salePrice": { $gte: parseFloat(minPrice) } },
            { "firstVariant.packSizes.salePrice": { $lte: parseFloat(maxPrice) } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          categoryName: 1,
          "firstVariant.title": 1,
          "firstVariant.salePrice": { $arrayElemAt: ["$firstVariant.packSizes.salePrice", 0] },
          "firstVariant.price": { $arrayElemAt: ["$firstVariant.packSizes.price", 0] },
          "firstVariant.images": { $arrayElemAt: ["$firstVariant.images", 0] },
          "firstVariant.packSizes.quantity": 1,
          isNew: 1,
          featured: 1,
          createdAt: 1,
          inStock: 1
        },
      },
      sortStage,
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
    ]);

    const matchStage = {
      $match: {
        unListed: false,
        ...categoryFilter,
        ...(statusArray.includes('New') ? {
          createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 2)) }
        } : {}),
        ...(search && {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { 'categoryDetails.name': { $regex: search, $options: 'i' } }
          ]
        })
      }
    };

    const totalCount = await Product.aggregate([
      matchStage,
      {
        $lookup: {
          from: "variants",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productId"] },
                    { $eq: ["$isListed", true] },
                    ...(flavorArray.length > 0 ? [{ $in: ["$title", flavorArray] }] : []),
                  ]
                }
              }
            },
            ...(statusArray.includes('In stock') ? [
              {
                $match: {
                  "packSizes.quantity": { $gt: 0 }
                }
              }
            ] : []),
            ...(statusArray.includes('Special Offers') ? [
              {
                $match: {
                  $expr: {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: "$packSizes",
                            as: "p",
                            cond: { $lt: ["$$p.salePrice", "$$p.price"] }
                          }
                        }
                      },
                      0
                    ]
                  }
                }
              }
            ] : [])
          ],
          as: "variants",
        },
      },
      {
        $match: {
          variants: { $ne: [] }
        }
      },
      {
        $addFields: {
          firstVariant: { $arrayElemAt: ["$variants", 0] },
        },
      },
      {
        $match: {
          $and: [
            { "firstVariant.packSizes.salePrice": { $gte: parseFloat(minPrice) } },
            { "firstVariant.packSizes.salePrice": { $lte: parseFloat(maxPrice) } }
          ]
        }
      },
      { $count: "total" }
    ]).then(result => (result[0]?.total || 0));

    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: products,
      pagination: {
        totalItems: totalCount,
        totalPages: totalPages,
        start: skip + 1,
        end: Math.min(skip + parseInt(limit), totalCount),
        currentPage: parseInt(page)
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.SERVER_ERROR,
      error: error.message
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $match: {
          status: 'Active'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $project: {
          name: 1,
          image: 1,
          count: {
            $size: {
              $filter: {
                input: '$products',
                as: 'product',
                cond: { $eq: ['$$product.unListed', false] }
              }
            }
          }
        }
      },
      {
        $sort: {
          name: 1
        }
      }
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.message
    });
  }
};
module.exports = { getProductDetails, getAllProducts, getCategories };