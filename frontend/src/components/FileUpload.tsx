import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import client from '../api/client';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadStatus {
    uploaded_documents: number;
    documents: any[];
}

export const FileUpload: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<UploadStatus | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await client.get('/status');
            if (res.data.success) {
                setStatus(res.data.status);
            }
        } catch (error) {
            console.error("Failed to fetch status", error);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Filter duplicates
        const newFiles = acceptedFiles.filter(
            (file) => !files.some((f) => f.name === file.name)
        );

        if (newFiles.length + files.length > 5) {
            toast.error("Max 5 files per upload batch");
            return;
        }

        setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }, [files]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'text/plain': ['.txt'],
            'text/markdown': ['.md']
        },
        maxFiles: 5
    });

    const removeFile = (name: string) => {
        setFiles((prev) => prev.filter((f) => f.name !== name));
    };

    const [progress, setProgress] = useState(0);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setUploadSuccess(false);
        setProgress(0);

        // Simulate progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev;
                return prev + 10;
            });
        }, 500);

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        try {
            const res = await client.post('/upload_files', formData);

            clearInterval(interval);
            setProgress(100);

            if (res.data.success) {
                setUploadSuccess(true);
                toast.success("Files uploaded successfully!");
                setTimeout(() => {
                    setFiles([]);
                    setUploadSuccess(false);
                    setProgress(0);
                    fetchStatus();
                }, 1500);
            } else {
                toast.error(res.data.error || "Upload failed");
            }
        } catch (error: any) {
            clearInterval(interval);
            setProgress(0);
            toast.error(error.response?.data?.error || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                <h2 className="text-2xl font-bold mb-4">Upload Course Materials</h2>
                <p className="text-muted-foreground mb-6">
                    Upload PDF, DOCX, PPTX, TXT, or MD files. Max 5 files at a time.
                </p>

                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">
                        {isDragActive ? "Drop files here..." : "Drag & drop files here, or click to select"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Supported formats: PDF, DOCX, PPTX, TXT, MD
                    </p>
                </div>

                <AnimatePresence>
                    {files.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 space-y-3"
                        >
                            {files.map((file) => (
                                <div key={file.name} className="flex items-center justify-between p-3 bg-muted rounded-md">
                                    <div className="flex items-center">
                                        <File className="h-5 w-5 mr-3 text-primary" />
                                        <span className="text-sm font-medium">{file.name}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeFile(file.name)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}

                            {uploading ? (
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Uploading...</span>
                                        <span className="font-medium">{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                            ) : uploadSuccess ? (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="mt-4 p-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-md flex items-center justify-center font-medium"
                                >
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    Upload Complete!
                                </motion.div>
                            ) : (
                                <button
                                    onClick={handleUpload}
                                    className="w-full mt-4 bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Upload {files.length} Files
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                <h3 className="text-lg font-semibold mb-4">Your Documents</h3>
                {status ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Uploaded:</span>
                            <span className="font-medium">{status.uploaded_documents} / 50</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-500"
                                style={{ width: `${(status.uploaded_documents / 50) * 100}%` }}
                            />
                        </div>

                        <div className="mt-4 space-y-2">
                            {status.documents.map((doc: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 hover:bg-muted rounded">
                                    <div className="flex items-center">
                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                        <span className="truncate max-w-xs">{doc.filename}</span>
                                    </div>
                                    <span className="text-muted-foreground text-xs">
                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                            {status.documents.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}
            </div>
        </div>
    );
};
