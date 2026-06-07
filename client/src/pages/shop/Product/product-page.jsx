import MESSAGES from '../../../constants/messages';
import {

  AlertTriangle,
  Check,
  Copy,
  Heart,
  Maximize,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProductDetails from "./product-details";
import RelatedProducts from "./related-products";
import { useDispatch, useSelector } from "react-redux";
import {
  getSingleProduct,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "@/store/shop-slice";
import ZoomImage from "@/components/ui/zoom-image";
import { Skeleton } from "@/components/ui/skeleton";
import CartSidebar from "../cart/cart-sidebar";
import { addToCart, checkQuantity } from "@/store/shop-slice/cart-slice";

export default function ProductPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getSingleProduct(id));
    dispatch(getWishlist());
  }, [dispatch, id]);

  const { user } = useSelector((state) => state.auth);
  const { product, pflavors, recomentedProds, wishlist, error } = useSelector(
    (state) => state.shop
  );
  const { items: cartItems } = useSelector((state) => state.cart);

  const flavors = pflavors || {};
  const flavorKeys = Object.keys(flavors);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialFlavor = searchParams.get("flavor");
  const initialSize = searchParams.get("size");

  const [selectedFlavor, setSelectedFlavor] = useState(initialFlavor || flavorKeys[0] || "");
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [packageSize, setPackageSize] = useState(initialSize || "");
  const [currentPrice, setCurrentPrice] = useState({
    price: 0,
    salePrice: 0,
  });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  const flavor = flavorKeys.length > 0 ? (flavors[selectedFlavor] || flavors[flavorKeys[0]]) : null;

  const calculateDiscount = (originalPrice, salePrice) => {
    if (!originalPrice || !salePrice) return 0;
    const discount = Math.round(
      ((originalPrice - salePrice) / originalPrice) * 100
    );
    return discount > 0 ? discount : 0;
  };

  const calculateStockStatus = (flavor, packageSize) => {
    if (!flavor || !flavor.packSizes) {
      return { status: "OUT STOCK", color: "text-red-600 border-red-600" };
    }
    const pack = flavor.packSizes.find((p) => p.size === packageSize);
    if (pack && pack.quantity > 0) {
      if (pack.quantity < 20) {
        return {
          status: `Limited Stock (${pack.quantity})`,
          color: "text-yellow-600 border-yellow-600",
        };
      }
      return { status: "IN STOCK", color: "text-[#8CC63F] border-[#8CC63F]" };
    }
    return { status: "OUT STOCK", color: "text-red-600 border-red-600" };
  };

  // Sync URL parameters to state and update pricing
  useEffect(() => {
    if (flavorKeys.length > 0) {
      const currentFlavorKey = selectedFlavor && flavors[selectedFlavor] ? selectedFlavor : flavorKeys[0];
      const currentFlavor = flavors[currentFlavorKey];
      
      const currentSize = packageSize && currentFlavor.packageSizes.includes(packageSize) 
        ? packageSize 
        : (currentFlavor.packSizes.find(p => p.quantity > 0)?.size || currentFlavor.packageSizes[0]);

      if (selectedFlavor !== currentFlavorKey) setSelectedFlavor(currentFlavorKey);
      if (packageSize !== currentSize) setPackageSize(currentSize);
      if (!selectedImage) setSelectedImage(currentFlavor.images[0]);

      const pricing = currentFlavor.packSizes.find(p => p.size === currentSize);
      setCurrentPrice({
        price: pricing?.price || 0,
        salePrice: pricing?.salePrice || 0,
      });

      // Update URL params
      setSearchParams({ flavor: currentFlavorKey, size: currentSize }, { replace: true });
    }
  }, [pflavors, selectedFlavor, packageSize, setSearchParams]);

  useEffect(() => {
    const checkAvailableQuantity = async () => {
      if (product?._id && flavor?.title && packageSize) {
        try {
          const response = await dispatch(
            checkQuantity({
              productId: product._id,
              packageSize,
              flavor: flavor.title,
            })
          ).unwrap();
          // Backend returns both:
          // - quantity: total stock for this pack
          // - availableQuantity: remaining stock after considering current cart items
          setAvailableQuantity(
            response.data?.availableQuantity ?? response.data?.quantity ?? 0
          );
        } catch (error) {
          console.error("Error checking quantity:", error);
        }
      }
    };

    checkAvailableQuantity();
  }, [product?._id, packageSize, flavor?.title, dispatch]);

  const handleFlavorChange = (value) => {
    setSelectedFlavor(value);
    setSelectedImage(flavors[value]?.images[0]);
    
    // Find first available size for this new flavor, or fallback to first size
    const availablePack = flavors[value]?.packSizes.find(p => p.quantity > 0);
    const newPackageSize = availablePack ? availablePack.size : flavors[value]?.packageSizes[0];
    
    setPackageSize(newPackageSize);

    const newPricing = flavors[value]?.packSizes.find(
      (p) => p.size === newPackageSize
    );
    setCurrentPrice({
      price: newPricing?.price || 0,
      salePrice: newPricing?.salePrice || 0,
    });
  };

  const handlePackageSizeChange = (size) => {
    setPackageSize(size);
    const newPricing = flavor?.packSizes.find((p) => p.size === size);
    setCurrentPrice({
      price: newPricing?.price || 0,
      salePrice: newPricing?.salePrice || 0,
    });
  };

  const handleAddToCart = async () => {
    const cartItem = cartItems.find(
      (item) =>
        item.productId === product._id &&
        item.packageSize === packageSize &&
        item.flavor === flavor?.title
    );

    const currentCartQuantity = cartItem ? cartItem.quantity : 0;
    const totalQuantity = currentCartQuantity + quantity;

    if (totalQuantity > 5) {
      toast({
        title: MESSAGES.QUANTITY_LIMIT_REACHED,
        description: `You already have ${currentCartQuantity} items in cart. Maximum limit is 5 items.`,
      });
      return;
    }

    // `availableQuantity` is "remaining after cart", so compare only the NEW qty being added
    if (quantity > availableQuantity) {
      toast({
        title: MESSAGES.QUANTITY_LIMIT_REACHED,
        description: `Only ${availableQuantity} items are available in stock.`,
      });
      return;
    }

    setIsAddingToCart(true);
    const newCartItem = {
      ...(user && { userId: user._id }),
      productId: product._id,
      name: product.name,
      flavor: flavor?.title,
      packageSize,
      quantity,
      price: currentPrice.price,
      salePrice: currentPrice.salePrice,
      image: selectedImage,
    };

    try {
      await dispatch(addToCart(newCartItem)).unwrap();

      const response = await dispatch(
        checkQuantity({
          productId: product._id,
          packageSize,
          flavor: flavor?.title,
        })
      ).unwrap();

      setAvailableQuantity(
        response.data?.availableQuantity ?? response.data?.quantity ?? 0
      );
      setIsAddingToCart(false);
      setAddedToCart(true);
      setIsCartOpen(true);

      toast({
        title: MESSAGES.SUCCESS,
        description: MESSAGES.PRODUCT_ADDED_TO_CART_SUCCESSFULLY,
      });

      setTimeout(() => setAddedToCart(false), 2000);
    } catch (err) {
      setIsAddingToCart(false);
      toast({
        variant: "destructive",
        title: MESSAGES.ERROR + err,
        description: MESSAGES.FAILED_TO_ADD_PRODUCT_TO_CART_PLEASE_TRY_AGAIN,
      });
    }
  };

  const handleQuantityChange = async (action) => {
    const currentQuantity = quantity;
    const newQuantity =
      action === "increase" ? currentQuantity + 1 : currentQuantity - 1;

    if (newQuantity <= 0) return;

    const cartItem = cartItems.find(
      (item) =>
        item.productId === product._id &&
        item.packageSize === packageSize &&
        item.flavor === flavor?.title
    );

    const currentCartQuantity = cartItem ? cartItem.quantity : 0;
    const totalQuantity = currentCartQuantity + newQuantity;

    if (totalQuantity > 5) {
      toast({
        title: MESSAGES.QUANTITY_LIMIT_REACHED,
        description: MESSAGES.YOU_CAN_ONLY_ADD_A_MAXIMUM_OF_5_ITEMS_TO_THE_CART,
      });
      return;
    }

    if (newQuantity > availableQuantity) {
      toast({
        title: MESSAGES.QUANTITY_LIMIT_REACHED,
        description: `Only ${availableQuantity} items are available in stock.`,
      });
      return;
    }

    setQuantity(newQuantity);
  };

  const isInWishlist =
    flavor &&
    wishlist.some(
      (item) => item.productId === product._id && item.variantId === flavor._id
    );

  const handleWishlistToggle = async () => {
    if (!user) {
      toast({
        title: MESSAGES.PLEASE_LOGIN_TO_ADD_TO_WISHLIST,
        description: MESSAGES.YOU_MUST_BE_LOGGED_IN_TO_ADD_ITEMS_TO_YOUR_WISHLIST,
      });
      return navigate("/auth/login");
    }
    try {
      if (isInWishlist) {
        await dispatch(
          removeFromWishlist({ productId: product._id, variantId: flavor._id })
        );
        toast({
          title: MESSAGES.SUCCESS,
          description: MESSAGES.PRODUCT_REMOVED_FROM_WISHLIST,
        });
      } else {
        await dispatch(
          addToWishlist({ productId: product._id, variantId: flavor._id })
        );
        toast({
          title: MESSAGES.SUCCESS,
          description: MESSAGES.PRODUCT_ADDED_TO_WISHLIST,
        });
      }
      await dispatch(getWishlist());
    } catch (error) {
      toast({
        variant: "destructive",
        title: error,
        description: MESSAGES.FAILED_TO_UPDATE_WISHLIST_PLEASE_TRY_AGAIN,
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        description: MESSAGES.LINK_COPIED_TO_CLIPBOARD,
      });
      setShareDialogOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: err,
        description: MESSAGES.FAILED_TO_COPY_LINK_PLEASE_TRY_AGAIN,
      });
    }
  };

  useEffect(() => {
    if (id && (!currentPrice.price || !currentPrice.salePrice)) {
      dispatch(getSingleProduct(id));
    }
  }, [id, dispatch, currentPrice.price, currentPrice.salePrice]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
          <h1 className="text-3xl font-bold">Product Not Found</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t find the product you&apos;re looking for.
          </p>
          <Button asChild>
            <Link to="/shop">Return to Shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!product || Object.keys(product).length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 mt-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          <Skeleton className="h-[300px] w-full lg:h-[450px] lg:w-[450px] rounded-xl" />
          <div className="flex flex-col gap-4 w-full lg:w-[450px]">
            <div className="flex flex-row gap-4">
              <Skeleton className="h-[70px] w-[70px] lg:h-[90px] lg:w-[100px]" />
              <Skeleton className="h-[70px] w-[70px] lg:h-[90px] lg:w-[100px]" />
              <Skeleton className="h-[70px] w-[70px] lg:h-[90px] lg:w-[100px]" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-3 h-[100px] lg:h-[150px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  const discountPercentage = calculateDiscount(
    currentPrice.price,
    currentPrice.salePrice
  );

  const stockStatus = calculateStockStatus(flavor, packageSize);

  return (
    <div className="container product-page mx-auto px-4 py-6 lg:py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground font-semibold">
          Home
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-foreground font-semibold">
          Shop
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{product?.name}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 md:grid-cols-2">
        {/* Product Images */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Main Image */}
          <div
            className="relative flex-1 order-1 lg:order-2"
            style={{ maxHeight: "350px" }}
          >
            <div
              className="relative aspect-square overflow-hidden rounded-lg border bg-white"
              style={{ maxWidth: "500px" }}
            >
              <ZoomImage
                src={selectedImage}
                className="object-contain p-4 w-full h-full"
              />
              {discountPercentage > 0 && (
                <div
                  className="absolute top-0 right-0 flex items-center justify-center mt-5 mr-5 rounded-full bg-[#83ac2b]"
                  style={{ width: "50px", height: "50px" }}
                >
                  <span className="text-base text-white">
                    -{discountPercentage}%
                  </span>
                </div>
              )}
              <button
                className="absolute bottom-4 right-4 rounded-lg bg-white/80 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-white"
                onClick={() => {
                  console.log("View in full screen");
                }}
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex lg:flex-col gap-5 order-2 lg:order-1">
            {flavor &&
              flavor.images.map((image, i) => (
                <button
                  key={i}
                  className={cn(
                    "relative h-20 w-20 flex-shrink-0 rounded-lg border bg-white",
                    selectedImage === image && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image}
                    alt={`${flavor?.title} thumbnail ${i + 1}`}
                    className="object-cover rounded-md"
                  />
                </button>
              ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-medium">{product?.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {flavor?.title.toUpperCase()} STYLE FLAVOR
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium text-[#8CC63F]">
              ₹{currentPrice?.salePrice?.toFixed(2)}
            </span>
            {currentPrice?.price > currentPrice?.salePrice && (
              <span className="text-sm text-muted-foreground line-through">
                ₹{currentPrice?.price?.toFixed(2)}
              </span>
            )}
            <span
              className={`ml-4 text-sm ${stockStatus?.color} border px-3 py-1 rounded-full`}
            >
              {stockStatus?.status}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">{flavor?.description}</p>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium">Flavor:</div>
              <div className="flex flex-wrap gap-3">
                {flavorKeys.map((flavorKey) => (
                  <button
                    key={flavorKey}
                    onClick={() => handleFlavorChange(flavorKey)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-all",
                      selectedFlavor === flavorKey
                        ? "border-[#8CC63F] bg-[#8CC63F]/10 text-[#8CC63F]"
                        : "hover:bg-muted border-input"
                    )}
                  >
                    {flavors[flavorKey]?.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Package size:</div>
              <div className="flex flex-wrap gap-3">
                {flavor &&
                  flavor.packageSizes.map((size) => {
                    const pricing = flavor.packSizes.find((p) => p.size === size);
                    const isOutOfStock = !pricing || pricing.quantity <= 0;

                    return (
                      <button
                        key={size}
                        onClick={() => handlePackageSizeChange(size)}
                        disabled={isOutOfStock}
                        className={cn(
                          "relative rounded-md border px-4 py-2 text-sm transition-all overflow-hidden",
                          packageSize === size
                            ? "border-[#8CC63F] bg-[#8CC63F]/10 text-[#8CC63F]"
                            : "hover:bg-muted font-medium",
                          isOutOfStock && "opacity-50 cursor-not-allowed grayscale-[0.5]"
                        )}
                      >
                        {size}
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                             <div className="w-[150%] h-[2px] bg-red-500 -rotate-[25deg] absolute" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-md border">
                <button
                  className="px-3 py-2 hover:bg-muted"
                  onClick={() => handleQuantityChange("decrease")}
                >
                  -
                </button>
                <span className="w-12 text-center">{quantity}</span>
                <button
                  className="px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => handleQuantityChange("increase")}
                  disabled={quantity >= availableQuantity}
                >
                  +
                </button>
              </div>
              <Button
                className="bg-[#8CC63F] px-8 hover:bg-[#7AB32F] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleAddToCart}
                disabled={
                  isAddingToCart ||
                  addedToCart ||
                  stockStatus.status === "OUT STOCK" ||
                  quantity > availableQuantity ||
                  quantity > 5
                }
              >
                {isAddingToCart ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Adding...
                  </div>
                ) : addedToCart ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Added!
                  </div>
                ) : (
                  "ADD TO CART"
                )}
              </Button>
            </div>

            <Button
              className="flex items-center gap-2 p-0 bg-transparent hover:bg-transparent text-sm text-black transition-colors"
              onClick={handleWishlistToggle}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  isInWishlist ? "fill-red-500 text-red-500" : "text-gray-500"
                )}
              />
              {isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            </Button>

            <div className="flex items-center gap-2 text-sm" style={{marginTop: "0px"}}>
              <span className="font-medium">Category:</span>
              <Link
                to="/category/ice-cream"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {product?.category?.name}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[92vw] rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Share product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Copy the link below to share this product with others.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2.5 w-full overflow-x-auto whitespace-nowrap no-scrollbar">
                <span className="text-sm text-muted-foreground">
                  {window.location.href}
                </span>
              </div>
              <Button 
                type="button" 
                className="w-full bg-[#8CC63F] hover:bg-[#7AB32F] text-white font-medium py-6"
                onClick={handleCopyLink}
              >
                Copy Link <Copy className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProductDetails description={product?.description} />
      <RelatedProducts products={recomentedProds} id={product?._id} />

      <CartSidebar isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
    </div>
  );
}
