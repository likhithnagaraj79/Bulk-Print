import { motion } from "motion/react";
import { Shield, Zap, Globe, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Multi-role authentication with offline 2FA capabilities",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "Real-time badge printing and QR generation on-site",
  },
  {
    icon: Globe,
    title: "Offline-First",
    description: "Full functionality in zero-connectivity environments",
  },
];

export function BrandingPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-nexus-brand to-nexus-brand-deep px-16 py-16 lg:flex">
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Section - Logo & Branding */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div className="mb-12 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <div className="h-6 w-6 rounded-md bg-nexus-surface" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              NEXUS
            </h1>
            <p className="text-sm font-medium text-white/70">
              by Blueberit
            </p>
          </div>
        </div>

        {/* Main Heading */}
        <div className="mb-8">
          <h2 className="mb-4 text-5xl font-semibold leading-tight tracking-tight text-white">
            Event Registration
            <br />
            Management
          </h2>
          <p className="text-lg font-normal text-white/80">
            Secure, scalable, and built for enterprise.
          </p>
        </div>
      </motion.div>

      {/* Middle Section - Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-6"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.3 + index * 0.1,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="flex items-start gap-4"
            >
              <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/70">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom Section - Trust Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="space-y-4"
      >
        <div className="h-px bg-white/10" />
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-white/70" strokeWidth={2} />
            <span className="text-sm font-medium text-white/70">
              ISO 27001 Certified
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-white/70" strokeWidth={2} />
            <span className="text-sm font-medium text-white/70">
              SOC 2 Compliant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-white/70" strokeWidth={2} />
            <span className="text-sm font-medium text-white/70">
              GDPR Ready
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
