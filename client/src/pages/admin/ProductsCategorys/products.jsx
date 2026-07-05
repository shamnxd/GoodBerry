import { useEffect, useState, useCallback, useRef } from "react";
import MESSAGES from '../../../constants/messages';
import AdminTable from "@/components/admin/AdminTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, unlistProduct } from "@/store/admin-slice";
import {
  addProductOffer,
  removeProductOffer,
} from "@/store/admin-slice/offer-slice";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, isLoading, totalPages, currentPage } = useSelector(
    (state) => state.admin
  );

  const searchInputRef = useRef(null);
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage] = useState(5);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [offerPercentage, setOfferPercentage] = useState(0);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [isUnlistDialogOpen, setIsUnlistDialogOpen] = useState(false);

  const loadProducts = useCallback(
    (page = 1) => {
      dispatch(
        fetchProducts({
          page,
          limit: itemsPerPage,
          search: debouncedSearch,
          status: statusFilter,
        })
      );
    },
    [dispatch, debouncedSearch, statusFilter, itemsPerPage]
  );

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  useEffect(() => {
    loadProducts(1);
  }, [debouncedSearch, statusFilter, loadProducts]);

  const handleUnlist = async () => {
    if (selectedProduct) {
      const data = await dispatch(unlistProduct(selectedProduct._id));

      if (data.payload.success) {
        toast({
          title: MESSAGES.SUCCESS,
          description: data.payload.message,
        });
        loadProducts(currentPage);
      } else {
        toast({
          title: MESSAGES.ERROR,
          description: data.payload.message || "Failed to update product status",
          variant: "destructive",
        });
      }
      setSelectedProduct(null);
      setIsUnlistDialogOpen(false);
    }
  };

  const handleAddOffer = async () => {
    if (selectedProduct) {
      const parsedOffer = parseInt(offerPercentage, 10);
      if (!offerPercentage || isNaN(parsedOffer) || parsedOffer <= 0 || parsedOffer > 99) {
        toast({
          title: MESSAGES.ERROR,
          description: "Offer percentage must be a number between 1 and 99",
          variant: "destructive",
        });
        return;
      }
      const data = await dispatch(
        addProductOffer({ productId: selectedProduct._id, offerPercentage: parsedOffer })
      );

      if (data.payload.success) {
        toast({
          title: MESSAGES.SUCCESS,
          description: data.payload.message,
        });
        loadProducts(currentPage);
      } else {
        toast({
          title: MESSAGES.ERROR,
          description: data.payload.message || "Failed to add offer",
          variant: "destructive",
        });
      }
      setSelectedProduct(null);
      setIsOfferDialogOpen(false);
    }
  };

  const handleRemoveOffer = async () => {
    if (selectedProduct) {
      const data = await dispatch(
        removeProductOffer({ productId: selectedProduct._id })
      );

      if (data.payload.success) {
        toast({
          title: MESSAGES.SUCCESS,
          description: data.payload.message,
        });
        loadProducts(currentPage);
      } else {
        toast({
          title: MESSAGES.ERROR,
          description: data.payload.message || "Failed to remove offer",
          variant: "destructive",
        });
      }
      setSelectedProduct(null);
      setIsOfferDialogOpen(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadProducts(newPage);
  };

  return (
    <div className="p-4 space-y-8">
      <AdminTable
        title="Products"
        searchPlaceholder="Search products..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        addButtonText="Add Product"
        onAddClick={() => navigate("/admin/products/add")}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={[
          { label: "All Statuses", value: "all" },
          { label: "Listed", value: "listed" },
          { label: "Unlisted", value: "unlisted" }
        ]}
        headers={[
          { label: "No", className: "w-[80px] pl-6" },
          { label: "Name" },
          { label: "Price" },
          { label: "Variants" },
          { label: "Stock" },
          { label: "Categories" },
          { label: "List/Unlist" },
          { label: "Offer" },
          { label: "Action", className: "text-right pr-6" }
        ]}
        data={products}
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange
        }}
        renderRow={(product, index) => (
          <TableRow key={product._id} className="h-16 border-b border-slate-100">
            <TableCell className="py-3 px-4 pl-6 font-medium text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
            <TableCell className="py-3 px-4">
              <div className="flex items-center gap-3">
                <img
                  src={product.image || ""}
                  alt={product.name || "Product Image"}
                  className="h-12 w-12 rounded-lg border p-1"
                />
                <span className="font-semibold text-slate-800">{product.name || "N/A"}</span>
              </div>
            </TableCell>
            <TableCell className="py-3 px-4 font-semibold text-slate-700">
              ₹{product.price || 0}
            </TableCell>
            <TableCell className="py-3 px-4">
              <div className="flex flex-col">
                <span className="font-medium text-green-600">{product.activeVariantCount || 0} Active</span>
                <span className="text-xs text-slate-400">{product.variantCount || 0} Total</span>
              </div>
            </TableCell>
            <TableCell className="py-3 px-4">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  product.totalStock < 1
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {product.totalStock || 0}
              </span>
            </TableCell>
            <TableCell className="py-3 px-4 text-slate-600">
              {product.category?.name || "N/A"}
            </TableCell>
            <TableCell className="py-3 px-4">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  product.unListed
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {product.unListed ? "Unlisted" : "Listed"}
              </span>
            </TableCell>
            <TableCell className="py-3 px-4">
              {product.offerPercentage > 0 ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  {product.offerPercentage}%
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                  No Offer
                </Badge>
              )}
            </TableCell>
            <TableCell className="py-3 px-4 text-right pr-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      navigate(`/admin/products/edit/${product._id}`)
                    }
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsUnlistDialogOpen(true);
                    }}
                    className={
                      product.unListed ? "text-green-500" : "text-red-500"
                    }
                  >
                    {product.unListed ? "List" : "Unlist"}
                  </DropdownMenuItem>
                  {product.offerPercentage > 0 ? (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsOfferDialogOpen(true);
                      }}
                    >
                      Remove Offer
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-green-600"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsOfferDialogOpen(true);
                      }}
                    >
                      Add Offer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        )}
      />

      {selectedProduct && isOfferDialogOpen && (
        <Dialog
          open={isOfferDialogOpen}
          onOpenChange={() => setIsOfferDialogOpen(false)}
        >
          <DialogTrigger />
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="mb-3">
                {selectedProduct.offerPercentage > 0
                  ? "Remove Offer"
                  : "Add Offer"}
              </DialogTitle>
              <DialogDescription>
                {selectedProduct.offerPercentage > 0 ? (
                  <>
                    Are you sure you want to remove the offer from this product?
                    <DialogFooter className={"mt-5"}>
                      <Button
                        variant="outline"
                        onClick={() => setIsOfferDialogOpen(false)}
                      >
                        No, keep it
                      </Button>
                      <Button variant="default" onClick={handleRemoveOffer}>
                        Yes, remove offer
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <p className="mb-5 text-md">Enter the offer percentage for this product:</p>
                    <Input
                      type="number"
                      placeholder="Enter offer percentage"
                      value={offerPercentage}
                      min="1"
                      max="99"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 99)) {
                          setOfferPercentage(value);
                        }
                      }}
                    />
                    <DialogFooter className={"mt-7"}>
                      <Button
                        variant="outline"
                        onClick={() => setIsOfferDialogOpen(false)}
                      >
                        No, keep it
                      </Button>
                      <Button variant="default" onClick={handleAddOffer}>
                        Yes, add offer
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {selectedProduct && isUnlistDialogOpen && (
        <Dialog
          open={isUnlistDialogOpen}
          onOpenChange={() => setIsUnlistDialogOpen(false)}
        >
          <DialogTrigger />
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="mb-3">Confirm Action</DialogTitle>
              <DialogDescription>
                Are you sure you want to{" "}
                {selectedProduct.unListed ? "list" : "unlist"} this product?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUnlistDialogOpen(false)}
              >
                No, keep it
              </Button>
              <Button variant="default" onClick={handleUnlist}>
                Yes,
                {selectedProduct.unListed ? " list" : " unlist"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
