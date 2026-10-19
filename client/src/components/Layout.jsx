import { Outlet } from 'react-router-dom';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';

export default function Layout() {
  return (
    <div className="app-shell">
      <MobileHeader />
      <div className="layout-wrapper">
        <LeftSidebar />
        <main className="layout-main">
          <Outlet />
        </main>
        <RightSidebar />
      </div>
      <BottomNav />
    </div>
  );
}
