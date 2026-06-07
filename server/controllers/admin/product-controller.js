const Variant = require('../../models/Variant');
const Product = require('../../models/Product');
const Category = require('../../models/Categorys');
const Cart = require('../../models/Cart');
const { default: mongoose } = require('mongoose');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


// Add product handler
const addProduct = async (req, res) => {
  const { name, description, isFeatured, category, variants } = req.body;
  try {
    if (!name || !description || !category) {
      return res.json({ message: MESSAGES.NAME_DESCRIPTION_AND_CATEGORY_ARE_REQUIRED });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.json({ message: MESSAGES.AT_LEAST_ONE_VARIANT_IS_REQUIRED });
    }

    if (!variants.some(v => v.isListed !== false)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "At least one variant must be listed." });
    }

    const newProduct = new Product({ name, description, isFeatured, category });
    const savedProduct = await newProduct.save();

    const savedVariants = await Promise.all(
      variants.map(async (variant) => {
        const newVariant = new Variant({
          productId: savedProduct._id,
          title: variant.title,
          description: variant.description,
          images: variant.images,
          packSizes: variant.packSizes
        });

        return await newVariant.save();
      })
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.PRODUCT_AND_VARIANTS_ADDED_SUCCESSFULLY,
      product: savedProduct,
      variants: savedVariants,
    });
  } catch (error) {
    console.error("Error adding product and variants:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_ADD_PRODUCT_AND_VARIANTS, error: error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = '' } = req.query;
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const products = await Product.find(searchQuery)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalProducts = await Product.countDocuments(searchQuery);

    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        const category = await Category.findOne({ _id: product.category });
        const allVariants = await Variant.find({ productId: product._id });
        const activeVariants = allVariants.filter(v => v.isListed);

        const totalStock = allVariants.reduce((acc, variant) => 
          acc + (variant.packSizes || []).reduce((sum, pack) => sum + (pack.quantity || 0), 0), 0);

        const defaultVariant = activeVariants[0] || allVariants[0];
        const defaultPrice = defaultVariant?.packSizes?.[0]?.price || 0;

        return {
          ...product._doc,
          category: category ? { name: category.name, status: category.status } : { name: "Unknown", status: "Unknown" },
          variants: allVariants,
          image: defaultVariant?.images?.[0] || '',
          price: defaultPrice,
          totalStock,
          variantCount: allVariants.length,
          activeVariantCount: activeVariants.length,
        };
      })
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.PRODUCTS_FETCHED_SUCCESSFULLY,
      products: productsWithDetails,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.FAILED_TO_FETCH_PRODUCTS,
      error: error.message,
    });
  }
};


const getProduct = async (req, res) => {
  const productId = req.params.id;
  try {

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }

    const variants = await Variant.find({ productId: productId });

    res.json({
      success: true,
      message: MESSAGES.PRODUCT_FETCHED_SUCCESSFULLY,
      product,
      variants,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.FAILED_TO_FETCH_PRODUCT,
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    isFeatured,
    category,
    variants,
  } = req.body;

  try {
    if (!name || !description || !category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.NAME_DESCRIPTION_AND_CATEGORY_ARE_REQUIRED });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.AT_LEAST_ONE_VARIANT_IS_REQUIRED });
    }

    if (!variants.some(v => v.isListed !== false)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "At least one variant must be listed." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.INVALID_PRODUCT_ID });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, description, isFeatured, category },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.PRODUCT_NOT_FOUND });
    }

    const existingVariants = await Variant.find({ productId: id });
    const existingVariantIds = existingVariants.map(v => v._id.toString());
    const incomingVariantIds = variants.filter(v => v._id).map(v => v._id.toString());

    // Mark missing variants as deleted
    await Variant.updateMany(
      { 
        productId: id, 
        _id: { $nin: incomingVariantIds.map(vid => new mongoose.Types.ObjectId(vid)) } 
      },
      { isListed: false }
    );

    const updatedVariants = await Promise.all(
      variants.map(async (variant) => {
        if (variant._id && mongoose.Types.ObjectId.isValid(variant._id)) {
          // Update existing variant
          const existingVariant = await Variant.findById(variant._id);
          if (existingVariant) {
            existingVariant.title = variant.title;
            existingVariant.description = variant.description;
            existingVariant.images = variant.images;
            existingVariant.packSizes = variant.packSizes;
            existingVariant.isListed = variant.isListed !== false;
            return await existingVariant.save();
          }
          return null;
        } else {
          // Create new variant
          const newVariant = new Variant({
            productId: updatedProduct._id,
            title: variant.title,
            description: variant.description,
            images: variant.images,
            packSizes: variant.packSizes,
          });
          return await newVariant.save();
        }
      })
    );

    // Update cart items for all users
    const carts = await Cart.find({ "items.productId": id });
    for (const cart of carts) {
      cart.items.forEach(item => {
        if (item.productId.toString() === id) {
          const variant = updatedVariants.find(v => v.title === item.flavor);
          if (variant) {
            const pack = (variant.packSizes || []).find(p => p.size === item.packageSize);
            if (pack) {
              item.price = pack.price;
              item.salePrice = pack.salePrice;
            }
          }
        }
      });
      await cart.save();
    }

    res.json({
      success: true,
      message: MESSAGES.PRODUCT_AND_VARIANTS_UPDATED_SUCCESSFULLY,
      product: updatedProduct,
      variants: updatedVariants,
    });
  } catch (error) {
    console.error("Error updating product and variants:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_UPDATE_PRODUCT_AND_VARIANTS, error: error.message });
  }
};

// Delete a product (soft delete)
const unListProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }


    const list = !product.unListed;
    console.log(list);

    const data = await Product.findByIdAndUpdate(productId, { unListed: list });
    res.status(HTTP_STATUS.OK).json({ success: true, message: MESSAGES.PRODUCT_UNLISTED_SUCCESSFULLY, productId, data });
  } catch (error) {
    console.error("Error unlisting product:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.FAILED_TO_UNLIST_PRODUCT, error: error.message });
  }
}

module.exports = {
  addProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  unListProduct
}