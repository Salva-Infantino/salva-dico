import { Route, Routes } from 'react-router';
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <UpdatePrompt />
    </>
  );
}
