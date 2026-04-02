/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Recording } from './pages/Recording';
import { Processing } from './pages/Processing';
import { Dashboard } from './pages/Dashboard';
import { Summary } from './pages/Summary';
import type { ScreeningResult } from './types';

type Page = 'recording' | 'processing' | 'dashboard' | 'summary';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('recording');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [results, setResults] = useState<ScreeningResult | null>(null);
  const [subjectId, setSubjectId] = useState<string>('');

  const handleBackToRecording = () => {
    setAudioFile(null);
    setResults(null);
    setSubjectId('');
    setCurrentPage('recording');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'recording':
        return (
          <Recording
            onProceed={() => setCurrentPage('processing')}
            onFileSelected={setAudioFile}
            subjectId={subjectId}
            onSubjectIdChange={setSubjectId}
          />
        );
      case 'processing':
        return (
          <Processing
            audioFile={audioFile}
            results={results}
            setResults={setResults}
            subjectId={subjectId}
            onComplete={() => setCurrentPage('dashboard')}
            onCancel={handleBackToRecording}
            onShowSummary={() => setCurrentPage('summary')}
          />
        );
      case 'summary':
        return (
          <Summary
            results={results}
            subjectId={subjectId}
            onBackToHistory={() => setCurrentPage('dashboard')}
          />
        );
      case 'dashboard':
        return <Dashboard />;
      default:
        return (
          <Recording
            onProceed={() => setCurrentPage('processing')}
            onFileSelected={setAudioFile}
            subjectId={subjectId}
            onSubjectIdChange={setSubjectId}
          />
        );
    }
  };

  return (
    <Layout onNavigate={(page) => setCurrentPage(page as Page)}>
      {renderPage()}
    </Layout>
  );
}
