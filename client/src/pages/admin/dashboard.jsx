import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchDashboardData } from "@/store/admin-slice"
import { Users, CreditCard, Activity, IndianRupee } from "lucide-react"
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

const metricColorClassMap = {
  green: "text-green-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  red: "text-red-600",
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <Skeleton className="h-[350px] w-full" />
    </div>
  )
}

function Overview() {
  const dispatch = useDispatch()
  const { overviewData, status } = useSelector((state) => state.admin.data)

  const handleTimeRangeChange = (value) => {
    dispatch(fetchDashboardData(value))
  }

  if (status === "loading") {
    return <OverviewSkeleton />
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Select onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={overviewData}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${value}`}
          />
          <Tooltip />
          <CartesianGrid stroke="#f5f5f5" />
          <Line type="monotone" dataKey="total" stroke="#adfa1d" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function RecentSalesSkeleton() {
  return (
    <div className="space-y-8">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center">
          <div className="ml-4 space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-6 w-16 ml-auto" />
        </div>
      ))}
    </div>
  )
}

function RecentSales() {
  const { recentSales, status } = useSelector((state) => state.admin.data)

  if (status === "loading") {
    return <RecentSalesSkeleton />
  }

  return (
    <div className="space-y-8">
      {recentSales.map((sale, index) => (
        <div key={index} className="flex items-center">
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">#{sale.orderId}</p>
            <p className="text-sm text-muted-foreground">{sale.name || "Unknown"}</p>
          </div>
          <div className="ml-auto font-medium">
            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              ₹{sale.sale}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[350px] w-full" />
}

function Top10Products() {
  const { top10Products, status } = useSelector((state) => state.admin.data)

  if (status === "loading") {
    return <ChartSkeleton />
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={top10Products}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Bar dataKey="sales" fill="#adfa1d" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Top10Categories() {
  const { top10Categories, status } = useSelector((state) => state.admin.data)

  if (status === "loading") {
    return <ChartSkeleton />
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={top10Categories}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip />
        <Legend />
        <CartesianGrid stroke="#f5f5f5" />
        <Bar dataKey="sales" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function MetricCard({ title, value, change, icon: Icon, color }) {
  const { status } = useSelector((state) => state.admin)
  const textColorClass = metricColorClassMap[color] || "text-slate-600"

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${textColorClass}`} />
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <>
            <Skeleton className="h-7 w-[100px]" />
            <Skeleton className="mt-2 h-4 w-[120px]" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {title === "Total Revenue" ? "₹" : "+"}
              {value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <p className={`text-xs ${textColorClass}`}>
              {change > 0 ? "+" : ""}
              {change}% from last month
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const { totalRevenue, newCustomers, totalSales, totalCancelled } = useSelector((state) => state.admin.data)
  const status = useSelector((state) => state.admin.status)
  const error = useSelector((state) => state.admin.error)

  useEffect(() => {
    dispatch(fetchDashboardData("weekly"))
  }, [dispatch])

  if (status === "failed") {
    return <div>Error: {error}</div>
  }

  return (
    <div className="flex-1 space-y-4 p-8 pl-4 pt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={totalRevenue?.value}
          change={totalRevenue?.change}
          icon={IndianRupee}
          color="green"
        />
        <MetricCard
          title="New Customers"
          value={newCustomers?.value}
          change={newCustomers?.change}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Sales"
          value={totalSales?.value}
          change={totalSales?.change}
          icon={CreditCard}
          color="purple"
        />
        <MetricCard
          title="Cancelled Orders"
          value={totalCancelled?.value}
          change={totalCancelled?.change}
          icon={Activity}
          color="red"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentSales />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Top10Products />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <Top10Categories />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

