import { useState, useEffect } from "react";
import MESSAGES from '../../../constants/messages';
import {

  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MapPin,
  ShoppingCart,
  Wallet,
  Pencil,
  Loader2,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import OrderSuccess from "./success-order";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAddresses,
  updateAddress,
  setDefault,
  addAddress,
} from "@/store/user-slice/account-slice";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createOrder } from "@/store/shop-slice/order-slice";
import { clearCart, checkQuantity } from "@/store/shop-slice/cart-slice";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";

const addressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z
    .string()
    .min(1, "ZIP code is required")
    .regex(/^\d+$/, "ZIP code must contain only numbers"),
  country: z.string().min(1, "Country is required"),
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Address type is required"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^\d{10}$/, "Mobile number must be 10 digits"),
});

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const { addresses } = useSelector((state) => state.account);
  const [activeStep, setActiveStep] = useState("address");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState("free");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const items = useSelector((state) => state.cart.items);
  const { isLoading } = useSelector((state) => state.order);
  const [availableQuantities, setAvailableQuantities] = useState({});

  useEffect(() => {
    if (items.length === 0) return;

    const fetchAllQuantities = async () => {
      try {
        const result = await dispatch(
          checkQuantity(
            items.map((item) => ({
              productId: typeof item.productId === 'object' ? item.productId._id : item.productId,
              packageSize: item.packageSize,
              flavor: item.flavor,
            }))
          )
        ).unwrap();

        const quantities = {};
        (Array.isArray(result.data) ? result.data : [result.data]).forEach((q) => {
          quantities[`${q.productId}-${q.packageSize}-${q.flavor}`] = q.availableQuantity ?? q.quantity ?? 0;
        });
        setAvailableQuantities(quantities);
      } catch (error) {
        console.error("Error fetching quantities:", error);
      }
    };

    fetchAllQuantities();
  }, [dispatch]); // only run once on mount — items are stable at checkout entry

  const getAvailableQuantity = (item) => {
    const pid = typeof item.productId === 'object' ? item.productId._id : item.productId;
    return availableQuantities[`${pid}-${item.packageSize}-${item.flavor}`] || 0;
  };

  const inStockItems = items.filter(
    (item) => getAvailableQuantity(item) > 0 && item.quantity <= getAvailableQuantity(item)
  );


  const { coupon } = useSelector((state) => state.shop);
  const subtotal = inStockItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discount =
    subtotal -
    inStockItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      name: "",
      type: "",
      mobile: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddress = addresses.find((addr) => addr.isDefault);
      setSelectedAddress(defaultAddress?._id || addresses[0]._id);
    }
  }, [addresses]);

  useEffect(() => {
    if (isEditing) {
      const editingAddress = addresses.find((addr) => addr._id === isEditing);
      if (editingAddress) {
        reset({
          street: editingAddress.street,
          city: editingAddress.city,
          state: editingAddress.state,
          zip: editingAddress.zip,
          country: editingAddress.country,
          name: editingAddress.name,
          type: editingAddress.type,
          mobile: editingAddress.mobile,
        });
      }
    } else {
      reset({
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        name: "",
        type: "",
        mobile: "",
      });
    }
  }, [isEditing, addresses, reset]);

  const onSubmit = (data) => {
    const addressData = {
      ...data,
      isDefault: true,
    };

    if (isEditing) {
      dispatch(updateAddress({ id: isEditing, data: addressData }))
        .unwrap()
        .then(() => {
          setIsEditing(null);
          setShowForm(false);
          toast({
            title: MESSAGES.ADDRESS_UPDATED_SUCCESSFULLY,
          });
        });
    } else {
      dispatch(addAddress(addressData))
        .unwrap()
        .then(() => {
          setShowForm(false);
          toast({
            title: MESSAGES.ADDRESS_ADDED_SUCCESSFULLY,
          });
        });
    }
  };

  const handleEdit = (address) => {
    setIsEditing(address._id);
    setShowForm(true);
  };

  const handleNext = () => {
    if (activeStep === "address") setActiveStep("shipping");
    else if (activeStep === "shipping") setActiveStep("payment");
  };

  const handleBack = () => {
    if (activeStep === "shipping") setActiveStep("address");
    else if (activeStep === "payment") setActiveStep("shipping");
  };

  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);
      const res = await loadScript(
        "https://checkout.razorpay.com/v1/checkout.js"
      );

      if (!res) {
        toast({
          title: MESSAGES.RAZORPAY_SDK_FAILED_TO_LOAD,
          variant: "destructive",
        });
        return;
      }

      const orderData = {
        addressId: selectedAddress,
        shippingMethod: selectedShippingDetails,
        paymentMethod: selectedPayment,
        discount: discount,
        coupon: {
          couponId: coupon?.couponId,
          discount: coupon?.discount,
        },
        items: inStockItems,
        subtotal: summary.subtotal,
        shippingCost: summary.shipping,
        couponDiscount: summary.coupon,
        total: summary.total,
      };

      const order = await dispatch(createOrder(orderData)).unwrap();
      setOrderDetails(order);

      const razorpayOrder = await api.post(
        API_ENDPOINTS.USER.CREATE_RAZORPAY_ORDER,
        {
          orderId: order._id,
        },
        {
          withCredentials: true,
        }
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpayOrder.data.amount,
        currency: razorpayOrder.data.currency,
        name: "Good Berry",
        description: `Order ${order.orderId}`,
        order_id: razorpayOrder.data.orderId,
        handler: async function (response) {
          try {
            const { data } = await api.post(
              API_ENDPOINTS.USER.VERIFY_PAYMENT,
              {
                orderCreationId: razorpayOrder.data.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                orderData: order,
              },
              {
                withCredentials: true,
              }
            );

            setPaymentSuccess(true);
            dispatch(clearCart());

            toast({
              title: MESSAGES.PAYMENT_SUCCESSFUL,
              description: `Order ID: ${data.orderId}`,
            });
          } catch (error) {
            console.error("Error verifying payment:", error);
            setLoading(false);
            toast({
              title: MESSAGES.PAYMENT_VERIFICATION_FAILED,
              description:
              error?.message || "Please contact support",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: async function () {
            try {
              await api.post(
                API_ENDPOINTS.USER.PAYMENT_FAILURE,
                {
                  orderId: order._id,
                },
                {
                  withCredentials: true,
                }
              );
              navigate(`/account/order/${order.orderId}`);
              dispatch(clearCart());
              toast({
                title: MESSAGES.PAYMENT_CANCELLED,
                description: MESSAGES.YOUR_PAYMENT_WAS_CANCELLED_PLEASE_TRY_AGAIN,
                variant: "destructive",
              });
            } catch (error) {
              console.error("Error handling payment failure:", error);
              setLoading(false);
              toast({
                title: MESSAGES.ERROR_HANDLING_PAYMENT_FAILURE,
                description: error.message || "Please contact support",
                variant: "destructive",
              });
            }
          },
        },
        prefill: {
          name: selectedAddressDetails?.name,
          email: "",
          contact: selectedAddressDetails?.mobile,
        },
        notes: {
          address: "Good Berry Store Order",
        },
        theme: {
          color: "#8AB446",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      setLoading(false);
    } catch (error) {
      console.error("Error initiating Razorpay payment:", error);
      toast({
        title: MESSAGES.ERROR_INITIATING_PAYMENT,
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleWalletPayment = async () => {
    try {
      setLoading(true);
      const orderData = {
        addressId: selectedAddress,
        shippingMethod: selectedShippingDetails,
        paymentMethod: selectedPayment,
        discount: discount,
        coupon: {
          couponId: coupon?.couponId,
          discount: coupon?.discount,
        },
        items: inStockItems,
        subtotal: summary.subtotal,
        shippingCost: summary.shipping,
        couponDiscount: summary.coupon,
        total: summary.total,
      };

      const order = await dispatch(createOrder(orderData)).unwrap();
      setOrderDetails(order);

      const { data } = await api.post(
        API_ENDPOINTS.USER.WALLET_PAYMENT,
        {
          orderId: order._id,
        },
        {
          withCredentials: true,
        }
      )

      setPaymentSuccess(true);
      dispatch(clearCart());

      toast({
        title: MESSAGES.PAYMENT_SUCCESSFUL,
        description: `Order ID: ${data.orderId}`,
      });
    } catch (error) {
      console.error("Error handling wallet payment:", error.response.data.message);
      toast({
        title: MESSAGES.PAYMENT_FAILED,
        description: error?.response?.data?.message || "Please contact support",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () => {
    if (selectedPayment === "upi") {
      setLoading(true);
      return handleRazorpayPayment();
    } else if (selectedPayment === "wallet") {
      setLoading(true);
      return handleWalletPayment();
    }
    const orderData = {
      addressId: selectedAddress,
      shippingMethod: selectedShippingDetails,
      paymentMethod: selectedPayment,
      discount: discount,
      coupon: {
        couponId: coupon?.couponId,
        discount: coupon?.discount,
      },
      items: inStockItems,
    };

    dispatch(createOrder(orderData))
      .unwrap()
      .then((res) => {
        setOrderDetails(res);
        setPaymentSuccess(true);
        dispatch(clearCart());
      })
      .catch((error) => {
        toast({
          title: MESSAGES.ERROR_PLACING_ORDER,
          description: error.message,
          variant: "destructive",
        });
      });
  };

  const handleRemoveCoupon = () => {
    dispatch({ type: "shop/applyCoupon/fulfilled", payload: {} });
    toast({
      title: MESSAGES.COUPON_REMOVED || "Coupon removed",
    });
  };

  if (paymentSuccess) {
    return <OrderSuccess data={orderDetails} />;
  }

  const selectedAddressDetails = addresses.find(
    (addr) => addr._id === selectedAddress
  );

  const shippingMethods = [
    {
      id: "free",
      name: "Regular shipment",
      description: MESSAGES.FREE_DELIVERY,
      price: 0,
    },
    {
      id: "express",
      name: "Express delivery",
      description: MESSAGES.GET_YOUR_DELIVERY_AS_SOON_AS_POSSIBLE,
      price: 99,
    },
    {
      id: "scheduled",
      name: "Scheduled delivery",
      description: MESSAGES.PICK_A_DATE_WHEN_YOU_WANT_TO_GET_YOUR_DELIVERY,
      date: "Select Date →",
      price: 99,
      disabled: true,
    },
  ];

  const couponDiscount = coupon?.discount || 0;

  const selectedShippingDetails = shippingMethods.find(
    (method) => method.id === selectedShipping
  );
  const summary = {
    subtotal: subtotal,
    coupon: couponDiscount,
    discount: discount,
    shipping: selectedShippingDetails?.price || 0,
    total:
      subtotal +
      -couponDiscount +
      (selectedShippingDetails?.price - discount || 0),
  };

  return (
    <div className="container mx-auto px-4 py-4 lg:py-10">
      <Tabs
        value={activeStep}
        className="w-full max-w-[550px] mx-auto bg-transparent"
      >
        <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto">
          <TabsTrigger
            value="address"
            className="data-[state=active]:shadow-none flex flex-col gap-1 py-2"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep === "address"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <span className={`text-[11px] font-medium ${activeStep === "address" ? "text-primary" : "text-gray-500"}`}>Address</span>
          </TabsTrigger>
          <TabsTrigger
            value="shipping"
            className="data-[state=active]:shadow-none flex flex-col gap-1 py-2"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep === "shipping"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className={`text-[11px] font-medium ${activeStep === "shipping" ? "text-primary" : "text-gray-500"}`}>Shipping</span>
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className="data-[state=active]:shadow-none flex flex-col gap-1 py-2"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep === "payment"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
            <span className={`text-[11px] font-medium ${activeStep === "payment" ? "text-primary" : "text-gray-500"}`}>Payment</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="address">
          <div className="w-full max-w-3xl mx-auto space-y-6  py-2 px-3">
            <div className="w-full">
              <div className="flex-row flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Shipping Address</h2>
                {!showForm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary hover:text-primary-foreground"
                    onClick={() => {
                      setShowForm(true);
                      setIsEditing(null);
                    }}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                )}
              </div>
                {showForm ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <Label className="text-gray-600">Street Address</Label>
                      <Input
                        {...register("street")}
                        className={`mt-1 ${
                          errors.street ? "border-red-500" : ""
                        }`}
                      />
                      {errors.street && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.street.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600">City</Label>
                        <Input
                          {...register("city")}
                          className={`mt-1 ${
                            errors.city ? "border-red-500" : ""
                          }`}
                        />
                        {errors.city && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.city.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600">State</Label>
                        <Input
                          {...register("state")}
                          className={`mt-1 ${
                            errors.state ? "border-red-500" : ""
                          }`}
                        />
                        {errors.state && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.state.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600">Zip Code</Label>
                        <Input
                          {...register("zip")}
                          className={`mt-1 ${
                            errors.zip ? "border-red-500" : ""
                          }`}
                        />
                        {errors.zip && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.zip.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600">Country</Label>
                        <Input
                          {...register("country")}
                          className={`mt-1 ${
                            errors.country ? "border-red-500" : ""
                          }`}
                        />
                        {errors.country && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.country.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600">Name</Label>
                      <Input
                        {...register("name")}
                        className={`mt-1 ${
                          errors.name ? "border-red-500" : ""
                        }`}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600">Type</Label>
                        <Input
                          {...register("type")}
                          className={`mt-1 ${
                            errors.type ? "border-red-500" : ""
                          }`}
                        />
                        {errors.type && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.type.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600">Mobile</Label>
                        <Input
                          {...register("mobile")}
                          className={`mt-1 ${
                            errors.mobile ? "border-red-500" : ""
                          }`}
                        />
                        {errors.mobile && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.mobile.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" className="flex-1">
                        {isEditing ? "Update Address" : "Add Address"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowForm(false);
                          setIsEditing(null);
                          reset();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <RadioGroup
                    value={selectedAddress}
                    onValueChange={(value) => {
                      setSelectedAddress(value);
                      dispatch(setDefault(value)).then(() => {
                        toast({
                          title: MESSAGES.DEFAULT_ADDRESS_UPDATED_SUCCESSFULLY,
                        });
                      });
                    }}
                    className="space-y-4"
                  >
                    {addresses.map((address) => (
                      <Card key={address._id} className="bg-gray-50 border-0">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <RadioGroupItem
                              value={address._id}
                              id={address._id}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {address.name}
                                </span>
                                <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                                  {address.type}
                                </span>
                              </div>
                              <span className="text-sm text-gray-600">
                                {`${address.street}, ${address.city}, ${address.state} ${address.zip}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(address)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </RadioGroup>
                )}
              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
                <Button onClick={handleNext} disabled={addresses.length === 0}>Next</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shipping">
          <div className="w-full max-w-3xl mx-auto space-y-4 py-2 px-3">
            <h2 className="text-lg font-medium">Select Shipping</h2>
            <RadioGroup
              value={selectedShipping}
              onValueChange={setSelectedShipping}
              className="space-y-3"
            >
              {shippingMethods.map((method) => (
                <Card key={method.id} className="bg-gray-50 border-0">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem
                        value={method.id}
                        id={method.id}
                        disabled={method.disabled}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${method.disabled ? "text-gray-400" : ""}`}>
                            {method.name}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-semibold text-primary-foreground rounded ${method.disabled ? "bg-gray-400" : "bg-primary"}`}>
                            {method.price > 0 ? `₹${method.price}` : "Free"}
                          </span>
                        </div>
                        <span className={`text-sm ${method.disabled ? "text-gray-300" : "text-gray-600"}`}>
                          {method.description}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext}>Next</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <div className="w-full max-w-3xl mx-auto py-2 px-3">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border shadow-sm border-none shadow-none">
                <CardHeader className="!pb-3 p-0">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-0 pb-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</div>
                    <div className="text-sm">
                      {selectedAddressDetails ? (
                        <>{selectedAddressDetails.street}, {selectedAddressDetails.city}, {selectedAddressDetails.state} {selectedAddressDetails.zip}</>
                      ) : ("No address selected")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Shipping</div>
                    <div className="text-sm">
                      {selectedShippingDetails?.name || "No shipping method selected"}
                      {selectedShippingDetails?.price > 0 && ` - ₹${selectedShippingDetails.price}`}
                    </div>
                  </div>
                  <div className="border-t pt-3 space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>₹{summary.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Discount</span><span>-₹{summary.discount.toFixed(2)}</span></div>
                     {coupon.discount && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 flex items-center gap-2">
                          Coupon ({coupon.code || coupon.couponId || "Applied"})
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-xs text-red-600 hover:text-red-800 underline font-semibold transition-colors"
                          >
                            Remove
                          </button>
                        </span>
                        <span>-₹{summary.coupon.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Shipping</span><span>₹{summary.shipping.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-1.5"><span>Total</span><span className="text-[#8ec743]">₹{summary.total.toFixed(2)}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-none">
                <CardHeader className="!pb-3 p-0">
                  <CardTitle className="text-base">Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 !pb-5 p-0">
                  <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment} className="space-y-3">
                    {[
                      { id: "cod", name: "Cash on Delivery", disabled: summary.total > 1000 },
                      { id: "upi", name: "Razorpay", disabled: false },
                      { id: "wallet", name: "Pay with Wallet", disabled: false },
                    ].map((payment) => (
                      <Card key={payment.id} className="bg-gray-50 border-0">
                        <CardContent className="flex items-center p-3 gap-3">
                          <RadioGroupItem value={payment.id} id={payment.id} disabled={payment.disabled} />
                          <div className={`font-medium text-sm ${payment.disabled ? "text-gray-400" : ""}`}>{payment.name}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </RadioGroup>
                </CardContent>
                <CardFooter className="flex p-0 justify-between pt-3">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button variant="default" disabled={summary.total === 0 || !selectedPayment} onClick={handlePay}>
                    {isLoading || loading ? (<><Loader2 className="animate-spin" />Processing...</>) : (<><CreditCard />Proceed to Pay</>)}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
