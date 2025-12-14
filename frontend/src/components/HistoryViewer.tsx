import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { History, Search, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface HistoryItem {
    question: string;
    answer: string;
    sources: string[];
    timestamp: string;
}

export const HistoryViewer: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await client.get('/history?limit=50');
                if (res.data.success) {
                    setHistory(res.data.history);
                }
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const filteredHistory = history.filter(item =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleExpand = (idx: number) => {
        setExpandedIndex(expandedIndex === idx ? null : idx);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center">
                    <History className="mr-2 text-primary" />
                    Conversation History
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search history..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary w-64"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border">
                    <p>No history found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredHistory.map((item, idx) => (
                        <div key={idx} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleExpand(idx)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                            >
                                <div className="flex-1 pr-4">
                                    <p className="font-medium text-foreground">{item.question}</p>
                                    <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {new Date(item.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                {expandedIndex === idx ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                            </button>

                            {expandedIndex === idx && (
                                <div className="px-6 py-4 border-t border-border bg-muted/20">
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{item.answer}</ReactMarkdown>
                                    </div>
                                    {item.sources && item.sources.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                                            <span className="font-semibold">Sources:</span> {item.sources.join(', ')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
