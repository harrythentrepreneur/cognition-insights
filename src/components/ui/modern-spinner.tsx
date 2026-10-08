import { cn } from "@/lib/utils"

interface ModernSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ModernSpinner({ className, size = "md" }: ModernSpinnerProps) {
  const sizeClasses = {
    sm: "size-8",
    md: "size-12",
    lg: "size-16"
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Outer ring */}
      <div className="absolute inset-0">
        <svg
          className="size-full animate-spin"
          viewBox="0 0 50 50"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="60 40"
            className="text-primary/20"
          />
        </svg>
      </div>
      
      {/* Inner spinning arc */}
      <div className="absolute inset-0">
        <svg
          className="size-full animate-spin"
          viewBox="0 0 50 50"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="40 85"
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
      </div>
      
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-2 rounded-full bg-primary animate-pulse" />
      </div>
    </div>
  )
}

// Alternative dot spinner for variety
export function DotSpinner({ className, size = "md" }: ModernSpinnerProps) {
  const sizeClasses = {
    sm: "size-8",
    md: "size-12", 
    lg: "size-16"
  }

  const dotSizeClasses = {
    sm: "size-1.5",
    md: "size-2",
    lg: "size-2.5"
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex gap-1">
          <div 
            className={cn(dotSizeClasses[size], "rounded-full bg-primary animate-bounce")}
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <div 
            className={cn(dotSizeClasses[size], "rounded-full bg-primary animate-bounce")}
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          />
          <div 
            className={cn(dotSizeClasses[size], "rounded-full bg-primary animate-bounce")}
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          />
        </div>
      </div>
    </div>
  )
}

// Gradient ring spinner
export function GradientSpinner({ className, size = "md" }: ModernSpinnerProps) {
  const sizeClasses = {
    sm: "size-8",
    md: "size-12",
    lg: "size-16"
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.5s' }}>
        <svg
          className="size-full"
          viewBox="0 0 50 50"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0" />
              <stop offset="50%" stopColor="currentColor" className="text-primary" stopOpacity="1" />
              <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}