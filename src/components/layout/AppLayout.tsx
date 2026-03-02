import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';
import BottomNav from './BottomNav';

// AppLayout is the shell that wraps every authenticated page
// It renders:
//   - SideNav on the left (hidden on mobile, visible on md+)
//   - the page content in the centre/right via <Outlet />
//   - BottomNav fixed at the bottom (visible on mobile, hidden on md+)
//
// <Outlet /> is a React Router v6 concept — it renders whichever
// child route is currently active. This means AppLayout renders once
// and only the page content swaps out as the user navigates.
// This is called a "nested layout route" pattern.
//
// The main content area has:
//   - ml-20 lg:ml-64 on md+ to offset the fixed sidebar width
//   - pb-20 on mobile to avoid content being hidden behind BottomNav
//   - h-screen overflow-hidden so the page controls its own scrolling

const AppLayout = () => {
  return (
    <div className="flex bg-black min-h-screen">

      {/* fixed left sidebar — only visible on md+ */}
      <SideNav />

      {/* main content area */}
      {/* md:ml-20 offsets the collapsed sidebar (w-20) */}
      {/* lg:ml-64 offsets the expanded sidebar (w-64) */}
      <main className="flex-1 md:ml-20 lg:ml-64 pb-16 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* fixed bottom nav — only visible below md breakpoint */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;