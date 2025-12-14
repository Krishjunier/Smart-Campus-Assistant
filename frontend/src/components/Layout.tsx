import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
            <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M0%2020h40v1H0z%22%2F%3E%3Cpath%20d%3D%22M20%200v40h1V0z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] pointer-events-none" />

            <Sidebar />
            <main className="relative flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
