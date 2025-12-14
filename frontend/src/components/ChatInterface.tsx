import React, { useState, useRef, useEffect } from 'react';
import client from '../api/client';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, BookOpen, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    type?: 'rag' | 'wikipedia';
}

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await client.post('/ask', { question: userMsg.content });
            if (res.data.success) {
                const botMsg: Message = {
                    role: 'assistant',
                    content: res.data.answer,
                    sources: res.data.sources,
                    type: res.data.type
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: res.data.error || "Sorry, I encountered an error." }]);
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: error.response?.data?.error || "Sorry, I encountered an error." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Bot className="h-16 w-16 mb-4 opacity-50 text-primary" />
                        <p className="text-lg font-medium">Ask me anything about your course materials!</p>
                        <p className="text-sm mt-2">I can answer questions, summarize topics, and help you study.</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mx-2 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                                }`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>

                            <div className={`p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-muted text-foreground rounded-tl-none'
                                }`}>
                                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none break-words">
                                    {msg.content}
                                </ReactMarkdown>

                                {msg.role === 'assistant' && (
                                    <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2">
                                        {msg.type && (
                                            <div className="flex items-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.type === 'rag' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    }`}>
                                                    {msg.type === 'rag' ? <BookOpen size={12} className="mr-1" /> : <Globe size={12} className="mr-1" />}
                                                    {msg.type === 'rag' ? 'Document Context' : 'Wikipedia Fallback'}
                                                </span>
                                            </div>
                                        )}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="text-xs opacity-70">
                                                <span className="font-semibold">Sources:</span> {msg.sources.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-center space-x-2 bg-muted p-4 rounded-2xl rounded-tl-none ml-12">
                            <span className="text-xs text-muted-foreground mr-2">AI is thinking</span>
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border bg-card">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question..."
                        className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[3rem]"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};
