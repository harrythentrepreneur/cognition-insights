'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { WhatsAppParser } from '@/lib/parsers/whatsapp-parser';
import { ComprehensiveAnalyzerEnhanced } from '@/lib/analyzers/comprehensive-analyzer-enhanced';
import { useIndexedDB } from '@/hooks/useIndexedDB';
import { EnhancedIndexedDBStorage } from '@/lib/storage/enhanced-indexed-db';
import { toast } from 'sonner';
import { getMessagesForBasicAnalysis, getMessagesForFullAnalysis } from '@/lib/gemini/gemini-client';

interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
}

export function WhatsAppAnalyzer() {
  const { user } = useUser();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisType, setAnalysisType] = useState<'quick' | 'full'>('quick');
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to analyze your WhatsApp chat'
  });
  const { saveResults, updateSessionProgress } = useIndexedDB();

  const updateProgress = (stage: string, progress: number, message: string) => {
    setProgress({ stage, progress, message });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error('File too large. Please select a file under 50MB.');
        return;
      }
      setFile(selectedFile);
      toast.success('File selected. Click "Start Analysis" to begin.');
    }
  };

  const analyzeChat = useCallback(async () => {
    if (!file) {
      toast.error('Please select a WhatsApp chat file first');
      return;
    }

    setIsProcessing(true);
    const sessionId = `session-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Step 1: Parse WhatsApp file
      updateProgress('parsing', 10, 'Reading your WhatsApp chat...');
      const parser = new WhatsAppParser();
      const parseResult = await parser.parseFile(file);

      if (parseResult.messages.length === 0) {
        throw new Error('No messages found in the chat file');
      }

      updateProgress('parsing', 20, `Found ${parseResult.totalMessages} messages, ${parseResult.userMessages} from you`);
      await updateSessionProgress(sessionId, 20);

      // Select messages based on analysis type
      let selectedMessages;
      if (analysisType === 'quick') {
        selectedMessages = getMessagesForBasicAnalysis(parseResult.messages);
        updateProgress('filtering', 25, `Using quick analysis mode: ${selectedMessages.length} messages selected`);
      } else {
        selectedMessages = getMessagesForFullAnalysis(parseResult.messages);
        updateProgress('filtering', 25, `Using full analysis mode: ${selectedMessages.length} messages`);
      }

      // Step 2: Run comprehensive analysis with enhanced features
      updateProgress('initializing', 30, 'Initializing enhanced AI analysis with parallel processing...');
      const analyzer = new ComprehensiveAnalyzerEnhanced();

      const results = await analyzer.analyzeComprehensive(
        selectedMessages,
        parseResult.userIdentified,
        parseResult.totalMessages,
        (stage, progress, message) => {
          updateProgress(stage, progress, message);
          updateSessionProgress(sessionId, progress);
        }
      );

      // Add user email to results
      const finalResults = {
        ...results,
        userEmail: user?.emailAddresses[0]?.emailAddress || 'anonymous',
      };

      const resultId = await saveResults(finalResults);
      await updateSessionProgress(sessionId, 100, 'completed');

      updateProgress('completed', 100, 'Analysis complete!');
      toast.success('Your WhatsApp analysis is ready!');

      // Navigate to results page immediately with completion flag
      router.push(`/emotional-landscapes?sessionId=${resultId}&completed=true`);

    } catch (error) {
      console.error('Analysis error:', error);
      updateProgress('error', 0, 'Analysis failed');
      toast.error(error instanceof Error ? error.message : 'An error occurred during analysis');
      await updateSessionProgress(sessionId, 0, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [file, user, router, saveResults, updateSessionProgress]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          WhatsApp Chat Analyzer
        </h2>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".txt,.zip"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${isProcessing ? 'opacity-50' : ''}`}
            >
              <div className="space-y-2">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-gray-600">
                  {file ? file.name : 'Click to upload your WhatsApp chat export'}
                </p>
                <p className="text-sm text-gray-500">
                  TXT or ZIP files up to 50MB
                </p>
              </div>
            </label>
          </div>

          {/* Analysis Type Selection */}
          {file && !isProcessing && (
            <div className="flex justify-center space-x-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="quick"
                  checked={analysisType === 'quick'}
                  onChange={(e) => setAnalysisType(e.target.value as 'quick' | 'full')}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Quick Analysis (faster)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="full"
                  checked={analysisType === 'full'}
                  onChange={(e) => setAnalysisType(e.target.value as 'quick' | 'full')}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Full Analysis (detailed)</span>
              </label>
            </div>
          )}

          {/* Progress Display */}
          {progress.stage !== 'idle' && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{progress.message}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={analyzeChat}
            disabled={!file || isProcessing}
            className={`w-full py-3 px-6 text-white font-medium rounded-lg transition-colors ${!file || isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isProcessing ? 'Analyzing...' : 'Start Analysis'}
          </button>

          {/* Privacy Notice */}
          <div className="text-center text-sm text-gray-500">
            <p>🔒 Your data is processed directly in your browser</p>
            <p>AI analysis uses Google Gemini with zero-knowledge architecture</p>
          </div>
        </div>
      </div>
    </div>
  );
}