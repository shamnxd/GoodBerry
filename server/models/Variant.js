const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  images: [String],
  packSizes: [{
    size: String,
    price: Number,
    salePrice: Number,
    quantity: Number
  }],
  isListed: {
    type: Boolean,
    default: true
  }
});

variantSchema.pre('save', async function(next) {
  try {
    const product = await mongoose.model('Product').findById(this.productId).populate('category');
    const productOffer = product?.offerPercentage || 0;
    const categoryOffer = product?.category?.offerPercentage || 0;
    const bestOffer = Math.max(productOffer, categoryOffer);
    
    this.packSizes = (this.packSizes || []).map(pack => {
      const discount = (pack.price * bestOffer) / 100;
      pack.salePrice = pack.price - discount;
      return pack;
    });
  } catch (error) {
    console.error("Error in variant pre-save hook:", error);
  }

  next();
});

module.exports = mongoose.model("Variant", variantSchema);
