# Durgashakti Foils Rules Override
<!-- Global rules excluded for this project -->

## Loading UI Patterns for Tabs & Pages
To prevent page flickering and maintain layout persistence (Sidebar, Top Header, etc.) when building new pages or sub-tabs:

1. **Do NOT use the full-screen `<PageLoader />`** directly as a top-level return when data is loading.
2. **Use a Centered Inline Spinner** inside the main page content area. Use the following standard Tailwind template:
   ```jsx
   if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full">
         <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
         <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading page data...</p>
       </div>
     );
   }
   ```
3. **For Customer Dashboard Tab Cards:** Use `min-h-[350px]` with the matching dark container theme:
   ```jsx
   if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[350px] bg-[#19231F] rounded-3xl border border-[#26322B] p-8 text-white w-full">
         <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-3"></div>
         <p className="text-xs text-slate-400 font-semibold tracking-wider">Loading...</p>
       </div>
     );
   }
   ```
