import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { MessageSquare, FileText, GraduationCap, History, LogOut, Upload, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
    const { logout, user } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/dashboard/chat', icon: MessageSquare, label: 'AI Chat' },
        { to: '/dashboard/summary', icon: FileText, label: 'Summaries' },
        { to: '/dashboard/quiz', icon: GraduationCap, label: 'Quizzes' },
        { to: '/dashboard/history', icon: History, label: 'History' },
        { to: '/dashboard/upload', icon: Upload, label: 'Upload Docs' },
    ];

    return (
        <div className="flex flex-col h-full w-72 bg-card/50 backdrop-blur-xl border-r border-border">
            {/* Logo Section */}
            <div className="p-6 border-b border-border">
                <Link to="/dashboard" className="flex items-center gap-3 group">
                    <div className="relative">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/25">
                            SC
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Smart Campus</h1>
                        <p className="text-xs text-muted-foreground">AI Learning Assistant</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
                <nav className="space-y-1 px-3">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                                    isActive
                                        ? 'bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-primary shadow-sm border border-primary/10'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )
                            }
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* User Section */}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};
