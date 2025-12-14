import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, FileText, GraduationCap, Upload, Sparkles, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { motion } from 'framer-motion';

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [statsData, setStatsData] = useState({
        documents: 0,
        questions: 0,
        study_hours: 0,
        quiz_score: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await client.get('/dashboard');
                if (res.data.success) {
                    setStatsData(res.data.stats);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        {
            to: 'upload',
            icon: Upload,
            title: 'Upload Materials',
            desc: 'Upload your course documents (PDF, DOCX, etc.)',
            gradient: 'from-blue-500 to-cyan-400',
            bgGradient: 'from-blue-500/10 to-cyan-400/10'
        },
        {
            to: 'chat',
            icon: MessageSquare,
            title: 'AI Chat Assistant',
            desc: 'Ask questions and get instant answers',
            gradient: 'from-emerald-500 to-teal-400',
            bgGradient: 'from-emerald-500/10 to-teal-400/10'
        },
        {
            to: 'summary',
            icon: FileText,
            title: 'Generate Summaries',
            desc: 'Get concise summaries of complex topics',
            gradient: 'from-violet-500 to-purple-400',
            bgGradient: 'from-violet-500/10 to-purple-400/10'
        },
        {
            to: 'quiz',
            icon: GraduationCap,
            title: 'Practice Quizzes',
            desc: 'Test your knowledge with AI-generated quizzes',
            gradient: 'from-orange-500 to-amber-400',
            bgGradient: 'from-orange-500/10 to-amber-400/10'
        },
    ];

    const stats = [
        { label: 'Documents', value: statsData.documents.toString(), icon: BookOpen, color: 'text-blue-500' },
        { label: 'Questions Asked', value: statsData.questions.toString(), icon: MessageSquare, color: 'text-emerald-500' },
        { label: 'Study Hours', value: `${statsData.study_hours}h`, icon: Clock, color: 'text-violet-500' },
        { label: 'Quiz Score', value: `${statsData.quiz_score}%`, icon: TrendingUp, color: 'text-amber-500' },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl"
            >
                <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-yellow-300" />
                        <span className="text-sm font-medium text-white/80">AI-Powered Learning</span>
                    </div>
                    <h1 className="text-4xl font-bold mb-2">
                        Welcome back, {user?.name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-lg text-white/80 max-w-2xl">
                        Ready to accelerate your learning? Your AI assistant is here to help you study smarter.
                    </p>
                </div>
            </motion.div>

            {/* Stats Section */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                {stats.map((stat) => (
                    <motion.div
                        key={stat.label}
                        variants={itemVariants}
                        className="glass-card rounded-2xl p-5 hover-card"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                        </div>
                        <p className="text-3xl font-bold">{stat.value}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Features Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span className="text-gradient">Quick Actions</span>
                </h2>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {cards.map((card) => (
                        <motion.div key={card.to} variants={itemVariants}>
                            <Link
                                to={card.to}
                                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bgGradient} p-6 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 block`}
                            >
                                {/* Background decoration */}
                                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${card.gradient} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity`} />

                                <div className="relative z-10 flex items-start gap-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
                                        <card.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                                            {card.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {card.desc}
                                        </p>
                                    </div>
                                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Tips Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-6"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Pro Tip</h3>
                        <p className="text-sm text-muted-foreground">
                            Upload your course materials first to get the most personalized AI responses.
                            The more context you provide, the better answers you'll receive!
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
