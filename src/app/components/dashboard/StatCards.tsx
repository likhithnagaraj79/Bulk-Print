import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Users, UserCheck, UserX, UserPlus } from "lucide-react";
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from "chart.js";
import type { Admin } from "../../api/services/user.service";

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface StatCardsProps {
  admins: Admin[];
  loading: boolean;
}

export function StatCards({ admins, loading }: StatCardsProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [animatedCounts, setAnimatedCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.status === "active").length;
  const inactiveAdmins = admins.filter((a) => a.status === "inactive").length;
  const lastAdded = [...admins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // Count-up animation
  useEffect(() => {
    if (loading) return;

    const duration = 1200;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedCounts({
        total: Math.floor(totalAdmins * progress),
        active: Math.floor(activeAdmins * progress),
        inactive: Math.floor(inactiveAdmins * progress),
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedCounts({ total: totalAdmins, active: activeAdmins, inactive: inactiveAdmins });
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [totalAdmins, activeAdmins, inactiveAdmins, loading]);

  // Admin Count Ring Chart
  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Active", "Inactive"],
        datasets: [
          {
            data: [activeAdmins, inactiveAdmins],
            backgroundColor: ["#0066CC", "#EF4444"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "70%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: "#1F2937",
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
          },
        },
        animation: {
          duration: 800,
          easing: "easeInOutQuart",
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [activeAdmins, inactiveAdmins, loading]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const cards = [
    {
      title: "Total Admins",
      value: animatedCounts.total,
      icon: Users,
      color: "blue",
      hasChart: true,
    },
    {
      title: "Active Admins",
      value: animatedCounts.active,
      icon: UserCheck,
      color: "green",
    },
    {
      title: "Inactive Admins",
      value: animatedCounts.inactive,
      icon: UserX,
      color: "red",
    },
    {
      title: "Last Added",
      value: lastAdded ? lastAdded.name : "N/A",
      subtitle: lastAdded ? formatTimeAgo(lastAdded.createdAt) : "",
      icon: UserPlus,
      color: "purple",
    },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
          className="relative overflow-hidden rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-nexus-text-secondary">{card.title}</p>
              <div className="mt-2">
                {typeof card.value === "number" ? (
                  <p className="text-3xl font-semibold text-nexus-text-primary">
                    {loading ? "..." : card.value}
                  </p>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-nexus-text-primary">{card.value}</p>
                    {card.subtitle && (
                      <p className="mt-1 text-sm text-nexus-text-muted">{card.subtitle}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {card.hasChart ? (
              <div className="relative h-16 w-16">
                <canvas ref={chartRef} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-nexus-text-primary">
                    {loading ? "" : totalAdmins}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  card.color === "green"
                    ? "bg-green-50 text-green-600"
                    : card.color === "red"
                    ? "bg-red-50 text-red-600"
                    : card.color === "purple"
                    ? "bg-purple-50 text-purple-600"
                    : "bg-nexus-brand-light text-nexus-brand"
                }`}
              >
                <card.icon className="h-6 w-6" />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
