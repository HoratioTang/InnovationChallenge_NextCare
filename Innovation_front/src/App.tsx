/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Recording } from './pages/Recording';
import { Processing } from './pages/Processing';
import { History } from './pages/History';
import { SubjectDashboard } from './pages/SubjectDashboard';
import { Summary } from './pages/Summary';
import type { ScreeningResult } from './types';

type Page = 'recording' | 'processing' | 'history' | 'subjectDashboard' | 'summary';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('recording');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [results, setResults] = useState<ScreeningResult | null>(null);
  const [subjectId, setSubjectId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

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
            onComplete={() => setCurrentPage('history')}
            onCancel={handleBackToRecording}
            onShowSummary={() => setCurrentPage('summary')}
          />
        );
      case 'summary':
        return (
          <Summary
            results={results}
            subjectId={subjectId}
            onBackToHistory={() => setCurrentPage('history')}
          />
        );
      case 'history':
        return (
          <History
            onSelectSubject={(id) => {
              setSelectedSubjectId(id);
              setCurrentPage('subjectDashboard');
            }}
          />
        );
      case 'subjectDashboard':
        return (
          <SubjectDashboard
            subjectId={selectedSubjectId}
            onBack={() => setCurrentPage('history')}
          />
        );
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
    <Layout onNavigate={(page) => setCurrentPage(page as Page)} currentPage={currentPage}>
      {renderPage()}
    </Layout>
  );
}
