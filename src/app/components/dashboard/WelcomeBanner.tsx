import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AuthService } from "../../api/services/auth.service";

export function WelcomeBanner() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        console.log("WelcomeBanner: Fetching user info...");
        const user = await AuthService.getMe();
        console.log("WelcomeBanner: User info received:", JSON.stringify(user, null, 2));

        const displayValue = user.username || user.fullName || "User";
        console.log("WelcomeBanner: Setting username to:", displayValue);
        setUserName(displayValue);
      } catch (error) {
        console.error("WelcomeBanner: Error in fetchUserInfo:", error);
      }
    };

    fetchUserInfo();

    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-6 overflow-hidden rounded-2xl border border-nexus-border bg-gradient-to-br from-[#0B1A2E] via-[#1E3A5F] to-[#0B1A2E] p-8 shadow-lg"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Welcome back, {userName}
        </h1>
        <p className="text-base text-blue-200">{formatDateTime(currentDateTime)}</p>
      </div>
    </motion.div>
  );
}
