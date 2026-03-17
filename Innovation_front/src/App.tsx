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

  const handleBackToRecording = () => {
    setAudioFile(null);
    setResults(null);
    setCurrentPage('recording');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'recording':
        return (
          <Recording
            onProceed={() => setCurrentPage('processing')}
            onFileSelected={setAudioFile}
          />
        );
      case 'processing':
        return (
          <Processing
            audioFile={audioFile}
            results={results}
            setResults={setResults}
            onComplete={() => setCurrentPage('dashboard')}
            onCancel={handleBackToRecording}
            onShowSummary={() => setCurrentPage('summary')}
          />
        );
      case 'summary':
        return (
          <Summary
            results={results}
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
