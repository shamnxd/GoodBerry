const mongoose = require('mongoose');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const Variant = require('../../models/Variant');
const Coupon = require('../../models/Coupon');
const HTTP_STATUS = require('../../constants/statusCodes');
const MESSAGES = require('../../constants/messages');


const cartController = {
  // Get cart items
  getCart: async (req, res) => {
    try {
      const userId = req.user.id;

      const cart = await Cart.findOne({ userId })
      if (!cart) {
        return res.json([]);
      }

      const filteredItems = cart.items.filter(item => !item.productId.unListed);

      res.json(filteredItems);
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ERROR_FETCHING_CART_ITEMS });
    }
  },

  // Add item to cart
  addToCart: async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId, quantity, packageSize, flavor, name, image, price, salePrice } = req.body;

      if (!productId || !quantity || !packageSize) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: MESSAGES.MISSING_REQUIRED_FIELDS_PRODUCTID_QUANTITY_AND_PACKAGESIZE_ARE_REQUIRED
        });
      }

      const product = await Product.findOne({ _id: productId });
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: MESSAGES.PRODUCT_NOT_FOUND });
      }

      const variant = await Variant.findOne({ productId: productId, title : flavor, isListed: true });

      if (!variant) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          message: `Product variant not found for product ID: ${productId}` 
        });
      }

      const packSize = variant.packSizes.find(
        pack => pack.size === packageSize
      );
        

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        cart = new Cart({
          userId,
          items: []
        });
      }


      const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId &&
               item.packageSize === packageSize &&
               item.flavor === flavor  
      );

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        cart.items.push({
          productId,
          packageSize,
          quantity,
          flavor,
          name,
          image,
          price,
          salePrice
        });
      }

      await cart.save();

      res.json(cart.items);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ERROR_ADDING_ITEM_TO_CART });
    }
  },

  // Sync cart
  syncCart: async (req, res) => {
    const userId = req.user.id;
    const localCart = req.body;
  
    try {
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        cart = new Cart({
          userId,
          items: [],
        });
      }
  
      const serverCart = cart.items || [];

      localCart.forEach(localItem => {
        const existingItem = serverCart.find(
          item =>
            item.productId.toString() === localItem.productId &&
            item.packageSize === localItem.packageSize &&
            item.flavor === localItem.flavor
        );
  
        if (existingItem) {
          existingItem.quantity += localItem.quantity;
        } else {
          serverCart.push({
            ...localItem,
            productId: localItem.productId 
          });
        }
      });
  
      cart.items = serverCart;
      await cart.save();
  
      res.json(cart.items);
    } catch (error) {
      console.error('Error syncing cart:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.FAILED_TO_SYNC_CART });
    }
  },

  // Update item quantity
  updateQuantity: async (req, res) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const { quantity, packageSize, flavor } = req.body; 
  
      if (!quantity || !packageSize || !flavor) {  
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: MESSAGES.MISSING_REQUIRED_FIELDS_QUANTITY_PACKAGESIZE_AND_FLAVOR_ARE_REQUIRED
        });
      }
  
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: MESSAGES.CART_NOT_FOUND });
      }
  
      const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === itemId &&
          item.packageSize === packageSize &&
          item.flavor === flavor  
      );
  
      if (itemIndex === -1) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: MESSAGES.ITEM_NOT_FOUND_IN_CART });
      }

      // Stock check
      const variant = await Variant.findOne({ productId: itemId, title: flavor, isListed: true });
      if (variant) {
        const packSize = variant.packSizes.find(p => p.size === packageSize);
        if (packSize && quantity > packSize.quantity) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            error: `Only ${packSize.quantity} units available in stock.` 
          });
        }
      }
  
      cart.items[itemIndex].quantity = quantity;
      await cart.save();
  
      res.json(cart.items);
    } catch (error) {
      console.error('Update quantity error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ERROR_UPDATING_ITEM_QUANTITY });
    }
  },

  // Remove item from cart
 removeItem: async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { packageSize, flavor } = req.body; 

    if (!packageSize || !flavor) { 
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: MESSAGES.MISSING_REQUIRED_FIELDS_PACKAGESIZE_AND_FLAVOR
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: MESSAGES.CART_NOT_FOUND });
    }

    cart.items = cart.items.filter(
      item => !(item.productId.toString() === itemId &&
        item.packageSize === packageSize &&
        item.flavor === flavor)  
    );

    await cart.save();
    res.json({ itemId, packageSize, flavor }); 
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ERROR_REMOVING_ITEM_FROM_CART });
  }
},

  // Clear cart
  clearCart: async (req, res) => {
    try {
      const userId = req.user.id;
      const cart = await Cart.findOne({ userId });

      if (cart) {
        cart.items = [];
        await cart.save();
      }

      res.json({ message: MESSAGES.CART_CLEARED_SUCCESSFULLY });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ERROR_CLEARING_CART });
    }
  },

  // Unified Controller: checkQuantity (handles both single and bulk)
  checkQuantity: async (req, res) => {
    try {
      const { items, productId, packageSize, flavor } = req.body;
      
      // Determine if we are doing bulk or single
      const inputItems = items && Array.isArray(items) 
        ? items 
        : (productId ? [{ productId, packageSize, flavor }] : []);

      if (inputItems.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: MESSAGES.NO_ITEMS_PROVIDED_FOR_QUANTITY_CHECK });
      }

      const cart = req.user ? await Cart.findOne({ userId: req.user.id }) : null;

      const results = await Promise.all(inputItems.map(async (item) => {
        const { productId: pId, packageSize: pSize, flavor: fTitle } = item;
        
        try {
          const variant = await Variant.findOne({ productId: pId, title: fTitle, isListed: true });
          if (!variant) return { productId: pId, packageSize: pSize, flavor: fTitle, error: MESSAGES.VARIANT_NOT_FOUND };

          const packSize = variant.packSizes.find(pack => pack.size === pSize);
          if (!packSize) return { productId: pId, packageSize: pSize, flavor: fTitle, error: MESSAGES.PACKAGE_SIZE_NOT_FOUND };

          let currentCartQuantity = 0;
          if (cart) {
            const cartItem = cart.items.find(ci => 
              ci.productId.toString() === pId.toString() &&
              ci.packageSize === pSize &&
              ci.flavor === fTitle
            );
            if (cartItem) currentCartQuantity = cartItem.quantity;
          }

          return {
            productId: pId,
            packageSize: pSize,
            flavor: fTitle,
            quantity: packSize.quantity,
            availableQuantity: Math.max(0, packSize.quantity - currentCartQuantity),
            currentCartQuantity
          };
        } catch (err) {
          return { productId: pId, packageSize: pSize, flavor: fTitle, error: MESSAGES.INTERNAL_ERROR };
        }
      }));

      // Return array for bulk, single object for single request (if 'items' was not provided)
      if (items && Array.isArray(items)) {
        res.json(results);
      } else {
        res.json(results[0]);
      }
    } catch (error) {
      console.error('Check quantity error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.ERROR_CHECKING_QUANTITY });
    }
  }
};

module.exports = cartController;