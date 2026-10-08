/**
 * TEST ONBOARDING UPLOAD PAGE FOR UI/UX ADJUSTMENTS
 * 
 * This is a test page that mirrors the onboarding upload step (Step4UploadFiles).
 * Any UI/UX changes made here can be applied to the real component at /components/onboarding/Step4UploadFiles.tsx
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import RateLimitModal from '@/components/RateLimitModal';

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function TestOnboardingUploadPage() {
  const { user } = useUser();
  
  // Animation states
  const [isLoaded, setIsLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [headerLoaded, setHeaderLoaded] = useState(false);
  const [formLoaded, setFormLoaded] = useState(false);

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [userName, setUserName] = useState(user?.firstName || "You");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Info modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Rate limit state
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitData, setRateLimitData] = useState({
    count: 0,
    limit: 10,
    remaining: 10,
    showWarning: false,
    isBlocked: false,
  });
  
  // Name detection states
  const [detectedSenders, setDetectedSenders] = useState<{name: string, frequency: number}[]>([]);
  const [isAnalyzingNames, setIsAnalyzingNames] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [nameDetectionMode, setNameDetectionMode] = useState<'auto' | 'manual'>('auto');

  // Create a ref for the file input
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check rate limit
  const checkRateLimit = async () => {
    try {
      const response = await fetch('/api/rate-limit', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check rate limit');
      }

      const data = await response.json();
      setRateLimitData(data);
      return data;
    } catch (err) {
      console.error('Error checking rate limit:', err);
      // On error, allow processing to continue
      return { isBlocked: false, showWarning: false };
    }
  };

  useEffect(() => {
    const timer1 = setTimeout(() => setIsLoaded(true), 200);
    const timer2 = setTimeout(() => setLogoLoaded(true), 400);
    const timer3 = setTimeout(() => setHeaderLoaded(true), 700);
    const timer4 = setTimeout(() => setFormLoaded(true), 1000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);


  // File validation
  const validateFiles = (fileList: File[]): string | null => {
    if (fileList.length + files.length > MAX_FILES) {
      return `You can upload a maximum of ${MAX_FILES} files.`;
    }
    for (const file of fileList) {
      if (file.type !== 'text/plain') {
        return 'Invalid file type. Please upload .txt files only.';
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`;
      }
    }
    return null;
  };

  // Analyze files to detect sender names
  const analyzeSenderNames = async (fileList: File[]) => {
    setIsAnalyzingNames(true);
    const sendersByFile: { [fileName: string]: Set<string> } = {};
    const allSenderCounts: { [key: string]: number } = {};
    
    try {
      // Read each file and extract sender names
      for (const file of fileList) {
        const text = await file.text();
        const fileSenders = new Set<string>();
        
        // Multiple regex patterns to match different WhatsApp export formats
        const patterns = [
          // Format 1: [DD/MM/YY, HH:MM:SS] Sender: Message
          /\[\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4}),\s*\d{2}:\d{2}:\d{2}\]\s*([^:]+):/g,
          // Format 2: DD/MM/YYYY, HH:MM - Sender: Message
          /\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*-\s*([^:]+):/g,
          // Format 3: MM/DD/YY, HH:MM AM/PM - Sender: Message
          /\d{1,2}\/\d{1,2}\/\d{2},\s*\d{1,2}:\d{2}\s*[AP]M\s*-\s*([^:]+):/g,
          // Format 4: YYYY-MM-DD HH:MM:SS: Sender: Message
          /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}:\s*([^:]+):/g
        ];
        
        // Try each pattern
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            const sender = match[1].trim();
            // Skip system messages
            if (sender && !sender.includes('added') && !sender.includes('removed') && 
                !sender.includes('created') && !sender.includes('changed')) {
              fileSenders.add(sender);
              allSenderCounts[sender] = (allSenderCounts[sender] || 0) + 1;
            }
          }
        }
        
        sendersByFile[file.name] = fileSenders;
      }
      
      // For multiple files, find senders that appear in multiple files
      if (fileList.length > 1) {
        const senderFileCount: { [key: string]: number } = {};
        
        // Count how many files each sender appears in
        for (const senders of Object.values(sendersByFile)) {
          for (const sender of senders) {
            senderFileCount[sender] = (senderFileCount[sender] || 0) + 1;
          }
        }
        
        // Find senders that appear in multiple files
        const sendersInMultipleFiles = Object.entries(senderFileCount)
          .filter(([_, count]) => count > 1)
          .map(([name, _]) => name);
        
        if (sendersInMultipleFiles.length === 1) {
          // Only one sender appears in multiple files - that's our user!
          setUserName(sendersInMultipleFiles[0]);
          setNameDetectionMode('auto');
        } else if (sendersInMultipleFiles.length > 1) {
          // Multiple senders appear in multiple files - pick the one with most messages
          const sortedByCounts = sendersInMultipleFiles
            .map(name => ({ name, frequency: allSenderCounts[name] }))
            .sort((a, b) => b.frequency! - a.frequency!);
          setUserName(sortedByCounts[0].name);
          setNameDetectionMode('auto');
        } else {
          // No sender appears in multiple files - fall back to most frequent
          const senders = Object.entries(allSenderCounts)
            .map(([name, frequency]) => ({ name, frequency }))
            .sort((a, b) => b.frequency! - a.frequency!);
          setDetectedSenders(senders);
          if (senders.length > 0) {
            setUserName(senders[0].name);
            setNameDetectionMode('auto');
          }
        }
      } else {
        // Single file - show dropdown for user to select
        const senders = Object.entries(allSenderCounts)
          .map(([name, frequency]) => ({ name, frequency }))
          .sort((a, b) => b.frequency! - a.frequency!);
        
        setDetectedSenders(senders);
        
        // For single file, check if "You" exists
        const youIndex = senders.findIndex(s => s.name.toLowerCase() === 'you');
        if (youIndex !== -1) {
          setUserName(senders[youIndex].name);
        } else if (senders.length > 0) {
          // Don't auto-select for single file, but set first as default
          setUserName(senders[0].name);
        }
      }
    } catch (err) {
      console.error('Error analyzing sender names:', err);
      // Fall back to manual entry if analysis fails
      setNameDetectionMode('manual');
    } finally {
      setIsAnalyzingNames(false);
    }
  };

  // File handling
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      console.log('Files selected:', newFiles.length);
      const validationError = validateFiles(newFiles);
      if (validationError) {
        setError(validationError);
      } else {
        const updatedFiles = [...files, ...newFiles].slice(0, MAX_FILES);
        setFiles(updatedFiles);
        setError(null);
        // Analyze all files (including previously added ones)
        analyzeSenderNames(updatedFiles);
      }
      // Reset the input value so the same file can be selected again if needed
      event.target.value = '';
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    const validationError = validateFiles(droppedFiles);
    if (validationError) {
      setError(validationError);
    } else {
      setFiles((prevFiles) => {
        const updatedFiles = [...prevFiles, ...droppedFiles].slice(0, MAX_FILES);
        // Analyze all files after updating
        analyzeSenderNames(updatedFiles);
        return updatedFiles;
      });
      setError(null);
    }
  }, [files]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((_, i) => i !== index);
      // Re-analyze sender names if files remain
      if (updatedFiles.length > 0) {
        analyzeSenderNames(updatedFiles);
      } else {
        // Reset to defaults if no files
        setDetectedSenders([]);
        setUserName(user?.firstName || "You");
        setNameDetectionMode('auto');
        setShowManualInput(false);
      }
      return updatedFiles;
    });
  };

  // Test upload handling (no actual processing)
  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select files to upload.');
      return;
    }
    
    setError(null);
    setIsUploading(true);

    try {
      // Check rate limit before processing
      const rateLimitCheck = await checkRateLimit();
      
      if (rateLimitCheck.isBlocked) {
        setIsUploading(false);
        setShowRateLimitModal(true);
        return;
      }
      
      // Show warning if approaching limit
      if (rateLimitCheck.showWarning) {
        setShowRateLimitModal(true);
        // Don't return here - allow them to continue after seeing the warning
      }
      
      // Simulate processing for test page
      console.log('[TEST PAGE] Would process files:', files.map(f => f.name));
      console.log('[TEST PAGE] Selected user name:', userName);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Test successful! In the real app, this would start processing.');
      
    } catch (err: any) {
      console.error('Test upload error:', err);
      const errorMsg = err instanceof Error ? err.message : "Test failed. Please try again.";
      setError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 700;
        }
        
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 500;
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          0% { 
            opacity: 0;
            transform: translateY(-4px);
          }
          100% { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Test UI Notice */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFA500',
        color: '#000',
        textAlign: 'center',
        padding: '8px',
        fontSize: '14px',
        fontWeight: 600,
        zIndex: 1000
      }}>
        TEST PAGE - Changes here should be applied to /components/onboarding/Step4UploadFiles.tsx
      </div>

      <div style={{
        backgroundColor: '#F5F2F0',
        height: '100vh',
        width: '100vw',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        fontFamily: '"Inter", sans-serif',
        fontSize: '12px',
        lineHeight: '1.15',
        textSizeAdjust: '100%' as any,
        WebkitFontSmoothing: 'antialiased' as any,
        MozOsxFontSmoothing: 'grayscale' as any,
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        willChange: 'transform'
      }}>
        {/* Background Gradient Animation */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #F5F2F0 0%, #F8F5F3 50%, #F5F2F0 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease-in-out infinite',
          zIndex: -1
        }} />

        {/* Main Content Container */}
        <div style={{
          alignContent: 'center',
          alignItems: 'center',
          display: 'flex',
          flex: 'none',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          gap: '24px',
          height: 'min-content',
          justifyContent: 'center',
          overflow: 'visible',
          padding: '20px',
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          transform: isLoaded ? 'translateY(-20px)' : 'translateY(0px)',
          opacity: isLoaded ? 1 : 0,
          transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform, opacity'
        }}>
          {/* Logo */}
          <div style={{
            opacity: logoLoaded ? 0.8 : 0,
            transform: logoLoaded ? 'translateY(0px) scale(1)' : 'translateY(15px) scale(0.95)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, opacity'
          }}>
            <img 
              src="/logos/cognition.cv.svg"
              alt="Cognition.CV"
              style={{
                height: '24px',
                width: 'auto',
                objectFit: 'contain',
                filter: 'brightness(0) saturate(100%)'
              }}
            />
          </div>

          {/* Header */}
          <div style={{
            textAlign: 'center',
            opacity: headerLoaded ? 1 : 0,
            transform: headerLoaded ? 'translateY(0px)' : 'translateY(25px)',
            transition: 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform, opacity',
            position: 'relative'
          }}>
            <div style={{
              fontSize: '24px',
              color: 'rgb(61, 0, 0)',
              lineHeight: '1.15',
              margin: 0,
              fontWeight: 400,
              fontFamily: '"Inter", sans-serif',
              opacity: 0.8,
              WebkitFontSmoothing: 'antialiased' as any,
              MozOsxFontSmoothing: 'grayscale' as any,
              textSizeAdjust: '100%' as any,
              boxSizing: 'border-box',
              textAlign: 'center',
              whiteSpace: 'nowrap' as any
            }}>
              Begin the journey of discovering the narrative<br />
              woven into your conversations. Your data stays on your<br />
              device. Processing happens locally.
            </div>
            
            {/* Info Icon - only show when files are uploaded */}
            {files.length > 0 && (
              <button
                onClick={() => setShowInfoModal(true)}
                style={{
                  position: 'absolute',
                  top: '0',
                  right: '-40px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(61, 0, 0, 0.05)',
                  border: '1px solid rgba(61, 0, 0, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: 'rgb(61, 0, 0)',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  opacity: 0.7
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.2)';
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.1)';
                  e.currentTarget.style.opacity = '0.7';
                }}
              >
                i
              </button>
            )}
          </div>

          {/* Initial Upload Buttons - only show when no files */}
          {files.length === 0 && (
            <>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: formLoaded ? 1 : 0.001,
                transform: formLoaded ? 'translateY(0px)' : 'translateY(-24px)',
                transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                willChange: 'transform'
              }}>
                <button
                  onClick={() => {
                    console.log('Upload button clicked');
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    } else {
                      console.error('File input ref not found');
                    }
                  }}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: 'rgb(61, 0, 0)',
                    color: 'rgb(255, 255, 255)',
                    border: '2px solid rgb(61, 0, 0)',
                    borderRadius: '187px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
                    lineHeight: '1.3',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    overflow: 'hidden',
                    width: 'min-content',
                    height: 'min-content',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgb(61, 0, 0)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(61, 0, 0)';
                    e.currentTarget.style.color = 'rgb(255, 255, 255)';
                  }}
                >
                  <strong style={{ fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif' }}>
                    Upload Your WhatsApp Conversations
                  </strong>
                </button>
                
                <button
                  onClick={() => setShowInfoModal(true)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    color: 'rgb(61, 0, 0)',
                    border: '1px solid rgba(61, 0, 0, 0.3)',
                    borderRadius: '187px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: '"Inter", sans-serif',
                    lineHeight: '1.3',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    overflow: 'hidden',
                    width: 'min-content',
                    height: 'min-content',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.3)';
                  }}
                >
                  <span>Step-by-Step Guide</span>
                </button>
              </div>
              
              {/* Notes section - clean modern style - positioned absolutely to not affect main content */}
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '520px',
                width: '100vw',
                paddingLeft: '20px',
                paddingRight: '20px',
                opacity: formLoaded ? 1 : 0,
                transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transitionDelay: '0.3s',
                zIndex: 10
              }}>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid rgba(61, 0, 0, 0.06)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'grid',
                    gap: '20px'
                  }}>
                    {/* Current Limitations */}
                    <div style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ 
                        fontSize: '18px', 
                        flexShrink: 0,
                        filter: 'saturate(0.8)'
                      }}>💡</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          color: 'rgb(61, 0, 0)', 
                          fontFamily: '"Inter", sans-serif', 
                          fontSize: '14px',
                          fontWeight: 600,
                          margin: '0 0 6px 0',
                          lineHeight: '1.3'
                        }}>Current Limitations</h4>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(61, 0, 0, 0.65)',
                          margin: 0,
                          lineHeight: '1.6',
                          fontFamily: '"Inter", sans-serif',
                          fontWeight: 400
                        }}>
                          We're working hard to expand our capacity so you can upload up to 100 conversations at once. This upgrade should be ready in the next couple of weeks, and we'll send you an email the moment it's available!
                        </p>
                      </div>
                    </div>
                    
                    {/* Optimal Experience */}
                    <div style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ 
                        fontSize: '18px', 
                        flexShrink: 0,
                        filter: 'saturate(0.8)'
                      }}>💻</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          color: 'rgb(61, 0, 0)', 
                          fontFamily: '"Inter", sans-serif', 
                          fontSize: '14px',
                          fontWeight: 600,
                          margin: '0 0 6px 0',
                          lineHeight: '1.3'
                        }}>Optimal Experience</h4>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(61, 0, 0, 0.65)',
                          margin: 0,
                          lineHeight: '1.6',
                          fontFamily: '"Inter", sans-serif',
                          fontWeight: 400
                        }}>
                          For optimal results, we recommend using a laptop with Google Chrome when uploading and processing your conversations. Some users have run into issues on mobile devices, so if you're on your phone, consider emailing the file to yourself for desktop processing.
                        </p>
                      </div>
                    </div>
                    
                    {/* Bug Reports */}
                    <div style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ 
                        fontSize: '18px', 
                        flexShrink: 0,
                        filter: 'saturate(0.8)'
                      }}>👾</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          color: 'rgb(61, 0, 0)', 
                          fontFamily: '"Inter", sans-serif', 
                          fontSize: '14px',
                          fontWeight: 600,
                          margin: '0 0 6px 0',
                          lineHeight: '1.3'
                        }}>Bug Reports</h4>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(61, 0, 0, 0.65)',
                          margin: 0,
                          lineHeight: '1.6',
                          fontFamily: '"Inter", sans-serif',
                          fontWeight: 400
                        }}>
                          We're actively squashing bugs as they pop up! If you encounter any problems, shoot us an email at support@cognition.cv and we'll get it fixed ASAP.
                        </p>
                      </div>
                    </div>
                    
                    {/* Upcoming Features */}
                    <div style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ 
                        fontSize: '18px', 
                        flexShrink: 0,
                        filter: 'saturate(0.8)'
                      }}>🚀</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          color: 'rgb(61, 0, 0)', 
                          fontFamily: '"Inter", sans-serif', 
                          fontSize: '14px',
                          fontWeight: 600,
                          margin: '0 0 6px 0',
                          lineHeight: '1.3'
                        }}>Upcoming Features</h4>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(61, 0, 0, 0.65)',
                          margin: 0,
                          lineHeight: '1.6',
                          fontFamily: '"Inter", sans-serif',
                          fontWeight: 400
                        }}>
                          We're a small team building at lightning speed! You'll automatically get access to all the exciting new features and insights we're rolling out each month. We'll drop you an email whenever there's something fresh to explore.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Extra spacing at bottom */}
                <div style={{ height: '40px' }} />
              </div>
            </>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt"
            onChange={handleFileChange}
            style={{ 
              display: 'none',
              position: 'absolute',
              left: '-9999px',
              top: '-9999px',
              opacity: 0,
              pointerEvents: 'none'
            }}
          />

          {/* Clean File List */}
          {files.length > 0 && (
            <div style={{
              width: '100%',
              maxWidth: '400px',
              opacity: formLoaded ? 1 : 0,
              transform: formLoaded ? 'translateY(0px)' : 'translateY(10px)',
              transition: 'all 0.5s ease',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '14px',
                color: 'rgba(61, 0, 0, 0.8)',
                fontFamily: '"Inter", sans-serif',
                textAlign: 'center',
                marginBottom: '12px',
                fontWeight: 500
              }}>
                {files.length} file{files.length === 1 ? '' : 's'} selected
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                maxHeight: '120px',
                overflowY: 'auto',
                padding: '2px'
              }}>
                {files.map((file, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: '"Inter", sans-serif',
                    border: '1px solid rgba(61, 0, 0, 0.08)',
                    backdropFilter: 'blur(10px)',
                    minHeight: '40px',
                    flexShrink: 0
                  }}>
                    <span style={{ 
                      color: 'rgb(61, 0, 0)', 
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginRight: '12px',
                      flex: 1
                    }}>
                      {file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(61, 0, 0, 0.4)',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                        e.currentTarget.style.color = '#dc3545';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'rgba(61, 0, 0, 0.4)';
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Name Selection UI - Only show for single file */}
          {files.length === 1 && !isUploading && (
            <div style={{
              width: '100%',
              maxWidth: '400px',
              marginTop: '8px',
              opacity: formLoaded && !isAnalyzingNames ? 1 : 0.7,
              transform: formLoaded ? 'translateY(0px)' : 'translateY(10px)',
              transition: 'all 0.5s ease'
            }}>
              {isAnalyzingNames ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '12px',
                  border: '1px solid rgba(61, 0, 0, 0.08)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(61, 0, 0, 0.2)',
                    borderTopColor: 'rgb(61, 0, 0)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginRight: '12px'
                  }} />
                  <span style={{
                    fontSize: '14px',
                    color: 'rgba(61, 0, 0, 0.7)',
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 500
                  }}>
                    Analyzing participants...
                  </span>
                </div>
              ) : detectedSenders.length > 0 && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '12px',
                  border: '1px solid rgba(61, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <label style={{
                    fontSize: '12px',
                    color: 'rgba(61, 0, 0, 0.6)',
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    Select Your Name
                  </label>
                  <select
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '30px',
                      backgroundColor: 'rgba(61, 0, 0, 0.02)',
                      border: '1px solid rgba(61, 0, 0, 0.1)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'rgb(61, 0, 0)',
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: 500,
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233D0000' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.3)';
                      e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.04)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.02)';
                    }}
                  >
                    {detectedSenders.map((sender, idx) => (
                      <option key={idx} value={sender.name}>
                        {sender.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              fontSize: '14px',
              color: '#dc3545',
              fontFamily: '"Inter", sans-serif',
              textAlign: 'center',
              marginTop: '8px'
            }}>
              {error}
            </div>
          )}

          {/* Action Buttons - only show when files are selected */}
          {files.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '16px',
              opacity: formLoaded ? 1 : 0,
              transform: formLoaded ? 'translateY(0px)' : 'translateY(10px)',
              transition: 'all 0.5s ease'
            }}>
              {/* Begin Analysis Button */}
              <button
                onClick={handleUpload}
                disabled={isUploading}
                style={{
                  padding: '12px 20px',
                  backgroundColor: isUploading ? 'rgba(61, 0, 0, 0.6)' : 'rgb(61, 0, 0)',
                  color: 'rgb(255, 255, 255)',
                  border: '2px solid rgb(61, 0, 0)',
                  borderRadius: '187px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
                  lineHeight: '1.3',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  overflow: 'hidden',
                  width: 'min-content',
                  height: 'min-content',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  if (!isUploading) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgb(61, 0, 0)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isUploading) {
                    e.currentTarget.style.backgroundColor = 'rgb(61, 0, 0)';
                    e.currentTarget.style.color = 'rgb(255, 255, 255)';
                  }
                }}
              >
                <strong style={{ fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif' }}>
                  {isUploading ? 'Processing...' : 'Begin Analysis'}
                </strong>
              </button>

                             {/* Add More Files Button */}
               {!isUploading && (
                 <button
                   onClick={() => {
                     console.log('Add more files button clicked');
                     if (fileInputRef.current) {
                       fileInputRef.current.click();
                     } else {
                       console.error('File input ref not found');
                     }
                   }}
                   style={{
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    color: 'rgb(61, 0, 0)',
                    border: '1px solid rgba(61, 0, 0, 0.3)',
                    borderRadius: '187px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: '"Inter", sans-serif',
                    lineHeight: '1.3',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    overflow: 'hidden',
                    width: 'min-content',
                    height: 'min-content',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(61, 0, 0, 0.3)';
                  }}
                >
                  <span style={{ fontSize: '12px' }}>+</span>
                  <span>Add more files</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Rate Limit Modal */}
      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => {
          setShowRateLimitModal(false);
          // If blocked, don't continue with upload
          if (!rateLimitData.isBlocked) {
            // Modal was just a warning, continue processing if upload was in progress
            if (isUploading && !rateLimitData.isBlocked) {
              // Continue with the upload process
            }
          } else {
            setIsUploading(false);
          }
        }}
        currentUsage={rateLimitData.count}
        limit={rateLimitData.limit}
        isWarning={rateLimitData.showWarning && !rateLimitData.isBlocked}
      />
      
      {/* Info Modal */}
      {showInfoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.3s ease'
        }}
        onClick={() => setShowInfoModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '680px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              animation: 'fadeIn 0.3s ease',
              transform: 'scale(1)',
              transition: 'transform 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowInfoModal(false)}
              className="modal-close-button"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                border: '2px solid rgba(61, 0, 0, 0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 600,
                color: 'rgba(61, 0, 0, 0.5)',
                transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.3s ease',
                transform: 'rotate(0deg)',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                fontFamily: '"Inter", sans-serif',
                lineHeight: 1,
                padding: 0,
                boxSizing: 'border-box',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                backfaceVisibility: 'hidden',
                willChange: 'transform'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.backgroundColor = 'rgba(61, 0, 0, 0.05)';
                target.style.borderColor = 'rgba(61, 0, 0, 0.2)';
                target.style.color = 'rgb(61, 0, 0)';
                target.style.transform = 'rotate(90deg) scale(1.05)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.backgroundColor = 'transparent';
                target.style.borderColor = 'rgba(61, 0, 0, 0.1)';
                target.style.color = 'rgba(61, 0, 0, 0.5)';
                target.style.transform = 'rotate(0deg) scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'rotate(90deg) scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'rotate(90deg) scale(1.05)';
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid rgba(61, 0, 0, 0.3)';
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              aria-label="Close modal"
              type="button"
            >
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 14 14" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ pointerEvents: 'none' }}
              >
                <path 
                  d="M13 1L1 13M1 1L13 13" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            
            {/* Steps List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '24px',
              maxWidth: '600px',
              margin: '0 auto 24px auto'
            }}>
              {/* Step 1 */}
              <div style={{
                backgroundColor: 'rgba(245, 242, 240, 0.5)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(61, 0, 0, 0.08)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '100%',
                  height: 'auto',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <img 
                    src="/onboardingsteps/step1.webp" 
                    alt="Step 1: Open your chat"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'rgb(61, 0, 0)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  Step 1: Open one of your 3 chats
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(61, 0, 0, 0.7)',
                  lineHeight: '1.6',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  • Open WhatsApp.<br />
                  • Enter one of your top-3 most-active conversations.<br />
                  • <em>iPhone:</em> tap the name bar at the top.<br />
                  • <em>Android:</em> just stay in the chat for now (you'll hit ⋮ in the next step).
                </div>
              </div>
              
              {/* Step 2 */}
              <div style={{
                backgroundColor: 'rgba(245, 242, 240, 0.5)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(61, 0, 0, 0.08)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '100%',
                  height: 'auto',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <img 
                    src="/onboardingsteps/step2.webp" 
                    alt="Step 2: Find the export option"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'rgb(61, 0, 0)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  Step 2: Find "Export chat"
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(61, 0, 0, 0.7)',
                  lineHeight: '1.6',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  • <em>iPhone:</em> In the Chat Info screen, scroll to Export chat.<br />
                  • <em>Android:</em> Tap ⋮ → More → Export chat.
                </div>
              </div>
              
              {/* Step 3 */}
              <div style={{
                backgroundColor: 'rgba(245, 242, 240, 0.5)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(61, 0, 0, 0.08)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '100%',
                  height: 'auto',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <img 
                    src="/onboardingsteps/step3.webp" 
                    alt="Step 3: Export without media"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'rgb(61, 0, 0)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  Step 3: Export without media
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(61, 0, 0, 0.7)',
                  lineHeight: '1.6',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  • When asked, choose <em>Without Media</em> – keeps the file tiny.<br />
                  • WhatsApp generates a plain-text "WhatsApp Chat – ….txt" (if you batch-export several, you'll get a zipped bundle).
                </div>
              </div>
              
              {/* Step 4 */}
              <div style={{
                backgroundColor: 'rgba(245, 242, 240, 0.5)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(61, 0, 0, 0.08)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '100%',
                  height: 'auto',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <img 
                    src="/onboardingsteps/step4.webp" 
                    alt="Step 4: Upload to Cognition"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'rgb(61, 0, 0)',
                  marginBottom: '8px',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  Step 4: Upload to Cognition
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(61, 0, 0, 0.7)',
                  lineHeight: '1.6',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  • Save the file to your device or email it to yourself.<br />
                  • Go back to Cognition and click "Upload Your WhatsApp Conversations".<br />
                  • Upload your .txt/.zip files.<br />
                  • Hit 'Begin Analysis'.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}