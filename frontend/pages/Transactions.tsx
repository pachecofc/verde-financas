
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts } from '../contexts/AccountContext';
import { useImportProgress } from '../contexts/ImportProgressContext';
import api from '../services/api';
import { toast } from 'sonner';
import { 
  Plus, Search, Trash2, Edit2, ArrowRightLeft, SlidersHorizontal, 
  ChevronRight, Filter, X, Calendar, Upload, FileText, Check, AlertCircle, 
  ChevronLeft, Camera, RefreshCw, Sparkles, Loader2, Crown, Zap, ShieldCheck,
  BrainCircuit, Wand2, FileSpreadsheet, ArrowRight, Settings2, CreditCard, ChevronDown,
  Table as TableIcon, Lock, MoreVertical, Star
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { TransactionType, Transaction, Category } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

type ImportStep = 'upload' | 'mapping' | 'review';

type TransactionRow = { transaction: Transaction; creditView: boolean };

export const Transactions: React.FC = () => {
  const { user: authUser } = useAuth();
  const { 
    transactions, categories, assets, user, theme,
    addTransaction, updateTransaction, deleteTransaction, updateUserProfile,
    refreshTransactions,
  } = useFinance();
  const { accounts } = useAccounts();
  
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  const [isDetectingColumns, setIsDetectingColumns] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isImporting, setIsImporting, setImportProgress } = useImportProgress();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transactionsRefreshing, setTransactionsRefreshing] = useState(false);

  // Importação CSV States
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState({ date: '', description: '', amount: '', identifier: '' as string });
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importAccountId, setImportAccountId] = useState('');

  // Refs e outros states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [filters, setFilters] = useState({ startDate: '', endDate: '', categoryId: '', accountId: '' });

  const [formData, setFormData] = useState({
    description: '', amount: '', targetBalance: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '', accountId: '', toAccountId: '', assetId: '', type: 'expense' as TransactionType,
  });

  const isPremium = authUser?.plan?.toLowerCase() === 'premium';

  // Estados da aba assinatura (apenas exibição; plano vem do Auth/Stripe)
  const stripeCheckoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL || 'https://buy.stripe.com/test_dRm5kD4KJ1ex1Mm8XxefC00';

  useEffect(() => {
    if (showModal && !editingId) {
      const defaultAccount = accounts[0]?.id || '';
      const defaultCategory = categories.find(c => c.type === 'expense')?.id || '';
      setFormData(prev => ({
        ...prev,
        accountId: defaultAccount,
        categoryId: defaultCategory,
        type: 'expense'
      }));
    }
  }, [showModal, editingId, accounts, categories]);

  // Conecta o stream ao elemento de vídeo
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Data inválida';
    
    try {
      // Se já está no formato YYYY-MM-DD, usar diretamente
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr + 'T12:00:00');
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR');
        }
      }
      
      // Se está em formato ISO completo, extrair apenas a data
      if (dateStr.includes('T')) {
        const dateOnly = dateStr.split('T')[0];
        const date = new Date(dateOnly + 'T12:00:00');
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR');
        }
      }
      
      // Tentar parsear como data ISO
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
      }
      
      return 'Data inválida';
    } catch {
      return 'Data inválida';
    }
  };

  const getCategoryFullName = (catId: string) => {
    if (catId === 'sys-transfer') return '🔄 Transferência';
    if (catId === 'sys-adjustment') return '⚖️ Ajuste de Saldo';
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'Sem Categoria';
    if (!cat.parentId) return `${cat.icon} ${cat.name}`;
    const parent = categories.find(c => c.id === cat.parentId);
    return `${parent?.icon || ''} ${parent?.name || ''} > ${cat.icon} ${cat.name}`;
  };

  /** Nome da categoria sem ícone, para ordenação alfabética correta. */
  const getCategorySortName = (catId: string) => {
    if (catId === 'sys-transfer') return 'Transferência';
    if (catId === 'sys-adjustment') return 'Ajuste de Saldo';
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'Sem Categoria';
    if (!cat.parentId) return cat.name;
    const parent = categories.find(c => c.id === cat.parentId);
    return `${parent?.name || ''} > ${cat.name}`.trim();
  };

  const handleDeleteTransaction = (t: Transaction) => {
    const isTransfer = t.type === 'transfer' && t.toAccountId;
    if (isTransfer) {
      const ok = window.confirm(
        'Esta transferência será removida da conta origem e da conta destino. Deseja excluir?'
      );
      if (!ok) return;
    }
    deleteTransaction(t.id);
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    const isSystem = t.categoryId.startsWith('sys-');
    setFormData({
      description: t.description,
      amount: Math.abs(t.amount).toString(),
      targetBalance: '',
      date: t.date,
      categoryId: isSystem ? '' : t.categoryId,
      accountId: t.accountId,
      toAccountId: t.toAccountId || '',
      assetId: t.assetId || '',
      type: t.type,
    });
    setShowModal(true);
  };

  // --- CSV IMPORT LOGIC ---

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseCsvFile(file);
  };

  const parseCsvFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert("Por favor, selecione um arquivo CSV válido.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => line.split(separator).map(c => c.trim().replace(/^"|"$/g, '')));
      setCsvHeaders(headers);
      setCsvRawRows(rows);
      setImportStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleAutoMapping = async () => {
    if (!isPremium) { setShowUpgradeModal(true); return; }
    setIsDetectingColumns(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const samples = csvRawRows.slice(0, 3);
      const prompt = `Analise os cabeçalhos ${JSON.stringify(csvHeaders)} e amostras ${JSON.stringify(samples)}. Identifique quais colunas representam: data, descrição e valor (amount). Se existir coluna de identificador único (ex.: Identificador, ID, Código), inclua em "identifier". Retorne JSON com as chaves: date, description, amount e opcionalmente identifier.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.STRING },
              identifier: { type: Type.STRING }
            }
          }
        }
      });
      const mapping = JSON.parse(response.text);
      setColumnMapping({ 
        date: mapping.date || '', 
        description: mapping.description || '', 
        amount: mapping.amount || '',
        identifier: mapping.identifier || ''
      });
    } catch (err) { console.error(err); }
    finally { setIsDetectingColumns(false); }
  };

  // Helper function to handle Brazilian date format (dd/mm/yyyy)
  const parseBrazilianDate = (dateStr: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Try dd/mm/yyyy
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`; // Return ISO yyyy-mm-dd
      }
    }
    
    // Try ISO or yyyy-mm-dd
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return dateStr; // Already yyyy-mm-dd
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
    }

    return dateStr;
  };

  const processMapping = () => {
    if (!columnMapping.date || !columnMapping.description || !columnMapping.amount) {
      alert("Mapeie todas as colunas obrigatórias.");
      return;
    }
    const dateIdx = csvHeaders.indexOf(columnMapping.date);
    const descIdx = csvHeaders.indexOf(columnMapping.description);
    const valIdx = csvHeaders.indexOf(columnMapping.amount);
    const idIdx = columnMapping.identifier ? csvHeaders.indexOf(columnMapping.identifier) : -1;

    const parsed = csvRawRows.map(row => {
      // Clean amount string (handles dots for thousands and commas for decimals common in BR)
      const amountRaw = row[valIdx] || '0';
      const cleanAmount = amountRaw.replace(/[^\d.,-]/g, '');
      
      let amountValue = 0;
      if (cleanAmount.includes(',') && cleanAmount.includes('.')) {
        // Format like 1.234,56
        amountValue = parseFloat(cleanAmount.replace(/\./g, '').replace(',', '.'));
      } else if (cleanAmount.includes(',')) {
        // Format like 1234,56
        amountValue = parseFloat(cleanAmount.replace(',', '.'));
      } else {
        amountValue = parseFloat(cleanAmount);
      }

      const isoDate = parseBrazilianDate(row[dateIdx]);
      const idVal = idIdx >= 0 ? (row[idIdx] ?? '').trim() : '';
      return {
        id: `import-${Math.random().toString(36).substr(2, 9)}`,
        date: isoDate,
        description: row[descIdx] || 'Sem descrição',
        amount: Math.abs(amountValue),
        type: amountValue < 0 ? 'expense' : 'income',
        categoryId: '',
        identifier: idVal || undefined,
      };
    });
    setImportedRows(parsed);
    setImportAccountId(accounts[0]?.id || '');
    setImportStep('review');
  };

  const handleAiCategorize = async () => {
    if (!isPremium) { setShowUpgradeModal(true); return; }
    setIsAiCategorizing(true);
    try {
      const descriptions = Array.from(new Set(importedRows.map(r => r.description)));
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const availableCats = categories.map(c => ({ id: c.id, name: c.name, type: c.type }));
      const prompt = `Categorize as descrições ${JSON.stringify(descriptions)} usando estas categorias: ${JSON.stringify(availableCats)}. Retorne um objeto JSON onde a chave é a descrição e o valor é o categoryId.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      const mapping = JSON.parse(response.text);
      setImportedRows(prev => prev.map(row => ({ 
        ...row, 
        categoryId: mapping[row.description] || row.categoryId,
        isAiCategorized: !!mapping[row.description]
      })));
    } catch (err) { console.error(err); }
    finally { setIsAiCategorizing(false); }
  };

  // Função helper para obter uma categoria fallback válida
  const getFallbackCategoryId = (type: 'income' | 'expense'): string => {
    // Tenta encontrar a primeira categoria do tipo correspondente
    const fallbackCategory = categories.find(c => c.type === type);
    return fallbackCategory?.id || '';
  };

  const finalizeImport = async () => {
    if (!importAccountId) {
      alert("Selecione a conta para importação.");
      return;
    }

    const accountId = importAccountId;
    const allRows = [...importedRows];

    setShowImportModal(false);
    setImportStep('upload');
    setImportedRows([]);
    setCsvHeaders([]);
    setCsvRawRows([]);
    setColumnMapping({ date: '', description: '', amount: '', identifier: '' });
    setImportAccountId('');

    let duplicatesInCsv = 0;
    let duplicatesInDb = 0;

    const seenInCsv = new Set<string>();
    const afterCsv: typeof allRows = [];
    for (const row of allRows) {
      const id = row.identifier?.trim();
      if (id) {
        if (seenInCsv.has(id)) {
          duplicatesInCsv++;
          continue;
        }
        seenInCsv.add(id);
      }
      afterCsv.push(row);
    }

    let externalIds: string[] = [];
    const hasAnyIdentifier = afterCsv.some((r) => (r.identifier ?? '').trim());
    if (hasAnyIdentifier) {
      try {
        externalIds = await api.transaction.getExternalIds();
      } catch (e) {
        console.warn('Erro ao buscar externalIds, ignorando dedup por banco:', e);
      }
    }

    const toImport = hasAnyIdentifier
      ? afterCsv.filter((row) => {
          const id = (row.identifier ?? '').trim();
          if (!id) return true;
          if (externalIds.includes(id)) {
            duplicatesInDb++;
            return false;
          }
          return true;
        })
      : afterCsv;

    const total = toImport.length;
    const duplicatesCount = duplicatesInCsv + duplicatesInDb;

    setIsImporting(true);
    setImportProgress({ current: 0, total });

    try {
      for (let i = 0; i < toImport.length; i++) {
        const row = toImport[i];
        const categoryId = row.categoryId || getFallbackCategoryId(row.type as 'income' | 'expense');
        const extId = (row.identifier ?? '').trim() || undefined;

        await addTransaction({
          description: row.description,
          amount: row.amount,
          date: row.date,
          categoryId,
          accountId,
          type: row.type as TransactionType,
          ...(extId != null && { externalId: extId }),
        }, true);

        setImportProgress({ current: i + 1, total });
      }
      setImportProgress(prev => prev ? { ...prev, completed: true } : null);
      setTimeout(() => setImportProgress(null), 1800);
      if (duplicatesCount > 0) {
        toast.warning('Algumas importações não foram realizadas devido à duplicação de transações.');
      }
    } catch (error) {
      console.error('Erro ao importar transações:', error);
      alert('Ocorreu um erro durante a importação. Algumas transações podem não ter sido salvas.');
      setImportProgress(null);
    } finally {
      setIsImporting(false);
    }
  };

  // Detecta se é um dispositivo móvel/tablet
  const isMobileDevice = (): boolean => {
    // Verifica largura da tela (tablets geralmente têm até 1024px)
    const isSmallScreen = window.innerWidth <= 1024;
    
    // Verifica se tem suporte a touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Verifica user agent para dispositivos móveis
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    // Considera mobile se for tela pequena OU tiver touch OU user agent indicar mobile
    return isSmallScreen || (hasTouch && isMobileUA);
  };

  const handleScannerClick = () => {
    if (isPremium) startCamera();
    else setShowUpgradeModal(true);
  };

  const startCamera = async (mode?: 'user' | 'environment') => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    
    // Se não foi especificado um modo, detecta automaticamente o dispositivo
    let modeToUse: 'user' | 'environment';
    if (mode) {
      modeToUse = mode;
    } else {
      // Mobile/tablet: usa câmera traseira, Desktop: usa câmera frontal
      modeToUse = isMobileDevice() ? 'environment' : 'user';
    }
    
    setFacingMode(modeToUse);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: modeToUse } });
      setStream(mediaStream);
      setShowScanner(true);
    } catch (err) {
      // Se falhar, tenta o modo alternativo como fallback
      const fallbackMode = modeToUse === 'user' ? 'environment' : 'user';
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: fallbackMode } });
        setFacingMode(fallbackMode);
        setStream(fallbackStream);
        setShowScanner(true);
      } catch (fallbackErr) {
        alert("Câmera indisponível");
      }
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setShowScanner(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsScanning(true);
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: "Extraia JSON: estabelecimento, data, valor_total." }] }],
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text);
      setFormData({ 
        ...formData, 
        description: data.estabelecimento || 'Nova Nota', 
        amount: (data.valor_total || 0).toString(), 
        date: parseBrazilianDate(data.data) || formData.date 
      });
      stopCamera();
      setShowModal(true);
    } catch (err) { console.error(err); }
    finally { setIsScanning(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const finalAmount = parseFloat(formData.amount);
      const finalCategoryId = (formData.type === 'transfer' || formData.type === 'adjustment') ? `sys-${formData.type}` : formData.categoryId;
      const transactionData = {
        description: formData.description,
        amount: finalAmount,
        date: formData.date,
        categoryId: finalCategoryId,
        accountId: formData.accountId,
        toAccountId: formData.type === 'transfer' ? formData.toAccountId : undefined,
        assetId: formData.type === 'transfer' && formData.assetId ? formData.assetId : undefined,
        type: formData.type,
      };
      
      if (editingId) {
        await updateTransaction(editingId, transactionData);
      } else {
        await addTransaction(transactionData);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // Não permitir fechar durante o salvamento
    setShowModal(false);
    setEditingId(null);
    setFormData({
      description: '', amount: '', targetBalance: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '', accountId: '', toAccountId: '', assetId: '', type: 'expense',
    });
  };

  const filteredTransactions = useMemo((): TransactionRow[] => {
    const rows: TransactionRow[] = [];
    const hasStartDate = !!filters.startDate;
    const hasEndDate = !!filters.endDate;
    const startDate = hasStartDate ? new Date(filters.startDate + 'T00:00:00') : null;
    const endDate = hasEndDate ? new Date(filters.endDate + 'T23:59:59') : null;

    for (const t of transactions) {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = !filters.categoryId || t.categoryId === filters.categoryId;
      let matchDate = true;

      if (hasStartDate || hasEndDate) {
        const rawDate = t.date || '';
        const txDateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
        const txDate = new Date(txDateStr + 'T00:00:00');

        if (isNaN(txDate.getTime())) {
          matchDate = false;
        } else {
          if (startDate && txDate < startDate) {
            matchDate = false;
          }
          if (endDate && txDate > endDate) {
            matchDate = false;
          }
        }
      }

      if (!matchSearch || !matchCategory || !matchDate) continue;

      const isTransfer = t.type === 'transfer' && t.toAccountId;
      const matchOrigin = !filters.accountId || t.accountId === filters.accountId;
      const matchDest = isTransfer && filters.accountId && t.toAccountId === filters.accountId;

      if (!filters.accountId) {
        if (matchOrigin) rows.push({ transaction: t, creditView: false });
        continue;
      }
      if (matchOrigin) rows.push({ transaction: t, creditView: false });
      else if (matchDest) rows.push({ transaction: t, creditView: true });
    }
    return rows;
  }, [transactions, searchTerm, filters]);

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      toast.info('Não há transações para exportar com os filtros atuais.');
      return;
    }

    const escapeCsvValue = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[;"\n\r]/.test(str)) {
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return str;
    };

    const header = [
      'Descrição',
      'Data',
      'Categoria',
      'Conta Origem',
      'Conta Destino',
      'Ativo',
      'Tipo',
      'Valor',
    ].join(';');

    const rows = filteredTransactions.map(({ transaction: t, creditView }) => {
      const category = getCategoryFullName(t.categoryId);
      const accountOrigin = accounts.find((a) => a.id === t.accountId)?.name || '';
      const accountDest = t.toAccountId
        ? accounts.find((a) => a.id === t.toAccountId)?.name || ''
        : '';
      const assetName = t.assetId ? assets.find((a) => a.id === t.assetId)?.name || '' : '';
      const typeLabel =
        t.type === 'income'
          ? 'Receita'
          : t.type === 'expense'
          ? 'Despesa'
          : t.type === 'transfer'
          ? 'Transferência'
          : 'Ajuste';
      const amountSign = creditView || t.type === 'income' ? 1 : -1;
      const rawAmount = amountSign * Math.abs(t.amount);
      const amountStr = rawAmount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return [
        escapeCsvValue(t.description),
        escapeCsvValue(formatDate(t.date)),
        escapeCsvValue(category),
        escapeCsvValue(accountOrigin),
        escapeCsvValue(accountDest),
        escapeCsvValue(assetName),
        escapeCsvValue(typeLabel),
        escapeCsvValue(amountStr),
      ].join(';');
    });

    const csvContent = [header, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.download = `transacoes_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Transações</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seus lançamentos e automatize com IA.</p>
        </div>
        <div className="flex gap-2 flex-wrap xl:flex-nowrap">
          <button
            onClick={async () => {
              setTransactionsRefreshing(true);
              try {
                await refreshTransactions();
              } finally {
                setTransactionsRefreshing(false);
              }
            }}
            disabled={transactionsRefreshing}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 flex-shrink-0"
            title="Atualizar transações"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${transactionsRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleScannerClick} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-5 py-3 rounded-xl font-semibold hover:bg-emerald-100 transition-all relative group flex-shrink-0">
            <Camera className="w-5 h-5 group-hover:animate-pulse" /> Scanner
            {!isPremium && <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 rounded-full p-1 shadow-sm"><Star className="w-3.5 h-3.5" /></div>}
          </button>
          <button
            onClick={() => { setImportStep('upload'); setShowImportModal(true); }}
            disabled={isImporting}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <FileSpreadsheet className="w-5 h-5" /> Importar CSV
          </button>
          <button
            onClick={() => handleExportCsv()}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all flex-shrink-0"
          >
            <FileText className="w-5 h-5" /> Exportar CSV
          </button>
          <button onClick={() => { setEditingId(null); setShowModal(true); }} className="flex items-center gap-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-100 dark:shadow-none active:scale-[0.98] flex-shrink-0">
            <Plus className="w-5 h-5" /> Novo Lançamento
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-2 xl:gap-4">
          <div className="relative min-w-0 lg:col-span-4 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input id="transactions-search" name="search" type="text" placeholder="Buscar por descrição..." aria-label="Buscar transações por descrição" className="w-full min-w-0 pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="min-w-0">
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            >
              <option value="">Todas Categorias</option>
              {categories
                .slice()
                .sort((a, b) =>
                  getCategoryFullName(a.id).localeCompare(getCategoryFullName(b.id), 'pt-BR', {
                    sensitivity: 'base',
                  }),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryFullName(c.id)}
                  </option>
                ))}
            </select>
          </div>
          <div className="min-w-0">
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              value={filters.accountId}
              onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
            >
              <option value="">Todas as Contas</option>
              {accounts
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="min-w-0">
            <input
              id="transactions-start-date"
              name="startDate"
              type="date"
              aria-label="Filtrar transações a partir da data"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="min-w-0">
            <input
              id="transactions-end-date"
              name="endDate"
              type="date"
              aria-label="Filtrar transações até a data"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ativo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredTransactions.map(({ transaction: t, creditView }) => (
                <tr key={creditView ? `${t.id}-credit` : t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group text-sm">
                  <td className="px-6 py-4">
                     <p className="font-bold text-slate-900 dark:text-slate-100">{t.description}</p>
                     <p className="text-[10px] text-slate-400">
                      {formatDate(t.date)}
                     </p>
                  </td>
                  <td className="px-6 py-4">
                     <span className="inline-flex items-center text-xs font-medium text-slate-700 dark:text-slate-300">
                       {getCategoryFullName(t.categoryId)}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                     {creditView ? (
                       <span className="text-slate-500 dark:text-slate-400">
                         De: {accounts.find(a => a.id === t.accountId)?.name || '---'}
                       </span>
                     ) : (
                       <>
                         {accounts.find(a => a.id === t.accountId)?.name || '---'}
                         {t.type === 'transfer' && t.toAccountId && (
                           <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                             → {accounts.find(a => a.id === t.toAccountId)?.name || '---'}
                           </span>
                         )}
                       </>
                     )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                     {t.assetId ? (assets.find(a => a.id === t.assetId)?.name || '---') : '---'}
                  </td>
                  <td className={`px-6 py-4 font-black text-right ${creditView || t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {creditView || t.type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(t.amount))}
                  </td>
                  <td className="px-6 py-4 text-right">
                     {/* Botões de Editar/Excluir para Desktop (visíveis no hover) */}
                     <div className="hidden lg:flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteTransaction(t)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                     {/* Dropdown Menu para Mobile/Tablet (visível em telas menores que lg) */}
                     <div className="lg:hidden flex justify-end">
                       <DropdownMenu.Root>
                         <DropdownMenu.Trigger asChild>
                           <button
                             className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                             aria-label="Mais opções"
                           >
                             <MoreVertical className="w-4 h-4" />
                           </button>
                         </DropdownMenu.Trigger>

                         <DropdownMenu.Portal>
                           <DropdownMenu.Content
                             className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 p-1 z-50 animate-in fade-in zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[side=top]:slide-in-from-bottom-2 data-[side=right]:slide-in-from-left-2 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2"
                             sideOffset={5}
                             align="end"
                           >
                             <DropdownMenu.Item
                               className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer outline-none transition-colors"
                               onSelect={() => handleEdit(t)}
                             >
                               <Edit2 className="w-4 h-4 text-emerald-500" /> Editar
                             </DropdownMenu.Item>
                             <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                             <DropdownMenu.Item
                               className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer outline-none transition-colors"
                               onSelect={() => handleDeleteTransaction(t)}
                             >
                               <Trash2 className="w-4 h-4" /> Excluir
                             </DropdownMenu.Item>
                             <DropdownMenu.Arrow className="fill-white dark:bg-slate-800" />
                           </DropdownMenu.Content>
                         </DropdownMenu.Portal>
                       </DropdownMenu.Root>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE IMPORTAÇÃO CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><FileSpreadsheet className="w-5 h-5" /></div>
                 <div>
                    <h3 className="text-xl font-black">Importação Inteligente</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passo {importStep === 'upload' ? '1' : importStep === 'mapping' ? '2' : '3'} de 3</p>
                 </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
               {importStep === 'upload' && (
                 <div 
                   onDragOver={handleDragOver} 
                   onDragLeave={handleDragLeave} 
                   onDrop={handleDrop}
                   className={`w-full border-4 border-dashed rounded-3xl p-16 flex flex-col items-center gap-6 transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'}`}
                 >
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center text-emerald-600"><Upload className="w-10 h-10" /></div>
                    <div className="text-center">
                       <p className="text-xl font-black text-slate-800 dark:text-slate-100">Arraste seu CSV aqui</p>
                       <p className="text-sm text-slate-400 mt-2">ou clique para selecionar de uma pasta</p>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all">Selecionar Arquivo</button>
                    <input id="transactions-csv-upload" name="csv" type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => e.target.files && parseCsvFile(e.target.files[0])} aria-label="Enviar arquivo CSV" />
                 </div>
               )}

               {importStep === 'mapping' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                       <div className="flex items-center gap-2 mb-4 text-slate-400">
                          <TableIcon className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Prévia dos Dados (5 primeiras linhas)</span>
                       </div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                             <thead>
                                <tr>{csvHeaders.map(h => <th key={h} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">{h}</th>)}</tr>
                             </thead>
                             <tbody>
                                {csvRawRows.slice(0, 5).map((row, i) => (
                                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
                                    {row.map((cell, j) => <td key={j} className="px-4 py-2 truncate max-w-[150px]">{cell}</td>)}
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       {(['date', 'description', 'amount'] as const).map(field => (
                         <div key={field} className="space-y-1">
                            <label htmlFor={`import-map-${field}`} className="text-[10px] font-black uppercase text-slate-400 ml-1">{field === 'date' ? 'Data' : field === 'description' ? 'Descrição' : 'Valor'}</label>
                            <select id={`import-map-${field}`} name={`columnMapping.${field}`} className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 font-bold" value={columnMapping[field]} onChange={e => setColumnMapping({...columnMapping, [field]: e.target.value})}>
                               <option value="">Selecione a coluna...</option>
                               {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                         </div>
                       ))}
                       <div className="space-y-1">
                          <label htmlFor="import-map-identifier" className="text-[10px] font-black uppercase text-slate-400 ml-1">Identificador (opcional)</label>
                          <select id="import-map-identifier" name="columnMapping.identifier" className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-500 font-bold" value={columnMapping.identifier} onChange={e => setColumnMapping({...columnMapping, identifier: e.target.value})}>
                             <option value="">Não mapear</option>
                             {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <button onClick={() => setImportStep('upload')} className="px-6 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">Voltar</button>
                       <button
                         onClick={() => isPremium ? handleAutoMapping() : setShowUpgradeModal(true)}
                         disabled={isPremium && isDetectingColumns}
                         className="flex-1 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative group"
                       >
                         {isDetectingColumns ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:animate-pulse" />}
                         Mapeamento Automático (IA)
                         {!isPremium && <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-900 rounded-full p-0.5 shadow-sm"><Star className="w-3 h-3" /></div>}
                       </button>
                       <button onClick={processMapping} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 transition-all">Próximo: Categorizar</button>
                    </div>
                 </div>
               )}

               {importStep === 'review' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                       <div className="space-y-1">
                          <label htmlFor="import-account" className="text-[10px] font-black uppercase text-slate-400">Importar para a Conta:</label>
                          <select id="import-account" name="importAccountId" className="w-full md:w-64 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold" value={importAccountId} onChange={e => setImportAccountId(e.target.value)}>
                             {accounts.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                       </div>
                       <button
                         onClick={() => isPremium ? handleAiCategorize() : setShowUpgradeModal(true)}
                         disabled={isPremium && isAiCategorizing}
                         className="px-6 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg flex items-center gap-2 group transition-all disabled:opacity-50 disabled:cursor-not-allowed relative shrink-0"
                       >
                         {isAiCategorizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5 group-hover:scale-110" />}
                         Categorização Automática (IA)
                         {!isPremium && <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-900 rounded-full p-0.5 shadow-sm"><Star className="w-3 h-3" /></div>}
                       </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {importedRows.map((row, idx) => (
                         <div key={row.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-emerald-200 transition-all">
                            <div className="flex-1">
                               <p className="font-bold text-sm">{row.description}</p>
                               <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>{formatDate(row.date)}</span>
                                  <span className="font-black text-slate-900 dark:text-slate-100">{formatCurrency(row.amount)}</span>
                                  {row.isAiCategorized && <span className="flex items-center gap-0.5 text-emerald-600"><Sparkles className="w-2.5 h-2.5" /> Sugerido</span>}
                               </div>
                            </div>
                            <select className="w-full md:w-56 p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium" value={row.categoryId} onChange={e => {
                               const newRows = [...importedRows];
                               newRows[idx].categoryId = e.target.value;
                               setImportedRows(newRows);
                            }}>
                               <option value="">📦 Sem categoria (definir depois)</option>
                               {categories
                                 .filter(c => c.type === row.type)
                                 .sort((a, b) => getCategorySortName(a.id).localeCompare(getCategorySortName(b.id), 'pt-BR', { sensitivity: 'base' }))
                                 .map(c => <option key={c.id} value={c.id}>{getCategoryFullName(c.id)}</option>)}
                            </select>
                         </div>
                       ))}
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                       <button
                         onClick={() => setImportStep('mapping')}
                         className="px-6 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                       >
                         Voltar
                       </button>
                       <button
                         onClick={finalizeImport}
                         className="flex-1 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-[0.98]"
                       >
                         Finalizar Importação de {importedRows.length} Itens
                       </button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {showScanner && <div className="fixed inset-0 z-[100] flex flex-col bg-black"><div className="p-6 flex justify-between text-white"><h3 className="font-black">Scanner</h3><button onClick={stopCamera}><X /></button></div><div className="flex-1 relative flex items-center justify-center"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[80%] aspect-[3/4] border-2 border-emerald-500 rounded-3xl" /></div></div><div className="p-10 flex justify-center"><button onClick={captureAndScan} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"><div className="w-16 h-16 rounded-full bg-white" /></button><canvas ref={canvasRef} className="hidden" /></div></div>}

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: 'expense', label: 'DESPESA' },
                  { id: 'income', label: 'RECEITA' },
                  { id: 'transfer', label: 'TRANSF.' },
                  { id: 'adjustment', label: 'AJUSTE' }
                ].map(type => (
                  <button key={type.id} type="button" onClick={() => setFormData({...formData, type: type.id as any})} className={`py-2 text-[10px] font-black rounded-lg transition-all ${formData.type === type.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'}`}>
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label htmlFor="transaction-description" className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição</label>
                <input id="transaction-description" name="description" type="text" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="transaction-amount" className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor (R$)</label>
                  <input id="transaction-amount" name="amount" type="number" step="0.01" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="transaction-date" className="text-[10px] font-black text-slate-400 uppercase ml-1">Data</label>
                  <input id="transaction-date" name="date" type="date" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:border-emerald-500" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="transaction-account" className="text-[10px] font-black text-slate-400 uppercase ml-1">Conta</label>
                  <select id="transaction-account" name="accountId" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none" value={formData.accountId} onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}>
                    <option value="">Escolha...</option>
                    {accounts.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {(formData.type == 'expense' || formData.type == 'income') && (
                <div className="space-y-1">
                  <label htmlFor="transaction-category" className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria</label>
                  <select id="transaction-category" name="categoryId" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none" value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                    <option value="">Escolha...</option>
                    {categories.filter(c => c.type === (formData.type === 'income' ? 'income' : 'expense')).slice().sort((a, b) => getCategoryFullName(a.id).localeCompare(getCategoryFullName(b.id), 'pt-BR', { sensitivity: 'base' })).map(c => <option key={c.id} value={c.id}>{getCategoryFullName(c.id)}</option>)}
                  </select>
                </div>
                )}
              </div>
              {formData.type === 'transfer' && (
                <>
                  <div className="space-y-1">
                    <label htmlFor="transaction-to-account" className="text-[10px] font-black text-slate-400 uppercase ml-1">Conta Destino</label>
                    <select id="transaction-to-account" name="toAccountId" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none" value={formData.toAccountId} onChange={(e) => {
                      const selectedAccount = accounts.find(a => a.id === e.target.value);
                      setFormData({ ...formData, toAccountId: e.target.value, assetId: selectedAccount?.type !== 'INVESTMENT' ? '' : formData.assetId });
                    }}>
                      <option value="">Escolha...</option>
                      {accounts.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  {formData.toAccountId && accounts.find(a => a.id === formData.toAccountId)?.type === 'INVESTMENT' && (
                    assets.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">Nenhum ativo cadastrado</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Para transferir para uma conta de investimentos, é necessário cadastrar ao menos um ativo (ex.: Tesouro Direto, Ações).
                            </p>
                            <Link
                              to="/investments#ativos"
                              className="inline-flex items-center gap-2 mt-3 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                            >
                              Cadastrar ativo
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label htmlFor="transaction-asset" className="text-[10px] font-black text-slate-400 uppercase ml-1">Ativo</label>
                        <select id="transaction-asset" name="assetId" required className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none" value={formData.assetId} onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}>
                          <option value="">Escolha o ativo...</option>
                          {assets.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map(asset => (
                            <option key={asset.id} value={asset.id}>{asset.name}</option>
                          ))}
                        </select>
                      </div>
                    )
                  )}
                </>
              )}
              <button 
                type="submit" 
                disabled={isSubmitting || (formData.type === 'transfer' && formData.toAccountId && accounts.find(a => a.id === formData.toAccountId)?.type === 'INVESTMENT' && assets.length === 0)}
                className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{editingId ? 'Salvar Alterações' : 'Salvar Lançamento'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE UPGRADE CONSISTENTE */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowUpgradeModal(false)} />
           <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="h-48 bg-emerald-600 flex flex-col items-center justify-center text-white relative">
                 <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
                 <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm"><Crown className="w-10 h-10" /></div>
                 <h2 className="text-2xl font-black uppercase tracking-tighter">Seja Verde PRO</h2>
              </div>
              <div className="p-8 space-y-6">
                 <p className="text-center text-slate-600 dark:text-slate-400 font-medium">Libere recursos de inteligência artificial exclusivos para sua gestão.</p>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                       <Sparkles className="w-6 h-6 text-emerald-600" />
                       <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">Importação Automática via IA</div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                       <BrainCircuit className="w-6 h-6 text-emerald-600" />
                       <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">Consultor IA Personalizado</div>
                    </div>
                 </div>
                 <button 
                  onClick={() => window.open(stripeCheckoutUrl, '_blank')}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                 >
                    QUERO SER PRO - R$ 19,90
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};