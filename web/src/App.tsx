import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { RecentPage } from './pages/RecentPage';
import { UserPage } from './pages/UserPage';
import { TagPage } from './pages/TagPage';
import { TagsPage } from './pages/TagsPage';
import { UrlPage } from './pages/UrlPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-crumbs-bg text-crumbs-text">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recent" element={<RecentPage />} />
            <Route path="/u/:npub" element={<UserPage />} />
            <Route path="/t/:tag" element={<TagPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/url" element={<UrlPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
