import React, { useState } from 'react';
import client from '../api/client';
import ReactMarkdown from 'react-markdown';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

export const SummaryGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setSummary('');

        try {
            const res = await client.post('/summarize', { topic });
            if (res.data.success) {
                setSummary(res.data.summary);
            } else {
                toast.error(res.data.error || "Failed to generate summary");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to generate summary");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!summary) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const content = document.getElementById('summary-content');
            if (!content) return;

            const canvas = await html2canvas(content, {
                scale: 2,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`summary-${topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);

            toast.success("Summary exported as PDF!");
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export PDF");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <FileText className="mr-2 text-primary" />
                    Generate Summary
                </h2>
                <p className="text-muted-foreground mb-6">
                    Enter a topic to generate a comprehensive summary from your uploaded documents.
                </p>

                <form onSubmit={handleGenerate} className="flex gap-4">
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter topic (e.g., 'Thermodynamics Laws', 'History of Rome')"
                        className="flex-1 px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !topic.trim()}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Generate
                    </button>
                </form>
            </div>

            {summary && (
                <div className="bg-card p-8 rounded-lg shadow-sm border border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                        <h3 className="text-xl font-semibold">Summary: {topic}</h3>
                        <button
                            onClick={handleExport}
                            className="flex items-center text-sm text-primary hover:underline"
                        >
                            <Download className="mr-1 h-4 w-4" />
                            Export
                        </button>
                    </div>
                    <div id="summary-content" className="prose prose-sm dark:prose-invert max-w-none p-6 bg-white dark:bg-card rounded-md shadow-sm">
                        <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">{topic}</h1>
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 text-primary" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};
