import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Layout } from './components/Layout';
import { ChatInterface } from './components/ChatInterface';
import { FileUpload } from './components/FileUpload';
import { SummaryGenerator } from './components/SummaryGenerator';
import { QuizGenerator } from './components/QuizGenerator';
import { HistoryViewer } from './components/HistoryViewer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="chat" element={<ChatInterface />} />
                <Route path="upload" element={<FileUpload />} />
                <Route path="summary" element={<SummaryGenerator />} />
                <Route path="quiz" element={<QuizGenerator />} />
                <Route path="history" element={<HistoryViewer />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <AppRoutes />
                <ToastContainer position="bottom-right" theme="colored" />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
