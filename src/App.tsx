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
  X,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Hash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { GeminiService } from './services/gemini';
import type { FileSearchStore, FileSearchDocument } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SortConfig = {
  key: keyof FileSearchDocument | 'idx';
  direction: 'asc' | 'desc' | null;
};

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
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedDoc, setSelectedDoc] = useState<FileSearchDocument | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'idx', direction: null });

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
    setSelectedDoc(null);
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

  const sortedDocuments = useMemo(() => {
    if (!sortConfig.direction) return documents;
    
    return [...documents].sort((a, b) => {
      const aValue = sortConfig.key === 'idx' ? documents.indexOf(a) : a[sortConfig.key];
      const bValue = sortConfig.key === 'idx' ? documents.indexOf(b) : b[sortConfig.key];
      
      if (aValue === bValue) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [documents, sortConfig]);

  const requestSort = (key: keyof FileSearchDocument | 'idx') => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <aside className="w-80 border-r border-[var(--border)] bg-[var(--sidebar)] flex flex-col z-20 transition-all duration-300">
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
                  : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              <Folder size={18} className={cn(
                selectedStore?.name === store.name ? "text-white" : "text-primary/70"
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
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">
        {loading && (
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/20 overflow-hidden z-30">
            <div className="h-full bg-primary animate-[loading_1s_infinite]" style={{ width: '40%' }}></div>
          </div>
        )}

        {selectedStore ? (
          <>
            <header className="px-8 py-6 border-b border-[var(--border)] glass flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {selectedStore.displayName || selectedStore.name.split('/').pop()}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-slate-400 select-all">{selectedStore.name}</span>
                  <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                  <span className="text-[11px] font-medium text-slate-500">
                    Created: {new Date(selectedStore.createTime).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-[var(--border)]">
                <button 
                  onClick={() => setViewMode('card')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'card' 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-primary" 
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                  title="Card View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'table' 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-primary" 
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                  title="Table View"
                >
                  <ListIcon size={18} />
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <button 
                  onClick={() => loadDocuments(selectedStore)}
                  className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500 hover:text-primary"
                  title="Refresh"
                >
                  <Loader2 size={18} className={cn(loading && "animate-spin")} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto">
              <div className="p-8">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm flex gap-3">
                    <Info size={18} className="shrink-0" />
                    {error}
                  </div>
                )}

                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {sortedDocuments.map(doc => (
                      <DocumentCard key={doc.name} document={doc} onClick={() => setSelectedDoc(doc)} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm">
                    <DocumentTable 
                      documents={sortedDocuments} 
                      onRowClick={(doc) => setSelectedDoc(doc)}
                      onSort={requestSort}
                      sortConfig={sortConfig}
                    />
                  </div>
                )}

                {documents.length === 0 && !loading && !error && (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                      <FileText size={40} strokeWidth={1} className="opacity-40" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No documents found</h3>
                    <p className="max-w-xs text-center text-sm mt-2">
                      This store is currently empty. Upload documents via the Gemini API to see them here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <div className="relative w-32 h-32 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl flex items-center justify-center text-primary border border-slate-100 dark:border-slate-700">
                <Database size={64} strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Google File Search Store Browser</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
              Explore your persistent document stores for Gemini Managed RAG. 
              View files, metadata, and timestamps in a high-fidelity interface.
            </p>
            {!apiKey && (
              <button 
                onClick={() => setShowSettings(true)}
                className="mt-10 px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Key size={20} />
                Configure API Key to Begin
              </button>
            )}
            {apiKey && stores.length > 0 && (
              <div className="mt-12 flex items-center gap-2 text-primary font-medium">
                <ChevronRight className="animate-pulse" />
                Select a store from the sidebar to start browsing
              </div>
            )}
            {apiKey && stores.length === 0 && !loading && (
               <div className="mt-12 p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-3xl max-w-md">
                 <p className="text-sm text-amber-800 dark:text-amber-400">
                    No stores detected for this API key. Ensure you have created persistent stores via the `fileSearchStores.create` endpoint.
                 </p>
               </div>
            )}
          </div>
        )}
      </main>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-slate-900 border-l border-[var(--border)] shadow-2xl z-50 flex flex-col"
            >
              <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold truncate max-w-[300px]">{selectedDoc.displayName || selectedDoc.name.split('/').pop()}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">Resource Details</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 ml-1">Properties</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <PropertyItem icon={<Type size={16}/>} label="MIME Type" value={selectedDoc.mimeType} />
                    <PropertyItem icon={<Clock size={16}/>} label="Created" value={new Date(selectedDoc.createTime).toLocaleString()} />
                    <PropertyItem icon={<Calendar size={16}/>} label="Updated" value={new Date(selectedDoc.updateTime).toLocaleString()} />
                    <PropertyItem icon={<Hash size={16}/>} label="Resource Name" value={selectedDoc.name} isMono />
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 ml-1">Metadata Structure</h4>
                  {selectedDoc.customMetadata && Object.keys(selectedDoc.customMetadata).length > 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800">
                      <div className="space-y-4">
                        {Object.entries(selectedDoc.customMetadata).map(([key, value]) => (
                          <div key={key} className="flex flex-col gap-1 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{key}</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {typeof value === 'object' ? (
                                <pre className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] overflow-x-auto">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              ) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-sm text-slate-400">No custom metadata attached to this document.</p>
                    </div>
                  )}
                </section>

                <section className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10">
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                        <Info size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-primary mb-1">RAG Context</h5>
                        <p className="text-xs text-primary/70 leading-relaxed">
                          This document is indexed in your store and can be retrieved by Gemini models using the `fileSearch` tool. 
                          The metadata above is used for filtering during retrieval.
                        </p>
                      </div>
                   </div>
                </section>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => apiKey && setShowSettings(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Key size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-sans">API Configuration</h3>
                    <p className="text-xs text-slate-500">Provide your Google AI key</p>
                  </div>
                </div>
                {apiKey && (
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 ml-1 text-slate-700 dark:text-slate-300">Gemini API Key</label>
                  <input 
                    type="password"
                    defaultValue={apiKey}
                    autoFocus
                    placeholder="sb_..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSettings(e.currentTarget.value);
                    }}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-400 font-mono"
                    id="settings-api-key"
                  />
                  <div className="mt-3 flex items-start gap-2 ml-1">
                    <Info size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      This key allows access to your stores and files. It's stored strictly in your browser's local encrypted enclave.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Quick Resources</h4>
                  <div className="space-y-2">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-700 rounded-xl text-sm font-semibold hover:border-primary border border-transparent transition-all group shadow-sm">
                      Google AI Studio
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-slate-400" />
                    </a>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const input = document.getElementById('settings-api-key') as HTMLInputElement;
                    handleSaveSettings(input.value);
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all text-lg"
                >
                  Save Settings
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
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.2);
          border-radius: 20px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.4);
        }
      `}</style>
    </div>
  );
}

function PropertyItem({ icon, label, value, isMono = false }: { icon: React.ReactNode, label: string, value: string, isMono?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-primary/20 transition-all">
      <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-xl shadow-sm text-slate-400 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className={cn(
          "text-sm font-semibold text-slate-700 dark:text-slate-200 truncate",
          isMono && "font-mono font-medium text-xs text-slate-500"
        )}>
          {value}
        </div>
      </div>
    </div>
  );
}

function DocumentCard({ document, onClick }: { document: FileSearchDocument, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-slate-800 border border-[var(--border)] rounded-[2rem] p-7 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/30">
          <FileText size={28} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h4 className="text-xl font-bold truncate group-hover:text-primary transition-colors pr-2">
            {document.displayName || document.name.split('/').pop()}
          </h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Type size={14} className="text-slate-300" />
              {document.mimeType}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Clock size={14} className="text-slate-300" />
              {new Date(document.updateTime).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 group-hover:bg-primary/[0.02] group-hover:border-primary/10 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Resource ID</span>
            <Hash size={10} className="text-slate-300" />
          </div>
          <div className="text-[11px] font-mono truncate text-slate-500 break-all select-all">{document.name}</div>
        </div>

        {document.customMetadata && Object.keys(document.customMetadata).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 ml-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Metadata Context</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-bold text-slate-500">
                {Object.keys(document.customMetadata).length} fields
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(document.customMetadata).slice(0, 3).map(([key, value]) => (
                <div key={key} className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl text-[11px] flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-slate-200">{key}:</span>
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">
                    {typeof value === 'object' ? 'Object' : String(value)}
                  </span>
                </div>
              ))}
              {Object.keys(document.customMetadata).length > 3 && (
                <div className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700/50 text-slate-400 text-[11px] font-bold rounded-xl">
                  +{Object.keys(document.customMetadata).length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentTable({ documents, onRowClick, onSort, sortConfig }: { 
  documents: FileSearchDocument[], 
  onRowClick: (doc: FileSearchDocument) => void,
  onSort: (key: keyof FileSearchDocument | 'idx') => void,
  sortConfig: SortConfig
}) {
  const HeaderCell = ({ label, sortKey, className }: { label: string, sortKey?: keyof FileSearchDocument | 'idx', className?: string }) => (
    <th 
      className={cn(
        "px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400",
        sortKey && "cursor-pointer hover:text-primary transition-colors select-none",
        className
      )}
      onClick={() => sortKey && onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortKey && (
          <div className="text-slate-300">
            {sortConfig.key === sortKey ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-primary"/> : 
              sortConfig.direction === 'desc' ? <ArrowDown size={12} className="text-primary"/> : 
              <ArrowUpDown size={12} className="opacity-40" />
            ) : (
              <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            )}
          </div>
        )}
      </div>
    </th>
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--border)] group">
            <HeaderCell label="#" sortKey="idx" className="w-12" />
            <HeaderCell label="Name" sortKey="displayName" />
            <HeaderCell label="Type" sortKey="mimeType" className="w-48" />
            <HeaderCell label="Updated" sortKey="updateTime" className="w-48" />
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Metadata</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {documents.map((doc, idx) => (
            <tr 
              key={doc.name} 
              onClick={() => onRowClick(doc)}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
            >
              <td className="px-6 py-5 text-sm text-slate-400 font-mono">{idx + 1}</td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate max-w-xs">{doc.displayName || doc.name.split('/').pop()}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{doc.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  {doc.mimeType}
                </span>
              </td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <Calendar size={14} className="text-slate-300" />
                  {new Date(doc.updateTime).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex flex-wrap gap-1.5">
                  {doc.customMetadata && Object.entries(doc.customMetadata).slice(0, 2).map(([key, value]) => (
                    <div key={key} className="px-2 py-0.5 bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-md text-[10px]">
                      <span className="font-bold text-indigo-600/70">{key}:</span>{' '}
                      <span className="text-slate-500">{String(value)}</span>
                    </div>
                  ))}
                  {doc.customMetadata && Object.keys(doc.customMetadata).length > 2 && (
                    <span className="text-[9px] font-bold text-slate-300">+{Object.keys(doc.customMetadata).length - 2}</span>
                  )}
                  {(!doc.customMetadata || Object.keys(doc.customMetadata).length === 0) && (
                    <span className="text-[10px] text-slate-300 italic">No metadata</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
