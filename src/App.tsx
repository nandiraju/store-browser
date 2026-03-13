import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Settings, 
  Search, 
  Folder, 
  FileText, 
  Key, 
  ChevronRight, 
  ExternalLink, 
  Moon, 
  Sun,
  Loader2,
  Database,
  Info,
  Calendar,
  Type,
  X
} from 'lucide-react';
import { GeminiService } from './services/gemini';
import type { FileSearchStore, FileSearchDocument } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showSettings, setShowSettings] = useState(!apiKey);
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<FileSearchStore | null>(null);
  const [documents, setDocuments] = useState<FileSearchDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const geminiService = useMemo(() => new GeminiService(apiKey), [apiKey]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await geminiService.listStores();
      setStores(response.fileSearchStores || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load stores';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [geminiService]);

  useEffect(() => {
    if (apiKey) {
      void loadStores();
    }
  }, [apiKey, loadStores]);

  const loadDocuments = async (store: FileSearchStore) => {
    setSelectedStore(store);
    setLoading(true);
    setError(null);
    try {
      const response = await geminiService.listDocuments(store.name);
      setDocuments(response.documents || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load documents';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(s => 
    s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveSettings = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
    setShowSettings(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <aside className="w-80 border-r border-[var(--border)] bg-[var(--sidebar)] flex flex-col">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Database size={18} />
            </div>
            <span>Gemini Store</span>
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredStores.map(store => (
            <button
              key={store.name}
              onClick={() => loadDocuments(store)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all group",
                selectedStore?.name === store.name 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "hover:bg-slate-200 dark:hover:bg-slate-800"
              )}
            >
              <Folder size={18} className={cn(
                selectedStore?.name === store.name ? "text-white" : "text-primary"
              )} />
              <div className="flex-1 truncate">
                <div className="font-medium truncate">{store.displayName || store.name.split('/').pop()}</div>
                <div className={cn(
                  "text-[10px] truncate opacity-60",
                  selectedStore?.name === store.name ? "text-white" : "text-slate-500"
                )}>
                  {store.name}
                </div>
              </div>
              <ChevronRight size={14} className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity",
                selectedStore?.name === store.name ? "text-white" : "text-slate-400"
              )} />
            </button>
          ))}
          {filteredStores.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-400 text-sm">
              No stores found
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm font-medium"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {loading && (
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/20 overflow-hidden">
            <div className="h-full bg-primary animate-[loading_1s_infinite]" style={{ width: '40%' }}></div>
          </div>
        )}

        {selectedStore ? (
          <>
            <header className="p-6 border-b border-[var(--border)] glass flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{selectedStore.displayName || selectedStore.name.split('/').pop()}</h2>
                <p className="text-sm text-slate-500 font-mono mt-1">{selectedStore.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Created</div>
                  <div className="text-xs font-medium">{new Date(selectedStore.createTime).toLocaleDateString()}</div>
                </div>
                <button 
                  onClick={() => loadDocuments(selectedStore)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Loader2 size={18} className={cn(loading && "animate-spin")} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm flex gap-3">
                  <Info size={18} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {documents.map(doc => (
                  <DocumentCard key={doc.name} document={doc} />
                ))}
              </div>

              {documents.length === 0 && !loading && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <FileText size={64} strokeWidth={1} className="mb-4 opacity-20" />
                  <p>No documents in this store</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mb-6">
              <Database size={48} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Google File Search Browser</h1>
            <p className="text-slate-500 max-w-md mx-auto">
              Select a file search store from the sidebar to view its documents and metadata.
            </p>
            {!apiKey && (
              <button 
                onClick={() => setShowSettings(true)}
                className="mt-8 px-6 py-3 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
              >
                Configure API Key
              </button>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => apiKey && setShowSettings(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <Key size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-sans">Settings</h3>
                </div>
                {apiKey && (
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 ml-1">Gemini API Key</label>
                  <input 
                    type="password"
                    defaultValue={apiKey}
                    autoFocus
                    placeholder="Enter your API key..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSettings(e.currentTarget.value);
                    }}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-400"
                    id="settings-api-key"
                  />
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 ml-1">
                    <Info size={12} />
                    Your key is stored locally in your browser.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">Quick Links</h4>
                  <div className="space-y-3">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-xl text-sm font-medium hover:shadow-sm transition-all group">
                      Get API Key
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const input = document.getElementById('settings-api-key') as HTMLInputElement;
                    handleSaveSettings(input.value);
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          from { transform: translateX(-100%); }
          to { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

function DocumentCard({ document }: { document: FileSearchDocument }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-[var(--border)] rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <FileText size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
            {document.displayName || document.name.split('/').pop()}
          </h4>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <Type size={12} />
              {document.mimeType}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(document.updateTime).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl overflow-hidden">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Resource Name</div>
          <div className="text-[11px] font-mono truncate text-slate-500">{document.name}</div>
        </div>

        {document.customMetadata && Object.keys(document.customMetadata).length > 0 && (
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 ml-1">Metadata</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(document.customMetadata).map(([key, value]) => (
                <div key={key} className="px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg text-[11px]">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{key}:</span>{' '}
                  <span className="text-slate-600 dark:text-slate-300">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
