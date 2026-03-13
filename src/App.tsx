import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Settings, 
  Search, 
  Folder, 
  FileText, 
  Key, 
  ChevronRight, 
  ChevronLeft,
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
  ArrowDown,
  PanelLeftOpen,
  PanelLeftClose,
  Code2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { GeminiService } from './services/gemini';
import type { FileSearchStore, FileSearchDocument } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal, Input, Button, ConfigProvider, theme, App as AntdApp } from 'antd';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to render metadata values safely and readable
const formatMetadataValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // Handle Gemini unique metadata format (stringValue, numericValue, etc.)
    if ('stringValue' in value) return String(value.stringValue);
    if ('numericValue' in value) return String(value.numericValue);
    if ('booleanValue' in value) return String(value.booleanValue);
    
    // Check if it's the specific { key, stringValue } object format
    // but the value is what matters for this function
    const actualValue = value.stringValue ?? value.numericValue ?? value.booleanValue;
    if (actualValue !== undefined) return String(actualValue);

    try {
      const stringified = JSON.stringify(value);
      return stringified.length > 50 ? stringified.substring(0, 50) + '...' : stringified;
    } catch (e) {
      return '[Object]';
    }
  }
  return String(value);
};

// Helper to extract the visible key name, handling Gemini's internal object wrappers
const getMetadataDisplayKey = (originalKey: string, value: any): string => {
  if (typeof value === 'object' && value !== null && 'key' in value) {
    return String(value.key);
  }
  return originalKey;
};

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
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'document' | 'store'; name: string; displayName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      const aValue = sortConfig.key === 'idx' ? documents.indexOf(a) : (a as any)[sortConfig.key];
      const bValue = sortConfig.key === 'idx' ? documents.indexOf(b) : (b as any)[sortConfig.key];
      
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

  const handleSelectDoc = (doc: FileSearchDocument) => {
    setSelectedDoc(doc);
  };

  const handleDeleteDocument = async (docName: string) => {
    setDeleting(true);
    try {
      await geminiService.deleteDocument(docName);
      setDocuments(prev => prev.filter(d => d.name !== docName));
      if (selectedDoc?.name === docName) setSelectedDoc(null);
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      setError(message);
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteStore = async (storeName: string) => {
    setDeleting(true);
    try {
      await geminiService.deleteStore(storeName);
      setStores(prev => prev.filter(s => s.name !== storeName));
      if (selectedStore?.name === storeName) {
        setSelectedStore(null);
        setDocuments([]);
        setSelectedDoc(null);
      }
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete store';
      setError(message);
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 16,
        },
      }}
    >
      <AntdApp>
        <div className="flex h-screen w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)] relative">
          {/* Fixed Toggle for Left Sidebar when closed */}
      {!isLeftPanelOpen && (
        <button 
          onClick={() => setIsLeftPanelOpen(true)}
          className="fixed left-6 top-6 z-50 p-4 bg-primary text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all ring-4 ring-primary/10"
          title="Open Stores"
        >
          <PanelLeftOpen size={24} />
        </button>
      )}

      {/* Left Sidebar (Collapsible) */}
      <AnimatePresence>
        {isLeftPanelOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full border-r border-[var(--border)] bg-[var(--sidebar)] flex flex-col z-20 shrink-0 overflow-hidden relative"
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <Database size={18} />
                </div>
                <span className="truncate">Gemini Store</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button 
                  onClick={() => setIsLeftPanelOpen(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                  title="Collapse"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 shrink-0 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-sans"
                />
              </div>
              <button 
                onClick={loadStores}
                disabled={loading}
                className="p-2 bg-slate-100 dark:bg-slate-800 border border-[var(--border)] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-500 hover:text-primary disabled:opacity-50 group"
                title="Refresh Stores"
              >
                <Loader2 size={18} className={cn(loading && "animate-spin", "group-hover:scale-110 transition-transform")} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
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
              
              {!loading && filteredStores.length === 0 && (
                <div className="py-12 px-6 text-center">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-40">
                    <Database size={24} />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    No stores found
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">
                    Check your API key or create a store via the Gemini API.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] shrink-0">
              <button 
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm font-medium"
              >
                <Settings size={18} />
                Settings
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative bg-[var(--background)] transition-all duration-300 overflow-hidden">
        {loading && (
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/20 overflow-hidden z-30">
            <div className="h-full bg-primary animate-[loading_1s_infinite]" style={{ width: '40%' }}></div>
          </div>
        )}

        {selectedStore ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="px-8 py-6 border-b border-[var(--border)] glass flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-4">
                {!isLeftPanelOpen && <div className="w-10" />}
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
                    {selectedStore.displayName || selectedStore.name.split('/').pop()}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-slate-400 select-all truncate max-w-[400px]">{selectedStore.name}</span>
                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                    <span className="text-[11px] font-medium text-slate-500 font-sans">
                      Created: {new Date(selectedStore.createTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-[var(--border)]">
                  <button 
                    onClick={() => setViewMode('card')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'card' 
                        ? "bg-white dark:bg-slate-700 shadow-sm text-primary" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
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
                  >
                    <ListIcon size={18} />
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <button 
                    onClick={() => loadDocuments(selectedStore)}
                    className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500 hover:text-primary"
                  >
                    <Loader2 size={18} className={cn(loading && "animate-spin")} />
                  </button>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ type: 'store', name: selectedStore.name, displayName: selectedStore.displayName || selectedStore.name.split('/').pop() || 'store' })}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/50 hover:border-red-300 dark:hover:border-red-800 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  <Trash2 size={14} />
                  Delete Store
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar scroll-smooth">
              <div className="p-8 pb-32">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm flex gap-3 max-w-4xl mx-auto">
                    <Info size={18} className="shrink-0" />
                    {error}
                  </div>
                )}

                <div className="w-full">
                  {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedDocuments.map(doc => (
                        <DocumentCard 
                          key={doc.name} 
                          document={doc} 
                          isSelected={selectedDoc?.name === doc.name} 
                          onClick={() => handleSelectDoc(doc)} 
                          onDelete={() => setDeleteConfirm({ type: 'document', name: doc.name, displayName: doc.displayName || doc.name.split('/').pop() || 'document' })}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm">
                      <DocumentTable 
                        documents={sortedDocuments} 
                        selectedDocName={selectedDoc?.name}
                        onRowClick={(doc) => handleSelectDoc(doc)}
                        onSort={requestSort}
                        sortConfig={sortConfig}
                        onDeleteDoc={(doc) => setDeleteConfirm({ type: 'document', name: doc.name, displayName: doc.displayName || doc.name.split('/').pop() || 'document' })}
                      />
                    </div>
                  )}
                </div>

                {documents.length === 0 && !loading && !error && (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                      <FileText size={40} strokeWidth={1} className="opacity-40" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 uppercase">No documents found</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
              <div className="relative w-32 h-32 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl flex items-center justify-center text-primary border border-slate-100 dark:border-slate-700">
                <Database size={64} strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight uppercase">File search browser</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-lg leading-relaxed font-sans font-medium">
              Explore your persistent document stores for Gemini Managed RAG. 
              View files, metadata, and timestamps in a high-fidelity interface.
            </p>
            {apiKey && stores.length > 0 && (
              <div className="mt-12 flex items-center gap-3 text-primary font-bold px-6 py-3 bg-primary/5 rounded-2xl border border-primary/10 animate-bounce uppercase text-sm tracking-widest">
                <ChevronLeft className="animate-pulse" />
                Select a store to start
              </div>
            )}
          </div>
        )}
      </main>

      {/* FIXED OVERLAY SIDE PANEL */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[600px] bg-white dark:bg-slate-900 shadow-2xl z-[101] flex flex-col border-l border-[var(--border)] overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/10">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold truncate pr-4 text-slate-900 dark:text-white uppercase leading-tight">{selectedDoc.displayName || selectedDoc.name.split('/').pop()}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-[0.2em] font-bold opacity-70">Resource Details</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1 opacity-60 text-left">System Properties</h4>
                  <div className="grid grid-cols-1 gap-4 text-left">
                    <PropertyItem icon={<Type size={16}/>} label="MIME Type" value={selectedDoc.mimeType} />
                    <PropertyItem icon={<Clock size={16}/>} label="Created" value={new Date(selectedDoc.createTime).toLocaleString()} />
                    <PropertyItem icon={<Calendar size={16}/>} label="Updated" value={new Date(selectedDoc.updateTime).toLocaleString()} />
                    <PropertyItem icon={<Hash size={16}/>} label="Resource Name" value={selectedDoc.name} isMono />
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1 opacity-60 text-left">Metadata Structure</h4>
                  {selectedDoc.customMetadata && Object.keys(selectedDoc.customMetadata).length > 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-inner">
                      <div className="space-y-4">
                        {Object.entries(selectedDoc.customMetadata).map(([key, value]) => {
                          const displayKey = getMetadataDisplayKey(key, value);
                          const displayValue = formatMetadataValue(value);
                          return (
                            <div key={key} className="flex flex-col gap-1 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0 text-left">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter text-left opacity-80">{displayKey}</span>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 text-left">
                                {typeof value === 'object' && !('key' in value) ? (
                                  <pre className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] overflow-x-auto font-mono text-slate-600 dark:text-slate-400 scrollbar-hide">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                ) : String(displayValue)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-sm text-slate-400 font-medium">No custom metadata attached to this document.</p>
                    </div>
                  )}
                </section>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => apiKey && setShowSettings(false)}
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-10 text-left">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                      <Key size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-sans text-slate-900 dark:text-white uppercase">Access Configuration</h3>
                    </div>
                  </div>
                  {apiKey && (
                    <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400">
                      <X size={20} />
                    </button>
                  )}
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest mb-2 ml-1 text-slate-400 text-left">Gemini API Key</label>
                    <input 
                      type="password"
                      defaultValue={apiKey}
                      autoFocus
                      placeholder="AIzaSy..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSettings(e.currentTarget.value);
                      }}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-primary outline-none transition-all font-mono text-sm"
                      id="settings-api-key"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.getElementById('settings-api-key') as HTMLInputElement;
                      handleSaveSettings(input.value);
                    }}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:opacity-90 transition-all text-lg uppercase tracking-widest"
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <span className="uppercase font-black tracking-tight">
              Delete {deleteConfirm?.type === 'store' ? 'Store' : 'Document'}
            </span>
          </div>
        }
        open={!!deleteConfirm}
        onCancel={() => !deleting && setDeleteConfirm(null)}
        footer={[
          <Button key="cancel" disabled={deleting} onClick={() => setDeleteConfirm(null)} className="rounded-xl px-6 h-11 font-bold">
            Cancel
          </Button>,
          <Button 
            key="delete" 
            danger 
            type="primary" 
            loading={deleting}
            disabled={deleteConfirm?.type === 'store' && (document.getElementById('delete-confirm-input') as HTMLInputElement)?.value !== 'DELETE'}
            onClick={() => {
              if (deleteConfirm) {
                if (deleteConfirm.type === 'store') {
                  handleDeleteStore(deleteConfirm.name);
                } else {
                  handleDeleteDocument(deleteConfirm.name);
                }
              }
            }}
            className="rounded-xl px-8 h-11 font-black shadow-lg shadow-red-500/20"
          >
            DELETE
          </Button>
        ]}
        centered
        width={480}
        styles={{
          mask: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
          body: { padding: '1rem' }
        }}
      >
        <div className="py-2">
          {deleteConfirm && (
            <div className="mb-6 p-5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {deleteConfirm.type === 'store' ? (
                  <>You are about to permanently delete the store <strong className="text-red-600">"{deleteConfirm.displayName}"</strong> and all its content.</>
                ) : (
                  <>You are about to permanently delete the document <strong className="text-red-600">"{deleteConfirm.displayName}"</strong>.</>
                )}
              </p>
              <div className="mt-3 text-[10px] font-mono text-slate-400 truncate opacity-60">
                {deleteConfirm.name}
              </div>
            </div>
          )}

          {deleteConfirm?.type === 'store' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-black uppercase tracking-widest mb-2 ml-1 text-slate-400">
                Type <span className="text-red-500">DELETE</span> to confirm
              </label>
              <Input 
                id="delete-confirm-input"
                placeholder="DELETE"
                autoFocus
                className="h-12 rounded-xl border-2 border-slate-100 dark:border-slate-800 focus:border-red-500 font-black tracking-widest text-center"
                onChange={(e) => {
                  const btn = document.querySelector('.ant-modal-footer .ant-btn-dangerous') as HTMLButtonElement;
                  if (btn) btn.disabled = e.target.value !== 'DELETE';
                }}
              />
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        @keyframes loading {
          from { transform: translateX(-100%); }
          to { transform: translateX(250%); }
        }
        
        /* Premium Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.1);
          border-radius: 100px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.3);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

function PropertyItem({ icon, label, value, isMono = false }: { icon: React.ReactNode, label: string, value: string, isMono?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-primary/20 transition-all text-left shadow-sm">
      <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-xl shadow-sm text-slate-400 group-hover:text-primary transition-colors shrink-0 border border-slate-100 dark:border-slate-800">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60 mb-0.5">
          {label}
        </div>
        <div className={cn(
          "text-sm font-bold text-slate-700 dark:text-slate-200 truncate leading-tight uppercase tracking-tight",
          isMono && "font-mono font-medium text-xs text-slate-500 opacity-80 normal-case tracking-normal"
        )}>
          {value}
        </div>
      </div>
    </div>
  );
}

function DocumentCard({ document, isSelected, onClick, onDelete }: { document: FileSearchDocument, isSelected: boolean, onClick: () => void, onDelete: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-slate-800 border rounded-[2.5rem] p-8 transition-all group cursor-pointer active:scale-[0.98] text-left relative overflow-hidden h-full flex flex-col",
        isSelected 
          ? "border-primary ring-4 ring-primary/5 shadow-2xl shadow-primary/10 translate-y-[-4px]" 
          : "border-[var(--border)] hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-slate-300 dark:hover:border-slate-700"
      )}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-4 right-4 z-20 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-transparent hover:border-red-200 dark:hover:border-red-900/50 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        title="Delete document"
      >
        <Trash2 size={14} />
      </button>
      {isSelected && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
      )}
      
      <div className="flex items-start gap-5 mb-8 relative z-10 text-left">
        <div className={cn(
          "w-16 h-16 rounded-[1.25rem] flex items-center justify-center shrink-0 border transition-all duration-300",
          isSelected 
            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 rotate-3" 
            : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-900/30 group-hover:rotate-0 rotate-[-3deg]"
        )}>
          <FileText size={32} />
        </div>
        <div className="flex-1 min-w-0 pt-1 text-left">
          <h4 className={cn(
            "text-xl font-black truncate transition-colors pr-2 leading-tight tracking-tight uppercase",
            isSelected ? "text-primary" : "group-hover:text-primary text-slate-900 dark:text-white"
          )}>
            {document.displayName || document.name.split('/').pop()}
          </h4>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-slate-400 mt-3 font-black uppercase tracking-widest opacity-70">
            <span className="flex items-center gap-2">
              <Type size={14} />
              {document.mimeType.split('/').pop()}
            </span>
            <span className="flex items-center gap-2">
              <Clock size={14} />
              {new Date(document.updateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 relative z-10 mt-auto">
        <div className={cn(
          "p-5 rounded-2xl border transition-all duration-300 shadow-inner",
          isSelected 
            ? "bg-primary/5 border-primary/20" 
            : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 group-hover:bg-primary/[0.03] group-hover:border-primary/10"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.1em] opacity-60">Hash Identifier</span>
            <Hash size={12} className="text-slate-300 group-hover:text-primary transition-colors" />
          </div>
          <div className="text-[11px] font-mono truncate text-slate-500 break-all select-all font-medium opacity-90">{document.name}</div>
        </div>

        {document.customMetadata && Object.keys(document.customMetadata).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 ml-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] text-left opacity-70">Metadata Facets</span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-500 shadow-sm uppercase">
                {Object.keys(document.customMetadata).length} Items
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(document.customMetadata).slice(0, 3).map(([key, value]) => {
                const displayKey = getMetadataDisplayKey(key, value);
                const displayValue = formatMetadataValue(value);
                return (
                  <div key={key} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl text-[11px] flex items-center gap-2 max-w-full overflow-hidden hover:border-primary/30 transition-colors">
                    <span className="font-black text-slate-900 dark:text-slate-200 shrink-0 uppercase tracking-tighter opacity-50 text-[10px]">{displayKey}</span>
                    <span className="text-slate-600 dark:text-slate-400 truncate font-bold tracking-tight">
                      {displayValue}
                    </span>
                  </div>
                );
              })}
              {Object.keys(document.customMetadata).length > 3 && (
                <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-[10px] font-black rounded-xl border border-dashed border-slate-200 dark:border-slate-600 uppercase tracking-tighter">
                  +{Object.keys(document.customMetadata).length - 3} MORE
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentTable({ documents, selectedDocName, onRowClick, onSort, sortConfig, onDeleteDoc }: { 
  documents: FileSearchDocument[], 
  selectedDocName?: string,
  onRowClick: (doc: FileSearchDocument) => void,
  onSort: (key: keyof FileSearchDocument | 'idx') => void,
  sortConfig: SortConfig,
  onDeleteDoc: (doc: FileSearchDocument) => void
}) {
  const HeaderCell = ({ label, sortKey, className }: { label: string, sortKey?: keyof FileSearchDocument | 'idx', className?: string }) => (
    <th 
      className={cn(
        "px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left",
        sortKey && "cursor-pointer hover:text-primary transition-colors select-none",
        className
      )}
      onClick={(e) => {
        if (sortKey) {
          e.stopPropagation();
          onSort(sortKey);
        }
      }}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortKey && (
          <div className="text-slate-300">
            {sortConfig.key === sortKey ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary animate-in fade-in slide-in-from-bottom-1"/> : 
              sortConfig.direction === 'desc' ? <ArrowDown size={14} className="text-primary animate-in fade-in slide-in-from-top-1"/> : 
              <ArrowUpDown size={14} className="opacity-40" />
            ) : (
              <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            )}
          </div>
        )}
      </div>
    </th>
  );

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-[var(--border)] group">
            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left w-[80px]">#</th>
            <HeaderCell label="Asset Details" sortKey="displayName" className="w-[450px]" />
            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left">Property Matrix (JSON System)</th>
            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center w-[80px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {documents.map((doc, idx) => {
            const isSelected = selectedDocName === doc.name;
            return (
              <tr 
                key={doc.name} 
                onClick={() => onRowClick(doc)}
                className={cn(
                  "transition-all duration-200 group cursor-pointer text-left align-top",
                  isSelected 
                    ? "bg-primary/[0.04] dark:bg-primary/[0.08]" 
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                )}
              >
                <td className="px-6 py-8 text-xs text-slate-400 font-mono font-bold opacity-60">{(idx + 1).toString().padStart(2, '0')}</td>
                <td className="px-6 py-8 font-sans">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border shadow-sm shrink-0 mt-1",
                      isSelected 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 -rotate-3" 
                        : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/10 group-hover:scale-110"
                    )}>
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "font-black text-base truncate tracking-tight transition-colors uppercase leading-snug mb-1",
                        isSelected ? "text-primary" : "text-slate-900 dark:text-white"
                      )}>
                        {doc.displayName || doc.name.split('/').pop()}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-80">
                          <Type size={12} className="opacity-50" />
                          {doc.mimeType.split('/').pop()}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                        <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-80">
                          <Clock size={12} className="opacity-50" />
                          {new Date(doc.updateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate opacity-60 mt-1.5 overflow-hidden select-all">{doc.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-8">
                  {doc.customMetadata && Object.keys(doc.customMetadata).length > 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-4 shadow-inner overflow-hidden">
                      <div className="flex items-center gap-2 mb-3 opacity-40">
                         <Code2 size={12} className="text-primary"/>
                         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Metadata Payload</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(doc.customMetadata).map(([key, value]) => {
                          const displayKey = getMetadataDisplayKey(key, value);
                          const displayVal = formatMetadataValue(value);
                          return (
                            <div key={key} className="flex items-start gap-2 font-mono group/item">
                              <span className="text-[11px] font-bold text-indigo-600/70 dark:text-indigo-400/70 shrink-0">"{displayKey}":</span>
                              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 break-all">
                                {typeof value === 'object' && !('key' in value) ? (
                                  <span className="text-amber-600 dark:text-amber-400">"{displayVal}"</span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">"{displayVal}"</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest italic opacity-50">
                       <Hash size={12}/> Empty
                    </div>
                  )}
                </td>
                <td className="px-6 py-8 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteDoc(doc); }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-transparent hover:border-red-200 dark:hover:border-red-900/50 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
