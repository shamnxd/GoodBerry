import { useSelector } from "react-redux";

const AccountOverview = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="flex flex-col gap-2 p-4 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-gray-800 font-signika">
        Hello, {user?.username || user?.userName || "User"}!
      </h1>
      <p className="text-sm text-gray-500 max-w-md">
        Welcome. From here you can easily check and view your recent orders, manage your shipping and billing addresses and edit your password and account details.
      </p>
    </div>
  );
};

export default AccountOverview;
