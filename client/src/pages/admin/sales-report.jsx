import { useState, useEffect } from "react";
import { subDays, subWeeks, subMonths, subYears, format, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, DollarSign, ShoppingCart, Tag, Percent, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import api from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const SalesPeriod = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
  CUSTOM: "custom",
};

export default function SalesReportPage() {
  const [report, setReport] = useState(null);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const form = useForm({
    defaultValues: {
      period: SalesPeriod.DAY,
      dateRange: {
        from: subDays(new Date(), 1),
        to: new Date(),
      },
    },
  });

  const { watch, setValue } = form;

  const period = watch("period");
  const dateRange = watch("dateRange");

  useEffect(() => {
    fetchReport();
  }, [period, dateRange, currentPage, filterText]);

  const fetchReport = async () => {
    const startDate = dateRange?.from ? formatDate(dateRange.from) : undefined;
    const endDate = dateRange?.to ? formatDate(dateRange.to) : undefined;
    const response = await api.get(API_ENDPOINTS.ADMIN.SALES_REPORT, {
      params: { period, startDate, endDate, page: currentPage, limit: ordersPerPage, search: filterText },
      withCredentials: true
    });
    setReport(response.data);
    setFilteredOrders(response.data.orders);
  };

  const handlePeriodChange = (newPeriod) => {
    setValue("period", newPeriod);
    const today = new Date();
    let newDateRange;

    switch (newPeriod) {
      case SalesPeriod.DAY:
        newDateRange = { from: startOfDay(subDays(today, 1)), to: endOfDay(today) };
        break;
      case SalesPeriod.WEEK:
        newDateRange = { from: startOfDay(subWeeks(today, 1)), to: endOfDay(today) };
        break;
      case SalesPeriod.MONTH:
        newDateRange = { from: startOfDay(subMonths(today, 1)), to: endOfDay(today) };
        break;
      case SalesPeriod.YEAR:
        newDateRange = { from: startOfDay(subYears(today, 1)), to: endOfDay(today) };
        break;
      case SalesPeriod.CUSTOM:
        newDateRange = dateRange;
        break;
    }

    setValue("dateRange", newDateRange);
  };

  const handleDateRangeChange = (newDateRange) => {
    setValue("dateRange", newDateRange);
  };

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
  };

  const downloadReport = (format) => {
    if (format === "pdf") {
      downloadPDF();
    } else if (format === "excel") {
      downloadExcel();
    }
  };

  const downloadPDF = async () => {
    try {
      // Get current filter values from form and state
      const period = form.getValues("period");
      const dateRange = form.getValues("dateRange");
      const search = filterText;
  
      // Fetch all data without pagination
      const startDate = dateRange?.from ? formatDate(dateRange.from) : undefined;
      const endDate = dateRange?.to ? formatDate(dateRange.to) : undefined;
      const response = await api.get(
        API_ENDPOINTS.ADMIN.SALES_REPORT,
        {
          params: {
            period,
            startDate,
            endDate,
            search,
            downloadAll: true, // Add this flag to backend
          },
          withCredentials: true,
        }
      );
  
      const {
        orders: allOrders,
        overallSalesCount,
        overallOrderCount,
        overallOrderAmount,
        overallDiscount,
        overallCouponDiscount,
      } = response.data;
  
      // Generate PDF with all orders
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
  
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);
  
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Sales Report", pageWidth / 2, 35, { align: "center" });
  
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 40);
  
      autoTable(doc, {
        startY: 50,
        headStyles: { fillColor: [0, 0, 0], textColor: 255 },
        body: allOrders.map((order) => [
          order.orderId,
          formatDate(new Date(order.createdAt)),
          order.userId?.username || "N/A",
          order.total?.toFixed(2),
          order.discount?.toFixed(2),
          order.couponDiscount?.toFixed(2),
        ]),
        head: [
          [
            "Order ID",
            "Date",
            "Customer Name",
            "Amount",
            "Discount",
            "Coupon",
          ],
        ],
      });
  
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        headStyles: { fillColor: [0, 0, 0], textColor: 255 },
        head: [["Metric", "Value"]],
        body: [
          ["Overall Sales Count", overallSalesCount],
          ["Overall Order Count", overallOrderCount],
          ["Overall Order Amount", overallOrderAmount.toFixed(2)],
          ["Overall Discount", overallDiscount.toFixed(2)],
          ["Overall Coupon Discount", overallCouponDiscount.toFixed(2)],
        ],
      });
  
      doc.save("sales_report.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };
  
  const downloadExcel = async () => {
    try {
      // Get current filter values
      const period = form.getValues("period");
      const dateRange = form.getValues("dateRange");
      const search = filterText;
  
      // Fetch all data without pagination
      const startDate = dateRange?.from ? formatDate(dateRange.from) : undefined;
      const endDate = dateRange?.to ? formatDate(dateRange.to) : undefined;
      const response = await api.get(
        API_ENDPOINTS.ADMIN.SALES_REPORT,
        {
          params: {
            period,
            startDate,
            endDate,
            search,
            downloadAll: true,
          },
          withCredentials: true,
        }
      );
  
      const {
        orders: allOrders,
        overallSalesCount,
        overallOrderCount,
        overallOrderAmount,
        overallDiscount,
        overallCouponDiscount,
      } = response.data;
  
      // Prepare worksheet data
      const worksheetData = allOrders.map((order) => ({
        "Order ID": order.orderId,
        Date: formatDate(new Date(order.createdAt)),
        "Customer Name": order.userId?.username,
        "Amount": order.total?.toFixed(2),
        "Discount": order.discount?.toFixed(2),
        "Coupon": order.couponDiscount?.toFixed(2) || "0.00",
      }));
  
      // Add summary rows
      worksheetData.push({});
      worksheetData.push({
        "Order ID": "Overall Sales Count",
        Date: overallSalesCount,
        "Customer Name": "Overall Order Count",
        "Amount": overallOrderCount,
        "Discount": "Overall Order Amount",
        "Coupon": `₹${overallOrderAmount.toFixed(2)}`,
      });
      worksheetData.push({
        "Order ID": "Overall Discount",
        Date: `₹${overallDiscount.toFixed(2)}`,
        "Customer Name": "Overall Coupon Discount",
        "Order Amount": `₹${overallCouponDiscount.toFixed(2)}`,
      });
  
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
      XLSX.writeFile(workbook, "sales_report.xlsx");
    } catch (error) {
      console.error("Error generating Excel:", error);
    }
  };
  const formatDate = (date) => {
    return format(date, "yyyy-MM-dd");
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="container mx-auto p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-primary">Sales Report</h1>
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Report Period</FormLabel>
                <Select onValueChange={handlePeriodChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a report period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SalesPeriod.DAY}>Day</SelectItem>
                    <SelectItem value={SalesPeriod.WEEK}>Week</SelectItem>
                    <SelectItem value={SalesPeriod.MONTH}>Month</SelectItem>
                    <SelectItem value={SalesPeriod.YEAR}>Year</SelectItem>
                    <SelectItem value={SalesPeriod.CUSTOM}>Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Select the period for your sales report</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {period === SalesPeriod.CUSTOM && (
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Range</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-[300px] justify-start text-left font-normal ${
                            !field.value && "text-muted-foreground"
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {formatDate(field.value.from)} - {formatDate(field.value.to)}
                              </>
                            ) : (
                              formatDate(field.value.from)
                            )
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={field.value}
                        onSelect={handleDateRangeChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Select the custom date range for your report</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <Card className="bg-green-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">₹{report.overallOrderAmount.toFixed(2)}</div>
                <p className="text-xs text-green-600">{report.overallSalesCount} items sold</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{report.overallOrderCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800">Total Discounts</CardTitle>
                <Tag className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">₹{report.overallDiscount.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800">Coupon Discounts</CardTitle>
                <Percent className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">₹{report.overallCouponDiscount.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-black">Detailed Sales Report</CardTitle>
              <CardDescription>
                {formatDate(report.startDate)} to {formatDate(report.endDate)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Filter by Order ID or Customer Name"
                  value={filterText}
                  onChange={handleFilterChange}
                  className="max-w-sm"
                />
              </div>
              <Table>
                <TableCaption>Sales report for the selected period</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Order ID</TableHead>
                    <TableHead className="text-black">Date</TableHead>
                    <TableHead className="text-black">Customer Name</TableHead>
                    <TableHead className="text-black">Order Amount</TableHead>
                    <TableHead className="text-black">Discount Amount</TableHead>
                    <TableHead className="text-black">Coupon Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.orderId}>
                      <TableCell>{order.orderId}</TableCell>
                      <TableCell>{formatDate(new Date(order.createdAt))}</TableCell>
                      <TableCell>{order.userId?.username}</TableCell>
                      <TableCell>₹{order.total?.toFixed(2)}</TableCell>
                      <TableCell>₹{order.discount?.toFixed(2)}</TableCell>
                      <TableCell>₹{order.couponDiscount?.toFixed(2) ||"0.00"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {report.totalPages > 1 && (
                <div className="flex items-center justify-end mt-5 mr-4 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {report.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === report.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={() => downloadReport("pdf")} className="mr-2" variant="outline">
                <Download className="h-4 w-4" />Download PDF
              </Button>
              <Button onClick={() => downloadReport("excel")} variant="outline">
              <Download className="h-4 w-4" />Download Excel
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}

