import React, { useEffect, useState } from "react"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'dark')

  useEffect(() => {
    const handleThemeToggle = (e) => {
      setThemeMode(e.detail)
    }
    window.addEventListener('theme-toggle', handleThemeToggle)
    return () => window.removeEventListener('theme-toggle', handleThemeToggle)
  }, [])

  return (
    <Sonner
      theme={themeMode}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 font-medium",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  )
}

export { Toaster, toast }
