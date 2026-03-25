import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, FilePlus, Settings, LogOut, Users, Building2, ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../../utils/cn';

export function Sidebar() {
  const { user, profile, isAdmin, logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const depts = settings?.departments || ['General', 'HR', 'Finance', 'Operation', 'Public'];

  const links = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { 
      name: 'Documents', 
      to: '/documents', 
      icon: FileText,
      subItems: depts.map(dept => ({
        name: dept,
        to: `/documents?dept=${dept}`
      }))
    },
    { name: 'Templates', to: '/templates', icon: FilePlus, adminOnly: true },
    { name: 'Clients', to: '/clients', icon: Briefcase, adminOnly: true },
    { name: 'Employees', to: '/employees', icon: Users, adminOnly: true },
    { name: 'Settings', to: '/settings', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800 print:hidden">
      <div className="p-6 flex items-center space-x-3">
        {settings?.logoUrl ? (
          <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain bg-white rounded-md p-0.5" />
        ) : (
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">
            <Building2 className="w-5 h-5" />
          </div>
        )}
        <span className="text-xl font-bold tracking-tight truncate">{settings?.name || 'Company'}</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        {links.map((link) => {
          if (link.adminOnly && !isAdmin) return null;
          
          if (link.subItems) {
            return (
              <div key={link.name} className="space-y-1">
                <button
                  onClick={() => setIsDocsOpen(!isDocsOpen)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center">
                    <link.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    {link.name}
                  </div>
                  {isDocsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {isDocsOpen && (
                  <div className="pl-10 space-y-1">
                    <NavLink
                      to="/documents"
                      end
                      className={({ isActive }) =>
                        cn(
                          'block px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        )
                      }
                    >
                      All Documents
                    </NavLink>
                    {link.subItems.map((sub) => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={({ isActive }) =>
                          cn(
                            'block px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-indigo-600/20 text-indigo-400'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          )
                        }
                      >
                        {sub.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <link.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {link.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium uppercase">
            {profile?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{profile?.fullName || user?.email}</p>
            <p className="text-xs text-slate-400 truncate">{isAdmin ? 'Admin' : profile?.department || 'Employee'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign out
        </button>
      </div>
    </div>
  );
}
