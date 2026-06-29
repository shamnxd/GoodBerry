import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { resendOtp, verifyOtp } from "@/store/auth-slice";
import { useToast } from "@/hooks/use-toast";
import { REGEXP_ONLY_DIGITS } from "input-otp";

export function VeryOtp() {
  const [value, setValue] = useState("");
  const length = 6 === value.length;

  const dispatch = useDispatch();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [totalSeconds, setTotalSeconds] = useState(119); // Set the initial timer value 

  const maskEmail = (email) => {
    if (!email) return "your email";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return email;
    const maskedName = name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
    return `${maskedName}@${domain}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSeconds((prev) => (prev > 0 ? prev - 1 : 0)); // Decrease timer every second
    }, 1000);

    return () => clearInterval(timer); // Cleanup interval on component unmount
  }, []);

  const minutes = Math.floor(totalSeconds / 60); // Calculate minutes
  const seconds = totalSeconds % 60; // Calculate remaining seconds


  const handleSubmit = async () => {
    try {
      const data = await dispatch(verifyOtp({ otp: value }));
      if(data.payload.success) {
        toast({
          title: data.payload.message,
        });
        navigate("/");
      } else {
        toast({
          title: data.payload.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleResendOtp = async () => {

    try {
      const data = await dispatch(resendOtp());
      if(data.payload.success) {
        toast({
          title: data.payload.message,
        });
        setTotalSeconds(119);
      } else {
        toast({
          title: data.payload.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="verify-otp mx-auto w-full" style={{ maxWidth: "310px" }}>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Verify OTP</h1>
      <p className="text-gray-500 text-sm mb-8">
        Enter the 6-digit code sent to <span className="font-semibold text-gray-900">{maskEmail(email)}</span>
      </p>
      <InputOTP
        maxLength={6}
        value={value}
        onChange={(value) => setValue(value)}
        pattern={REGEXP_ONLY_DIGITS}
      >
        <InputOTPGroup className="gap-2">
          <InputOTPSlot index={0} className="border border-gray-300 rounded-lg w-11 h-12" />
          <InputOTPSlot index={1} className="border border-gray-300 rounded-lg w-11 h-12" />
          <InputOTPSlot index={2} className="border border-gray-300 rounded-lg w-11 h-12" />
          <InputOTPSlot index={3} className="border border-gray-300 rounded-lg w-11 h-12" />
          <InputOTPSlot index={4} className="border border-gray-300 rounded-lg w-11 h-12" />
          <InputOTPSlot index={5} className="border border-gray-300 rounded-lg w-11 h-12" />
        </InputOTPGroup>
      </InputOTP>
      <p
        className="text-gray-800 mb-2 font-bold mt-3"
        style={{ fontSize: "11px" }}
      >
         {minutes.toString().padStart(2, "0")} : {seconds.toString().padStart(2, "0")}
      </p>
      {totalSeconds === 0 &&
      <Link className="text-primary mb-3 font-semibold" onClick={handleResendOtp}>resend</Link>
      }
      <p className="text-gray-800 mb-1" style={{ fontSize: "10px" }}>
        By clicking on Verify button you agree to our{" "}
        <Link className="text-primary">Terms & Conditions</Link>
      </p>
      <Button
        className="w-full font-bold"
        onClick={handleSubmit}
        disabled={!length}
      >
        Verify
      </Button>
    </div>
  );
}

export default VeryOtp;
