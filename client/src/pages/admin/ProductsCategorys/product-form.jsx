import { useEffect, useState } from "react";
import { X, Plus, Trash, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import MESSAGES from '../../../constants/messages';
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useDispatch, useSelector } from "react-redux";
import {
  addProduct,
  getAllCategories,
  uploadToCloudinary,
  editProduct,
  getProductDetails,
} from "@/store/admin-slice";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import ImageCropDialog from "@/components/ui/image-crop";

export default function ProductForm() {
  const { id } = useParams();
  const { categories } = useSelector((state) => state.admin);
  const dispatch = useDispatch();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [variants, setVariants] = useState([]);
  const [packSizes, setPackSizes] = useState(["300ml", "500ml", "850ml"]);
  const [newPackSize, setNewPackSize] = useState("");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getAllCategories());

    if (id) {
      const fetchProduct = async () => {
        const result = await dispatch(getProductDetails(id));
        if (result.payload?.success) {
          const { product, variants } = result.payload;

          setName(product.name);
          setDescription(product.description);
          setSelectedCategory(product.category);
          setIsFeatured(product.isFeatured);

          const transformedVariants = variants.map((variant) => ({
            _id: variant._id,
            title: variant.title,
            description: variant.description,
            isListed: variant.isListed !== false, 
            images: variant.images.map((url) => ({
              preview: url,
              cloudinaryUrl: url,
              uploading: false,
            })),
            packSizes: variant.packSizes || [],
          }));

          // Dynamically gather all unique pack sizes from the variants
          const uniqueSizes = new Set(["300ml", "500ml", "850ml"]);
          variants.forEach((v) => {
            if (v.packSizes) {
              v.packSizes.forEach((p) => {
                if (p.size) uniqueSizes.add(p.size);
              });
            }
          });
          setPackSizes(Array.from(uniqueSizes));

          setVariants(transformedVariants);
        }
      };

      fetchProduct();
    }
  }, [dispatch, id]);

  const availableCategories = categories.filter(
    (category) => category.status === "Active"
  );

  const filteredCategories = availableCategories.filter((category) =>
    category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        _id: null, 
        title: "",
        description: "",
        isListed: true,
        images: [],
        packSizes: [],
      },
    ]);
  };

  const handleUpdateVariant = (index, field, value) => {
    setVariants((prev) => {
      const updatedVariants = [...prev];
      updatedVariants[index][field] = value;
      return updatedVariants;
    });
  };

  const handleUpdatePackSizePrice = (variantIndex, packSize, field, value) => {
    setVariants((prev) => {
      const updatedVariants = [...prev];
      const variant = updatedVariants[variantIndex];
  
      const existingPriceIndex = variant.packSizes.findIndex(
        (p) => p.size === packSize
      );
  
      if (existingPriceIndex >= 0) {
        variant.packSizes[existingPriceIndex][field] = value;
      } else {
        variant.packSizes.push({
          size: packSize,
          [field]: value,
          price: field === "price" ? value : "",
          salePrice: field === "salePrice" ? value : "",
          quantity: field === "quantity" ? value : "",
        });
      }
  
      return updatedVariants;
    });
  };

  const handleRemoveVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTogglePackSize = (variantIndex, size) => {
    setVariants((prev) => {
      const updatedVariants = [...prev];
      const variant = updatedVariants[variantIndex];
      const isSelected = variant.packSizes.some((p) => p.size === size);

      if (isSelected) {
        variant.packSizes = variant.packSizes.filter((p) => p.size !== size);
      } else {
        variant.packSizes.push({
          size: size,
          price: "",
          salePrice: "",
          quantity: "",
        });
      }

      return updatedVariants;
    });
  };

  const handleAddPackSize = () => {
    if (newPackSize && !packSizes.includes(newPackSize)) {
      setPackSizes((prev) => [...prev, newPackSize]);
      setNewPackSize("");
    }
  };

  const handleImageUpload = async (e, variantIndex) => {
    const files = e.target.files;

    if (
      variants[variantIndex].images &&
      variants[variantIndex].images.length >= 4
    ) {
      toast({
        title: MESSAGES.YOU_CAN_ONLY_UPLOAD_MAXIMUM_4_IMAGES,
        variant: "destructive",
      });
      return;
    }

    if (files && files[0]) {
      setCurrentVariantIndex(variantIndex);
      const imageUrl = URL.createObjectURL(files[0]);
      setCurrentImage(imageUrl);
      setCropDialogOpen(true);
    }
  };

  const handleCroppedImage = async (croppedFile) => {
    try {
      const previewUrl = URL.createObjectURL(croppedFile);

      setVariants((prev) => {
        const updatedVariants = [...prev];
        updatedVariants[currentVariantIndex].images = [
          ...(updatedVariants[currentVariantIndex].images || []),
          { preview: previewUrl, uploading: true },
        ].slice(0, 4);
        return updatedVariants;
      });

      const data = await dispatch(uploadToCloudinary(croppedFile));

      if (!data.payload || !data.payload.url) {
        toast({
          title: MESSAGES.FAILED_TO_UPLOAD_IMAGE_PLEASE_TRY_AGAIN,
          variant: "destructive",
        });
        return;
      }

      const cloudinaryUrl = data.payload.url;

      setVariants((prev) => {
        const updatedVariants = [...prev];
        const currentImages = updatedVariants[currentVariantIndex].images;
        const imageIndex = currentImages.findIndex(
          (img) => img.preview === previewUrl
        );

        if (imageIndex !== -1) {
          currentImages[imageIndex] = {
            preview: cloudinaryUrl,
            uploading: false,
            cloudinaryUrl,
          };
        }

        return updatedVariants;
      });
    } catch (error) {
      console.error("Error handling cropped image:", error);
      toast({
        title: MESSAGES.FAILED_TO_PROCESS_IMAGE_PLEASE_TRY_AGAIN,
        variant: "destructive",
      });
    }
  };

  const handleRemoveImage = (variantIndex, imgIndex) => {
    setVariants((prev) => {
      const updatedVariants = [...prev];
      updatedVariants[variantIndex].images = updatedVariants[
        variantIndex
      ].images.filter((_, i) => i !== imgIndex);
      return updatedVariants;
    });
  };

  const checkValidation = (e) => {
    e.preventDefault();

    const hasListedVariant = variants.some((v) => v.isListed);
    if (!hasListedVariant) {
      toast({
        title: "At least one variant must be listed (visible) for the product.",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (
        !variant.title ||
        !variant.description ||
        variant.packSizes.length === 0 ||
        variant.images.length === 0
      ) {
        toast({
          title: `Please fill in all required fields for variant ${i + 1}`,
          variant: "destructive",
        });
        return;
      }

      // Validate prices for each selected pack size
      for (const pack of variant.packSizes) {
        if (
          pack.price === "" ||
          pack.price === undefined ||
          pack.quantity === "" ||
          pack.quantity === undefined
        ) {
          toast({
            title: `Please set price and quantity for ${pack.size} in variant ${i + 1}`,
            variant: "destructive",
          });
          return;
        }

        const price = parseFloat(pack.price);
        const quantity = parseInt(pack.quantity);

        if (quantity < 0) {
          toast({
            title: MESSAGES.QUANTITY_SHOULD_BE_GREATER_THAN_0,
            variant: "destructive",
          });
          return;
        }

        if (price < 0) {
          toast({
            title: MESSAGES.PRICE_SHOULD_BE_GREATER_THAN_0,
            variant: "destructive",
          });
          return;
        }
      }
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    const formData = {
      name,
      description,
      isFeatured,
      category: selectedCategory,
      variants: variants.map((variant) => ({
        _id: variant._id,
        title: variant.title,
        description: variant.description,
        isListed: variant.isListed, // Send isListed
        images: variant.images
          .filter((img) => !img.uploading)
          .map((img) => img.cloudinaryUrl),
        packSizes: variant.packSizes,
      })),
    };

    try {
      const action = id
        ? editProduct({ ...formData, id })
        : addProduct(formData);
      const data = await dispatch(action);

      if (data.payload?.success) {
        toast({
          title: data.payload.message,
        });
        navigate(-1);
      } else {
        toast({
          title: data.payload?.message || "Operation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: MESSAGES.AN_ERROR_OCCURRED,
        variant: "destructive",
      });
    }
  };

  const renderPackSizes = (variant, variantIndex) => (
    <div className="mt-4">
      <Label>Pack Size Pricing and Quantity</Label>
      <div className="grid gap-4 mt-2">
        {variant.packSizes.map((pack) => {
          const size = pack.size;
          return (
            <div
              key={size}
              className="grid sm:grid-cols-3 gap-4 p-4 border rounded" 
            >
              <div>
                <Label>{size} - Regular Price</Label>
                <Input
                  type="number"
                  value={pack.price || ""}
                  onChange={(e) =>
                    handleUpdatePackSizePrice(
                      variantIndex,
                      size,
                      "price",
                      e.target.value
                    )
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{size} - Sale Price</Label>
                <Input
                  type="number"
                  value={pack.salePrice || ""}
                  onChange={(e) =>
                    handleUpdatePackSizePrice(
                      variantIndex,
                      size,
                      "salePrice",
                      e.target.value
                    )
                  }
                  className="mt-1"
                  disabled
                />
              </div>

              <div>
                <Label>{size} - Quantity</Label>
                <Input
                  type="number"
                  value={pack.quantity || ""}
                  onChange={(e) =>
                    handleUpdatePackSizePrice(
                      variantIndex,
                      size,
                      "quantity",
                      e.target.value
                    )
                  }
                  className="mt-1"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex justify-center">
      <div className="w-full max-w-[1200px] bg-white rounded-lg shadow-sm">
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl font-semibold mb-6">
            {id ? "Edit Product" : "Add Product"}
          </h1>

          <div className="grid gap-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="category"
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCategoryPopoverOpen}
                      className="w-full justify-between mt-1 font-normal text-left"
                    >
                      {selectedCategory
                        ? availableCategories.find(
                            (category) => category._id === selectedCategory
                          )?.name || "Select a category"
                        : "Select a category"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[100] max-h-[300px] flex flex-col bg-white border border-gray-200 rounded-md shadow-lg" align="start">
                    <div className="p-2 border-b border-gray-100">
                      <Input
                        placeholder="Search category..."
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        className="h-8 w-full"
                      />
                    </div>
                    <div className="overflow-y-auto max-h-[220px] p-1 flex-1">
                      {filteredCategories.length === 0 ? (
                        <p className="text-sm text-gray-500 p-2 text-center">No category found.</p>
                      ) : (
                        filteredCategories.map((category) => (
                          <button
                            key={category._id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(category._id);
                              setIsCategoryPopoverOpen(false);
                              setCategorySearchTerm("");
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between hover:bg-gray-100 transition-colors",
                              selectedCategory === category._id && "bg-gray-50 font-medium text-primary"
                            )}
                          >
                            <span>{category.name}</span>
                            {selectedCategory === category._id && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="Featured"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
              />
              <Label htmlFor="Featured">Featured Product</Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-medium">
                  Variants (Flavors)
                </Label>
                <Button variant="outline" size="sm" onClick={handleAddVariant}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variant
                </Button>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {variants.map((variant, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className={!variant.isListed ? "text-gray-400" : ""}>
                      {variant.title || `Variant ${index + 1}`} {!variant.isListed && <span className="ml-2 text-xs font-normal text-red-500">(Unlisted)</span>}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 mx-1">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`variant-title-${index}`}>
                              Title
                            </Label>
                            <Input
                              id={`variant-title-${index}`}
                              value={variant.title}
                              onChange={(e) =>
                                handleUpdateVariant(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                              className="mt-1"
                            />
                          </div>

                        </div>
                        <div>
                          <Label htmlFor={`variant-description-${index}`}>
                            Description
                          </Label>
                          <Textarea
                            id={`variant-description-${index}`}
                            value={variant.description}
                            onChange={(e) =>
                              handleUpdateVariant(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="mt-1"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label>Pack Sizes</Label>
                          <div className="grid sm:grid-cols-4 gap-4 mt-2">
                            {packSizes.map((size) => (
                              <div
                                key={size}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`pack-size-${index}-${size}`}
                                  checked={variant.packSizes?.some(
                                    (p) => p.size === size
                                  )}
                                  onCheckedChange={() =>
                                    handleTogglePackSize(index, size)
                                  }
                                />
                                <Label htmlFor={`pack-size-${index}-${size}`}>
                                  {size}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center space-x-2">
                            <Input
                              placeholder="Add new pack size"
                              value={newPackSize}
                              onChange={(e) => setNewPackSize(e.target.value)}
                              className="mt-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleAddPackSize}
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* Pack Size Pricing Section */}
                        {renderPackSizes(variant, index)}

                        <div>
                          <Label>Images (Max: 4)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, index)}
                            className="mt-1"
                          />
                          <div className="flex space-x-2 mt-2">
                            {variant.images?.map((img, i) => (
                              <div key={i} className="relative w-20 h-20">
                                <img
                                  src={img.preview}
                                  alt="Preview"
                                  className={`object-cover w-full h-full rounded ${
                                    img.uploading ? "opacity-50" : ""
                                  }`}
                                />
                                {img.uploading && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                                  </div>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                  onClick={() => handleRemoveImage(index, i)}
                                  disabled={img.uploading}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end mt-6">
                          {variant._id ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`w-[180px] ${variant.isListed ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                              onClick={() => handleUpdateVariant(index, "isListed", !variant.isListed)}
                            >
                              {variant.isListed ? "Unlist Variant" : "List Variant"}
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-[180px]"
                              onClick={() => handleRemoveVariant(index)}
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Remove Variant
                            </Button>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <Button className="mt-6" onClick={checkValidation}>
                {id ? "Update Product" : "Add Product"}
              </Button>
            </div>
          </div>
        </div>
        <ImageCropDialog
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setCurrentImage(null);
          }}
          image={currentImage}
          onCropComplete={handleCroppedImage}
        />
      </div>
    </div>
  );
}
