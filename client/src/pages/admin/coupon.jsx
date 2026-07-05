import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm, Controller } from "react-hook-form";
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import MESSAGES from '../../constants/messages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchCoupons, addCoupon, updateCoupon, toggleCouponStatus } from "@/store/admin-slice/coupon-slice";
import { useToast } from "@/hooks/use-toast";
import { DialogDescription } from "@radix-ui/react-dialog";
import PropTypes from "prop-types";
import { TableRow, TableCell } from "@/components/ui/table";
import AdminTable from "@/components/admin/AdminTable";

export default function CouponManagement() {
  const dispatch = useDispatch();
  const { coupons, totalPages, currentPage, loading } = useSelector(state => state.coupons);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  useEffect(() => {
    dispatch(fetchCoupons({ page: 1, search: debouncedSearch, status: statusFilter, limit: 5 }));
  }, [dispatch, debouncedSearch, statusFilter]);

  const handleAddCoupon = (newCoupon) => {
    dispatch(addCoupon(newCoupon))
      .then((response) => {
        console.error("Error adding coupon:", response);
        if (response.payload) {
          toast({
            title: MESSAGES.SUCCESS,
            description: MESSAGES.COUPON_ADDED_SUCCESSFULLY
          });
          setIsDialogOpen(false);
        } else {
          toast({
            title: MESSAGES.ERROR,
            description: MESSAGES.COUPON_CODE_ALREADY_EXISTS,
            variant: "destructive"
          });
        }
      })
      .catch((error) => {
        console.error("Error adding coupon: err", error);
        toast({ 
          title: MESSAGES.ERROR,
          description: error.message,
          variant: "destructive"
        });
      });
  };

  const handleEditCoupon = (editedCoupon) => {
    dispatch(updateCoupon({ id: editedCoupon._id, couponData: editedCoupon }))
      .then((response) => {
        if (response.payload) {
          toast({
            title: MESSAGES.SUCCESS,
            description: MESSAGES.COUPON_UPDATED_SUCCESSFULLY,
          });
          setIsDialogOpen(false);
          setEditingCoupon(null);
        } else {
          toast({
            title: MESSAGES.ERROR,
            description: MESSAGES.COUPON_CODE_ALREADY_EXISTS,
            variant: "destructive"
          });
        }
      })
      .catch((error) => {
        toast({
          title: MESSAGES.ERROR,
          description: error.message,
          variant: "destructive"
        });
      });
  };

  const handleToggleCouponStatus = (id) => {
    dispatch(toggleCouponStatus(id))
      .then((response) => {
        toast({
          title: MESSAGES.SUCCESS,
          description: response.payload.message
        });
      })
      .catch((error) => {
        toast({
          title: MESSAGES.ERROR,
          description: error.message,
          variant: "destructive"
        });
      });
  };

  return (
    <div className="p-4 space-y-8">
      <AdminTable
        title="Coupons"
        searchPlaceholder="Search coupons by Code..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={[
          { label: "All Statuses", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
          { label: "Expired", value: "expired" }
        ]}
        addButtonText="Add Coupon"
        onAddClick={() => {
          setEditingCoupon(null);
          setIsDialogOpen(true);
        }}
        headers={[
          { label: "No", className: "w-[80px] pl-6" },
          { label: "Coupon Code" },
          { label: "Valid Period" },
          { label: "Discount" },
          { label: "Usage" },
          { label: "Status" },
          { label: "Actions", className: "text-right pr-6" }
        ]}
        data={coupons || []}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: (newPage) => {
            dispatch(fetchCoupons({ page: newPage, search: debouncedSearch, status: statusFilter, limit: 5 }));
          }
        }}
        renderRow={(coupon, index) => (
          <TableRow key={coupon._id} className="h-16 border-b border-slate-100">
            <TableCell className="py-3 px-4 pl-6 font-medium text-slate-500">{(currentPage - 1) * 5 + index + 1}</TableCell>
            <TableCell className="py-3 px-4 font-bold text-slate-800">{coupon.code}</TableCell>
            <TableCell className="py-3 px-4 text-slate-500">
              {format(new Date(coupon.startDate), "LLL dd, y")} - {format(new Date(coupon.endDate), "LLL dd, y")}
            </TableCell>
            <TableCell className="py-3 px-4 font-semibold text-slate-700">₹{coupon.discount.toFixed(2)}</TableCell>
            <TableCell className="py-3 px-4 text-slate-600">
              {coupon.used} / {coupon.usageLimit}
            </TableCell>
            <TableCell className="py-3 px-4">
              <Badge 
                variant={
                  coupon.status === 'active' ? 'success' : 
                  coupon.status === 'expired' ? 'destructive' : 'secondary'
                }
              >
                {coupon.status}
              </Badge>
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
                    onClick={() => {
                      if (coupon.status !== 'expired') {
                        setEditingCoupon(coupon);
                        setIsDialogOpen(true);
                      }
                    }}
                    disabled={coupon.status === 'expired'}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleCouponStatus(coupon._id)}
                    disabled={coupon.status === 'expired'}
                    className={coupon.status === 'active' ? "text-red-600" : "text-green-600"}
                  >
                    {coupon.status === 'active' ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Add New Coupon"}</DialogTitle>
          </DialogHeader>
          <CouponForm 
            onSubmit={editingCoupon ? handleEditCoupon : handleAddCoupon} 
            initialData={editingCoupon}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponForm({ onSubmit, initialData }) {
  const { register, handleSubmit, control, formState: { errors, isValid } } = useForm({
    defaultValues: initialData ? {
      ...initialData,
      dateRange: initialData.startDate && initialData.endDate ? {
        from: new Date(initialData.startDate),
        to: new Date(initialData.endDate)
      } : {
        from: undefined,
        to: undefined
      }
    } : {
      code: "",
      description: "",
      discount: "",
      dateRange: {
        from: undefined,
        to: undefined
      },
      usageLimit: "",
      minimumAmount: "",
      status: "active"
    },
    mode: "onChange"
  });

  const onSubmitForm = (data) => {
    const formattedData = {
      ...data,
      startDate: data.dateRange?.from ? new Date(data.dateRange.from).toISOString().split('T')[0] : null,
      endDate: data.dateRange?.to ? new Date(data.dateRange.to).toISOString().split('T')[0] : null
    };
    
    delete formattedData.dateRange;
    
    if (initialData) {
      formattedData._id = initialData._id;
    }
    
    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <Label htmlFor="code">Coupon Code</Label>
        <Input 
          id="code" 
          {...register("code", { 
            required: "Coupon code is required",
            pattern: {
              value: /^[A-Z0-9]+$/,
              message: "Coupon code must be uppercase alphanumeric and contain no spaces"
            }
          })} 
          className="mt-1" 
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
          }}
        />
        {errors.code && <span className="text-red-600 text-sm">{errors.code.message}</span>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input 
          id="description" 
          {...register("description", { required: "Description is required" })} 
          className="mt-1" 
        />
        {errors.description && <span className="text-red-600 text-sm">{errors.description.message}</span>}
      </div>
      
      <div className="flex gap-3 w-full">
        <div className="w-full">
          <Label htmlFor="discount">Discount Amount (₹)</Label>
          <Input 
            id="discount" 
            type="number" 
            step="0.01" 
            {...register("discount", { 
              required: "Discount amount is required",
              min: { value: 0.01, message: "Discount must be positive" }
            })} 
            className="mt-1" 
          />
          {errors.discount && <span className="text-red-600 text-sm">{errors.discount.message}</span>}
        </div>
        <div className="w-full">
          <Label htmlFor="status">Status</Label>
          <Controller
            name="status"
            control={control}
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} defaultValue={"active"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && <span className="text-red-600 text-sm">{errors.status.message}</span>}
        </div>
      </div>

      <div className="w-full">
        <Label htmlFor="dateRange">Valid Period</Label>
        <Controller
          name="dateRange"
          control={control}
          rules={{ 
            required: "Date range is required",
            validate: (value) => {
              if (!value || !value.from || !value.to) {
                return "Start and end dates are required";
              }
              const fromDate = new Date(value.from);
              const toDate = new Date(value.to);
              if (toDate < fromDate) {
                return "End date must be on or after start date";
              }
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const checkToDate = new Date(value.to);
              checkToDate.setHours(0, 0, 0, 0);
              if (checkToDate < today) {
                return "End date cannot be in the past";
              }
              return true;
            }
          }}
          render={({ field }) => (
            <DatePickerWithRange 
              value={field.value}
              onValueChange={field.onChange}
              className="mt-1"
            />
          )}
        />
        {errors.dateRange && <span className="text-red-600 text-sm">{errors.dateRange.message}</span>}
      </div>

      <div className="flex gap-3 w-full">
        <div className="w-full">
          <Label htmlFor="usageLimit">Usage Limit</Label>
          <Input 
            id="usageLimit" 
            type="number" 
            {...register("usageLimit", { 
              required: "Usage limit is required",
              min: { value: 1, message: MESSAGES.USAGE_LIMIT_MUST_BE_AT_LEAST_1 }
            })} 
            className="mt-1" 
          />
          {errors.usageLimit && <span className="text-red-600 text-sm">{errors.usageLimit.message}</span>}
        </div>
        <div className="w-full">
          <Label htmlFor="minimumAmount">Minimum Amount (₹)</Label>
          <Input 
            id="minimumAmount" 
            type="number" 
            step="0.01" 
            {...register("minimumAmount", { 
              required: "Minimum amount is required",
              min: { value: 0, message: MESSAGES.MINIMUM_AMOUNT_CANNOT_BE_NEGATIVE },
              validate: (value, formValues) => {
                const discount = parseFloat(formValues.discount);
                const minAmt = parseFloat(value);
                if (!isNaN(discount) && minAmt < discount) {
                  return "Minimum amount must be greater than or equal to the discount";
                }
                return true;
              }
            })} 
            className="mt-1" 
          />
          {errors.minimumAmount && <span className="text-red-600 text-sm">{errors.minimumAmount.message}</span>}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!isValid}
      >
        {initialData ? "Update Coupon" : "Add Coupon"}
      </Button>
    </form>
  );
}


CouponForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.shape({
    _id: PropTypes.string,
    code: PropTypes.string,
    description: PropTypes.string,
    discount: PropTypes.number,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    usageLimit: PropTypes.number,
    minimumAmount: PropTypes.number,
    status: PropTypes.oneOf(["active", "inactive", "expired"])
  })
};