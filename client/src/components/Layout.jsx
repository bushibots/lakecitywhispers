import { Outlet } from 'react-router-dom';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';

export default function Layout() {
  return (
    <div className="layout-wrapper">
      <MobileHeader />
      <LeftSidebar />
      <main className="layout-main">
        <Outlet />
      </main>
      <RightSidebar />
      <BottomNav />
    </div>
  );
}
