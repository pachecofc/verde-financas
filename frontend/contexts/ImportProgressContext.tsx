import React, { createContext, useContext, useState } from 'react';

export interface ImportProgressState {
  current: number;
  total: number;
  completed?: boolean;
}

interface ImportProgressContextType {
  importProgress: ImportProgressState | null;
  setImportProgress: (v: ImportProgressState | null) => void;
  isImporting: boolean;
  setIsImporting: (v: boolean) => void;
}

const ImportProgressContext = createContext<ImportProgressContextType | undefined>(undefined);

export const ImportProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  return (
    <ImportProgressContext.Provider
      value={{
        importProgress,
        setImportProgress,
        isImporting,
        setIsImporting,
      }}
    >
      {children}
    </ImportProgressContext.Provider>
  );
};

export const useImportProgress = () => {
  const ctx = useContext(ImportProgressContext);
  if (!ctx) throw new Error('useImportProgress must be used within ImportProgressProvider');
  return ctx;
};
