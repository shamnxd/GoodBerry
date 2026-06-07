const Wishlist = require('../../models/Wishlist');
const Product = require('../../models/Product');
const Variant = require('../../models/Variant');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


exports.getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.user.id })
            .populate('products.productId')
            .populate('products.variantId');

        if (!wishlist) {
            return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
        }

        const wishlistItems = wishlist.products
            .filter(item => item.productId && !item.productId.unListed && item.variantId && item.variantId.isListed) 
            .map(item => {
                const variant = item.variantId;
                const firstPackSize = variant.packSizes && variant.packSizes.length > 0 ? variant.packSizes[0] : null;
                
                if (!firstPackSize) return null;

                const stockStatus = firstPackSize.quantity > 0 ? (firstPackSize.quantity < 20 ? `Limited Stock (${firstPackSize.quantity})` : "IN STOCK") : "OUT OF STOCK";

                return {
                    productId: item.productId._id,
                    name: item.productId.name,
                    description: item.productId.description,
                    image: variant.images && variant.images.length > 0 ? variant.images[0] : null,
                    salePrice: firstPackSize.salePrice,
                    price: firstPackSize.price,
                    stockStatus,
                    variantId: variant._id
                };
            }).filter(item => item !== null);

        res.status(HTTP_STATUS.OK).json({ success: true, data: wishlistItems });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const { productId, variantId } = req.body;

        const product = await Product.findById(productId);
        const variant = await Variant.findOne({ _id: variantId, isListed: true });

        if (!product || !variant) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.PRODUCT_OR_VARIANT_NOT_FOUND });
        }

        let wishlist = await Wishlist.findOne({ userId: req.user.id });

        const wishlistItem = {
            productId: productId,
            variantId: variantId
        };

        if (!wishlist) {
            wishlist = new Wishlist({ userId: req.user.id, products: [wishlistItem] });
        } else {
            wishlist.products.push(wishlistItem);
        }

        await wishlist.save();
        res.status(HTTP_STATUS.OK).json({ success: true, data: wishlist });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const wishlist = await Wishlist.findOne({ userId: req.user.id });

        if (wishlist) {
            wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId || item.variantId.toString() !== variantId);
            await wishlist.save();
        }

        res.status(HTTP_STATUS.OK).json({ success: true, data: wishlist });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
    }
};
