
import React from 'react';
// FIX: Updated react-router-dom import for v5 compatibility.
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavLinksForRole } from '../../constants';
import { X } from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  unreadMessageCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen, unreadMessageCount }) => {
  const { userProfile } = useAuth();

  const navLinks = userProfile ? getNavLinksForRole(userProfile.role) : [];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 transition-colors duration-200 transform rounded-lg ${
      isActive
        ? 'bg-sky-600 text-white'
        : 'text-gray-300 hover:bg-gray-700'
    }`;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-20 lg:hidden ${sidebarOpen ? 'block' : 'hidden'} no-print`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <div
        className={`fixed inset-y-0 left-0 w-64 px-4 py-5 bg-[#161B22] border-r border-gray-700 transform lg:translate-x-0 z-30 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        <div className="flex items-center justify-between">
          {/* Desktop Logo */}
          <a href="#/" className="hidden md:flex items-center space-x-3 text-white">
            <img src="https://i.ibb.co/TDT9QtC9/images.png" alt="RCZ Morgenster Hospital Logo" className="h-10 w-10 rounded-md object-cover" />
             <div>
                <span className="block text-sm font-bold" style={{ color: '#00BFFF' }}>RCZ MORGENSTER</span>
                <span className="block text-xs font-semibold text-gray-300">HOSPITAL</span>
            </div>
          </a>
          {/* Mobile Logo */}
           <a href="#/" className="flex md:hidden items-center space-x-3 text-white">
            <img src="https://i.ibb.co/TDT9QtC9/images.png" alt="Morgenster Hospital Logo" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-semibold text-gray-200">Raphamed Surgery</span>
          </a>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>
        <nav className="mt-10 flex flex-col space-y-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                    <span className={link.href === '/messages' ? 'flickering-dot-container' : ''}>
                        {link.icon}
                        {link.href === '/messages' && unreadMessageCount > 0 && <span className="flickering-dot"></span>}
                    </span>
                    <span className="mx-4 font-medium">{link.label}</span>
                </div>
                {link.href === '/messages' && unreadMessageCount > 0 && (
                    <span className="message-badge">{unreadMessageCount > 9 ? '9+' : unreadMessageCount}</span>
                )}
            </div>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
