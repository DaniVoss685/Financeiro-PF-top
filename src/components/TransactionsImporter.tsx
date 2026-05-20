import React, { useState, useRef } from 'react';
import { useAppContext, Transaction, Category } from '../store/AppContext';
import { 
  FileText, 
  Upload, 
  Settings, 
  Check, 
  X, 
  AlertCircle, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Info,
  Layers,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ParsedTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string; // YYYY-MM-DD
  categoryId?: string;
  bankId?: string;
  creditCardId?: string;
}

interface TransactionsImporterProps {
  onImportComplete?: () => void;
  onClose: () => void;
}

export default function TransactionsImporter({ onImportComplete, onClose }: TransactionsImporterProps) {
  const { 
    categories, 
    banks, 
    creditCards, 
    addTransaction 
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'FILE' | 'PASTE'>('FILE');
  
  // Parsing states
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [parsedList, setParsedList] = useState<ParsedTransaction[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  
  // Customization mappings
  const [targetBankId, setTargetBankId] = useState<string>('');
  const [targetCardId, setTargetCardId] = useState<string>('');
  const [selectedMapping, setSelectedMapping] = useState<Record<string, string>>({}); // itemId -> categoryId

  // CSV Custom column mapping state (fallback if auto-detect fails)
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [showCsvMapping, setShowCsvMapping] = useState(false);
  const [dateColIdx, setDateColIdx] = useState<number>(-1);
  const [descColIdx, setDescColIdx] = useState<number>(-1);
  const [valColIdx, setValColIdx] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: auto classify transactions by text keywords
  const suggestCategory = (desc: string, type: 'INCOME' | 'EXPENSE'): string => {
    const normalizeStr = (str: string): string => {
      return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    };

    const text = normalizeStr(desc);
    
    if (type === 'INCOME') {
      // Find salary or credit categories
      const salaryCat = categories.find(c => c.type === 'INCOME' && normalizeStr(c.name).includes('salario'));
      if (salaryCat) return salaryCat.id;
      
      const reimbursementCat = categories.find(c => {
        const n = normalizeStr(c.name);
        return n.includes('reembolso') || n.includes('emprestimo') || n.includes('recebimento');
      });
      if (reimbursementCat) return reimbursementCat.id;

      const firstIncome = categories.find(c => c.type === 'INCOME' || c.type === 'BOTH');
      return firstIncome?.id || '';
    }

    // EXPENSES Keywords Mapping
    const mappings: Record<string, string[]> = {};

    // Check custom categories matching name too, dynamically populating keywords
    for (const cat of categories) {
      const catName = normalizeStr(cat.name);
      
      // 1. ALIMENTAÇÃO (Food / Supermarket)
      if (
        catName.includes('alimentacao') || 
        catName.includes('comida') || 
        catName.includes('mercado') || 
        catName.includes('refeicao') || 
        catName.includes('restaurante') || 
        catName.includes('lanchonete') || 
        catName.includes('padaria')
      ) {
        mappings[cat.id] = [
          ...(mappings[cat.id] || []), 
          'ifood', 'mercado', 'supermercado', 'restaurante', 'padaria', 'extra', 'carrefour', 
          'pao de acucar', 'assai', 'atacadao', 'compras', 'confeitaria', 'food', 'burguer', 
          'mcdonalds', 'bk', 'outback', 'coco bambu', 'habibs', 'jantar', 'almoco', 'pizza', 
          'fruta', 'açougue', 'sacolao', 'doceria', 'chocolate', 'bebida', 'adega', 'bar', 
          'compre bem', 'bompreco', 'walmart', 'getnet'
        ];
      }
      
      // 2. TRANSPORTE / VEÍCULO / FUEL (Transportation / Vehicle / Fuel)
      if (
        catName.includes('transporte') || 
        catName.includes('carro') || 
        catName.includes('combustivel') || 
        catName.includes('veiculo') || 
        catName.includes('moto') || 
        catName.includes('auto') || 
        catName.includes('locomocao') ||
        catName.includes('viagem')
      ) {
        mappings[cat.id] = [
          ...(mappings[cat.id] || []), 
          'uber', '99taxis', '99', 'posto', 'gasolina', 'combustivel', 'shell', 'ipiranga', 
          'petrobras', 'br mania', 'pedagio', 'sem parar', 'veloe', 'diesel', 'etanol', 
          'alcool', 'dislub', 'ale', 'gas station', 'lubrificante', 'mecanica', 'oficina', 
          'estacionamento', 'garage', 'zona azul', 'autopeças', 'pneu', 'honda', 'toyota', 
          'fiat', 'chevrolet', 'ford', 'hyundai', 'renault', 'asa branca', 'branca'
        ];
      }

      // 3. MORADIA (Housing)
      if (
        catName.includes('moradia') || 
        catName.includes('casa') || 
        catName.includes('aluguel') || 
        catName.includes('lar') || 
        catName.includes('residencia') || 
        catName.includes('apartamento')
      ) {
        mappings[cat.id] = [
          ...(mappings[cat.id] || []), 
          'aluguel', 'condominio', 'iptu', 'enel', 'neoenergia', 'sabesp', 'copasa', 
          'luz', 'energia', 'agua', 'gas', 'internet', 'claro', 'vivo', 'net', 'reforma', 
          'material de construcao', 'tok&stok', 'leroy', 'mobly', 'casa verde', 'eletromidia'
        ];
      }

      // 4. LAZER / ENTRETENIMENTO (Leisure / Entertainment)
      if (
        catName.includes('lazer') || 
        catName.includes('viagem') || 
        catName.includes('entretenimento') || 
        catName.includes('hobby') || 
        catName.includes('diversao') || 
        catName.includes('cultura') || 
        catName.includes('cinema')
      ) {
        mappings[cat.id] = [
          ...(mappings[cat.id] || []), 
          'netflix', 'spotify', 'cinema', 'show', 'ingresso', 'hotel', 'airbnb', 'steam', 
          'playstation', 'jogos', 'shopee', 'shein', 'aliexpress', 'booking', 'decolar', 
          'latam', 'azul', 'gol', 'passagem', 'clube', 'churrasco', 'festa', 'teatro'
        ];
      }

      // 5. SAÚDE (Health / Medical)
      if (
        catName.includes('saude') || 
        catName.includes('farmacia') || 
        catName.includes('medico') || 
        catName.includes('clinica') || 
        catName.includes('hospital') || 
        catName.includes('dentista')
      ) {
        mappings[cat.id] = [
          ...(mappings[cat.id] || []), 
          'drogaria', 'farmacia', 'pague menos', 'raia', 'drogasil', 'consulta', 'exame', 
          'hospital', 'unimed', 'odontoprev', 'remedio', 'pills', 'psicologo', 'terapia'
        ];
      }
    }

    // First try: exact match of a keyword
    for (const [catId, keywords] of Object.entries(mappings)) {
      if (keywords.some(keyword => text.includes(normalizeStr(keyword)))) {
        // Confirm if cat exists
        if (categories.some(c => c.id === catId)) {
          return catId;
        }
      }
    }

    // Second try: fallback to static default mappings if the dynamic ones didn't match
    const foodKeywords = ['ifood', 'mercado', 'supermercado', 'restaurante', 'padaria', 'confeitaria', 'food', 'burguer', 'mcdonalds', 'pizza', 'jantar', 'almoco', 'refeicao'];
    const homeKeywords = ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'saneamento', 'gas', 'sabesp', 'coelba', 'net', 'claro', 'vivo', 'internet'];
    const transportKeywords = ['uber', '99taxis', '99', 'posto', 'gasolina', 'combustivel', 'shell', 'ipiranga', 'petrobras', 'pedagio', 'sem parar', 'veloe', 'diesel', 'etanol', 'alcool'];

    if (foodKeywords.some(kw => text.includes(kw))) {
      const foodCat = categories.find(c => {
        const n = normalizeStr(c.name);
        return n.includes('alimentacao') || n.includes('comida') || n.includes('mercado');
      });
      if (foodCat) return foodCat.id;
    }

    if (transportKeywords.some(kw => text.includes(kw))) {
      const transCat = categories.find(c => {
        const n = normalizeStr(c.name);
        return n.includes('transporte') || n.includes('carro') || n.includes('combustivel') || n.includes('veiculo') || n.includes('moto') || n.includes('auto');
      });
      if (transCat) return transCat.id;
    }

    if (homeKeywords.some(kw => text.includes(kw))) {
      const homeCat = categories.find(c => {
        const n = normalizeStr(c.name);
        return n.includes('moradia') || n.includes('casa') || n.includes('aluguel');
      });
      if (homeCat) return homeCat.id;
    }

    // Default: find first expense category
    const firstExpense = categories.find(c => c.type === 'EXPENSE' || c.type === 'BOTH');
    return firstExpense?.id || '';
  };

  // Parsing OFX text content
  const parseOFXContent = (text: string) => {
    const list: ParsedTransaction[] = [];
    const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    
    while ((match = stmttrnRegex.exec(text)) !== null) {
      const trnContent = match[1];
      
      const getTagValue = (tag: string) => {
        const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
        const tagMatch = trnContent.match(regex);
        return tagMatch ? tagMatch[1].trim() : '';
      };

      const type = getTagValue('TRNTYPE');
      const dtposted = getTagValue('DTPOSTED');
      const trnamt = getTagValue('TRNAMT');
      const memo = getTagValue('MEMO');
      const name = getTagValue('NAME') || memo;

      // Date Format YYYYMMDD...
      let dateStr = format(new Date(), 'yyyy-MM-dd');
      if (dtposted && dtposted.length >= 8) {
        const y = dtposted.substring(0, 4);
        const m = dtposted.substring(4, 6);
        const d = dtposted.substring(6, 8);
        dateStr = `${y}-${m}-${d}`;
      }

      const amount = Math.abs(parseFloat(trnamt || '0'));
      const txType: 'INCOME' | 'EXPENSE' = (type === 'CREDIT' || parseFloat(trnamt || '0') > 0) ? 'INCOME' : 'EXPENSE';

      if (name && amount > 0) {
        const itemId = `ofx-${Date.now()}-${Math.random()}`;
        const autoCat = suggestCategory(name, txType);
        
        list.push({
          id: itemId,
          description: name,
          amount,
          type: txType,
          date: dateStr,
          categoryId: autoCat
        });
      }
    }

    if (list.length === 0) {
      setFileError('Nenhuma transação encontrada no arquivo OFX. Verifique se o arquivo segue o formato padrão.');
    } else {
      setParsedList(list);
      // Select All by default
      const initialSelection: Record<string, boolean> = {};
      const initialMappings: Record<string, string> = {};
      list.forEach(item => {
        initialSelection[item.id] = true;
        if (item.categoryId) {
          initialMappings[item.id] = item.categoryId;
        }
      });
      setSelectedItems(initialSelection);
      setSelectedMapping(initialMappings);
    }
  };

  // Parsing CSV text content
  const parseCSVContent = (text: string) => {
    // Split by carriage return/lines
    const lines = text.split(/\r?\n/).map(line => {
      // Split by comma or semicolon
      const separator = line.includes(';') ? ';' : ',';
      
      // Simple parser taking quotes into account
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    }).filter(row => row.length > 1);

    if (lines.length < 2) {
      setFileError('O arquivo CSV deve possuir um cabeçalho e pelo menos uma linha de dados.');
      return;
    }

    const headers = lines[0].map(h => h.toLowerCase());
    
    // Attempt auto-detection
    let dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date') || h.includes('vencimento') || h.includes('competência'));
    let descIdx = headers.findIndex(h => h.includes('descri') || h.includes('description') || h.includes('historico') || h.includes('mercador') || h.includes(' estabelecimento'));
    let valIdx = headers.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value') || h.includes('total') || h.includes('preço'));

    if (dateIdx !== -1 && descIdx !== -1 && valIdx !== -1) {
      processCsvRows(lines.slice(1), dateIdx, descIdx, valIdx);
    } else {
      // Fail back to manual mapping UI
      setCsvColumns(lines[0]);
      setCsvRows(lines.slice(1));
      setDateColIdx(dateIdx !== -1 ? dateIdx : 0);
      setDescColIdx(descIdx !== -1 ? descIdx : 1);
      setValColIdx(valIdx !== -1 ? valIdx : 2);
      setShowCsvMapping(true);
    }
  };

  const processCsvRows = (rows: string[][], dateIdx: number, descIdx: number, valIdx: number) => {
    const list: ParsedTransaction[] = [];
    
    rows.forEach(row => {
      if (row.length <= Math.max(dateIdx, descIdx, valIdx)) return;

      const rawDate = row[dateIdx];
      const rawDesc = row[descIdx];
      const rawVal = row[valIdx];

      if (!rawDate || !rawDesc || !rawVal) return;

      // Extract details
      // 1. Clean description
      const desc = rawDesc.trim();

      // 2. Parse Date (DD/MM/YYYY or YYYY-MM-DD or standard CSV matches)
      let parsedDate = format(new Date(), 'yyyy-MM-dd');
      const dateParts = rawDate.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
      if (dateParts) {
        const d = dateParts[1].padStart(2, '0');
        const m = dateParts[2].padStart(2, '0');
        let y = dateParts[3];
        if (y.length === 2) y = '20' + y;
        parsedDate = `${y}-${m}-${d}`;
      } else if (rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        parsedDate = rawDate.substring(0, 10);
      }

      // 3. Amount and Income/Expense detection
      // Nubank value can have negative sign or be negative. Brazilian decimal commas too.
      // E.g., "-15,50" or "450.00" or "+1200,00"
      const cleanValStr = rawVal.replace(/\s/g, '').replace(/R\$/g, '');
      const isNegativeVal = cleanValStr.includes('-');
      
      const normalizedVal = cleanValStr
        .replace(/-/g, '')
        .replace(/\+/g, '')
        .replace(/\./g, '') // remove thousand dot
        .replace(',', '.'); // replace decimal comma
      
      const amount = Math.abs(parseFloat(normalizedVal || '0'));
      if (isNaN(amount) || amount === 0) return;

      const txType: 'INCOME' | 'EXPENSE' = (isNegativeVal || desc.toLowerCase().includes('compra') || desc.toLowerCase().includes('pagamento')) ? 'EXPENSE' : 'INCOME';

      const itemId = `csv-${Date.now()}-${Math.random()}`;
      const autoCat = suggestCategory(desc, txType);

      list.push({
        id: itemId,
        description: desc,
        amount,
        type: txType,
        date: parsedDate,
        categoryId: autoCat
      });
    });

    if (list.length === 0) {
      setFileError('Nenhuma transação válida pôde ser importada do seu arquivo CSV. Verifique o cabeçalho e os campos selecionados.');
    } else {
      setParsedList(list);
      setShowCsvMapping(false);
      setFileError('');

      // Auto select all
      const initialSelection: Record<string, boolean> = {};
      const initialMappings: Record<string, string> = {};
      list.forEach(item => {
        initialSelection[item.id] = true;
        if (item.categoryId) {
          initialMappings[item.id] = item.categoryId;
        }
      });
      setSelectedItems(initialSelection);
      setSelectedMapping(initialMappings);
    }
  };

  // Parse Copied Plain Text / Scraped PDF lines
  const parseCopiedText = () => {
    if (!pastedText.trim()) {
      setFileError('Por favor, cole algum texto contendo as transações antes de processar.');
      return;
    }

    const lines = pastedText.split('\n');
    const results: ParsedTransaction[] = [];
    const dateRegexCombined = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})|(\d{1,2})[/\-.](\d{1,2})/;

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      let dateStr = '';
      const dateMatch = cleanLine.match(dateRegexCombined);
      
      if (dateMatch) {
        if (dateMatch[1] && dateMatch[2]) {
          const d = dateMatch[1].padStart(2, '0');
          const m = dateMatch[2].padStart(2, '0');
          let y = dateMatch[3] || new Date().getFullYear().toString();
          if (y.length === 2) y = '20' + y;
          dateStr = `${y}-${m}-${d}`;
        } else if (dateMatch[4] && dateMatch[5]) {
          const d = dateMatch[4].padStart(2, '0');
          const m = dateMatch[5].padStart(2, '0');
          const y = new Date().getFullYear().toString();
          dateStr = `${y}-${m}-${d}`;
        }
      }

      if (!dateStr) return;

      const lineWithoutDate = cleanLine.replace(dateRegexCombined, '');
      const valueRegex = /[-+]?\s*(?:R\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+(?:[.,][0-9]{2})?)/g;
      const valuesFound = [...lineWithoutDate.matchAll(valueRegex)];
      
      if (valuesFound.length > 0) {
        const fullMatchedBlock = valuesFound[valuesFound.length - 1][0];
        const numberBlock = valuesFound[valuesFound.length - 1][1]
          .replace(/\./g, '')
          .replace(',', '.');

        const amount = Math.abs(parseFloat(numberBlock));
        if (isNaN(amount) || amount === 0) return;

        const isNegative = fullMatchedBlock.includes('-') || 
                           lineWithoutDate.toLowerCase().includes('débito') || 
                           lineWithoutDate.toLowerCase().includes('pagamento');
        
        const isPositive = fullMatchedBlock.includes('+') || 
                           lineWithoutDate.toLowerCase().includes('crédito') || 
                           lineWithoutDate.toLowerCase().includes('recebido') || 
                           lineWithoutDate.toLowerCase().includes('depósito') || 
                           lineWithoutDate.toLowerCase().includes('salário');
        
        const type: 'INCOME' | 'EXPENSE' = (isPositive && !isNegative) ? 'INCOME' : 'EXPENSE';

        let description = lineWithoutDate.replace(fullMatchedBlock, '')
          .replace(/R\$/g, '')
          .replace(/[-+]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (description.length < 2) {
          description = 'Transação Importada';
        }

        const autoCat = suggestCategory(description, type);
        const itemId = `text-${Date.now()}-${Math.random()}`;

        results.push({
          id: itemId,
          description,
          amount,
          type,
          date: dateStr,
          categoryId: autoCat
        });
      }
    });

    if (results.length === 0) {
      setFileError('Nenhum padrão de data + valor foi identificado nas linhas coladas. Certifique-se de copiar o texto legível do extrato ou banco.');
    } else {
      setParsedList(results);
      setFileError('');
      
      const initialSelection: Record<string, boolean> = {};
      const initialMappings: Record<string, string> = {};
      results.forEach(item => {
        initialSelection[item.id] = true;
        if (item.categoryId) {
          initialMappings[item.id] = item.categoryId;
        }
      });
      setSelectedItems(initialSelection);
      setSelectedMapping(initialMappings);
    }
  };

  // Drag-and-drop functions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFileError('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'ofx') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseOFXContent(text);
      };
      reader.readAsText(file);
    } else if (extension === 'csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSVContent(text);
      };
      reader.readAsText(file);
    } else if (extension === 'pdf') {
      // For PDF, we teach the user to copy/paste, or try parsing what we can
      setFileError('A leitura de PDFs compactados por criptografia requer conversão. Para máxima precisão e segurança de dados, utilize a aba de copiar e colar abaixo ou exporte extrato como OFX/CSV no seu banco ou aplicativo.');
      setActiveTab('PASTE');
    } else if (extension === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPastedText(text);
        setFileError('');
        setActiveTab('PASTE');
      };
      reader.readAsText(file);
    } else {
      setFileError('Formato não suportado. Carregue arquivos .OFX, .CSV ou copie o extrato em formato texto.');
    }
  };

  // Submit bulk imports
  const handleImportSubmit = () => {
    const recordsToImport = parsedList.filter(item => selectedItems[item.id]);

    if (recordsToImport.length === 0) {
      alert('Selecione pelo menos uma transação para importar.');
      return;
    }

    recordsToImport.forEach(item => {
      const mappedCatId = selectedMapping[item.id] || '';
      
      addTransaction({
        type: item.type,
        description: item.description,
        amount: item.amount,
        categoryId: mappedCatId,
        bankId: targetBankId || undefined,
        creditCardId: targetCardId || undefined,
        competenceDate: new Date(item.date).toISOString(),
        dueDate: new Date(item.date).toISOString(),
        paymentDate: new Date(item.date).toISOString(),
        status: item.type === 'INCOME' ? 'RECEIVED' : 'PAID',
        isRecurring: false,
        isInstallment: false
      });
    });

    if (onImportComplete) {
      onImportComplete();
    }
    onClose();
  };

  const handleToggleSelectAll = () => {
    const allSelected = parsedList.every(i => selectedItems[i.id]);
    const newState: Record<string, boolean> = {};
    parsedList.forEach(item => {
      newState[item.id] = !allSelected;
    });
    setSelectedItems(newState);
  };

  return (
    <div className="space-y-6">
      
      {/* Importer Panel Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Importar Extrato Bancário
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Importe arquivos OFX, CSV ou simplesmente copie e cole textos de PDF do seu internet banking
          </p>
        </div>
      </div>

      {/* Tabs */}
      {parsedList.length === 0 && (
        <div className="flex border-b border-border/60">
          <button
            onClick={() => { setActiveTab('FILE'); setFileError(''); }}
            className={cn(
              "px-5 py-3 text-xs font-bold uppercase tracking-wider relative cursor-pointer",
              activeTab === 'FILE' ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            Carregar Arquivo Bancário
          </button>
          <button
            onClick={() => { setActiveTab('PASTE'); setFileError(''); }}
            className={cn(
              "px-5 py-3 text-xs font-bold uppercase tracking-wider relative cursor-pointer",
              activeTab === 'PASTE' ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            Copiar & Colar Texto do PDF
          </button>
        </div>
      )}

      {/* Manual CSV column mapping */}
      {showCsvMapping && (
        <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Colunas Personalizadas do CSV</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Detectamos layouts diferentes. Para processar seu arquivo corretamente, mapeie cada coluna abaixo:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-muted-foreground block mb-1 uppercase">Coluna de Data</label>
              <select 
                value={dateColIdx}
                onChange={e => setDateColIdx(parseInt(e.target.value))}
                className="w-full bg-muted/40 text-xs border border-border rounded-xl p-2.5 text-foreground outline-none"
              >
                {csvColumns.map((col, idx) => (
                  <option key={idx} value={idx}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-muted-foreground block mb-1 uppercase">Coluna de Descrição / Estabelecimento</label>
              <select 
                value={descColIdx}
                onChange={e => setDescColIdx(parseInt(e.target.value))}
                className="w-full bg-muted/40 text-xs border border-border rounded-xl p-2.5 text-foreground outline-none"
              >
                {csvColumns.map((col, idx) => (
                  <option key={idx} value={idx}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-muted-foreground block mb-1 uppercase">Coluna do Valor</label>
              <select 
                value={valColIdx}
                onChange={e => setValColIdx(parseInt(e.target.value))}
                className="w-full bg-muted/40 text-xs border border-border rounded-xl p-2.5 text-foreground outline-none"
              >
                {csvColumns.map((col, idx) => (
                  <option key={idx} value={idx}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => { setShowCsvMapping(false); setCsvRows([]); }}
              className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground hover:bg-muted/40 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => processCsvRows(csvRows, dateColIdx, descColIdx, valColIdx)}
              className="px-4 py-2 text-xs font-bold uppercase bg-primary text-primary-foreground rounded-xl cursor-pointer"
            >
              Confirmar Mapeamento
            </button>
          </div>
        </div>
      )}

      {/* Screen 1: Configuration / Parsed transaction list not loaded yet */}
      {parsedList.length === 0 && !showCsvMapping && (
        <div className="space-y-4">
          
          {activeTab === 'FILE' ? (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-all",
                dragActive 
                  ? "border-primary bg-primary/5 scale-[1.01]" 
                  : "border-border hover:border-primary/50 hover:bg-muted/20"
              )}
            >
              <input 
                ref={fileInputRef}
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">Arraste seu arquivo de extrato aqui</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">Suporta formatos <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-foreground hover:text-primary">.OFX</span>, <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-foreground hover:text-primary">.CSV</span> ou arquivos texto <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-foreground hover:text-primary">.TXT</span></p>
              </div>

              <button
                type="button"
                className="px-5 py-2.5 bg-primary/90 text-primary-foreground hover:bg-primary font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer"
              >
                Selecionar Arquivo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-3 items-start">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  <strong>Dica de Extração Avançada:</strong> Você pode carregar um arquivo PDF, mas copiar e colar e ler de forma limpa garante 100% de compatibilidade! Abra o extrato oficial no seu leitor de PDF do computador ou celular, dê <kbd className="bg-muted px-1 py-0.5 rounded border text-[10px]">Ctrl+A</kbd> e depois <kbd className="bg-muted px-1 py-0.5 rounded border text-[10px]">Ctrl+C</kbd>, e jogue na caixa abaixo. Nosso algoritmo inteligente mapeia datas, valores e rótulos sozinho!
                </p>
              </div>

              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Exemplo de conteúdo aceitável:&#10;20/05/2026 Mercado Compre Bem R$ -152,00&#10;22/05 Restaurante Estrela R$ 42,90&#10;25-05-2026 Rendimentos Nu +R$ 1.500,00"
                rows={8}
                className="w-full bg-muted/20 border border-border rounded-2xl p-4 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={parseCopiedText}
                  className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Analisar Linhas Coladas
                </button>
              </div>
            </div>
          )}

          {fileError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-xl flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{fileError}</span>
            </div>
          )}

        </div>
      )}

      {/* Screen 2: Found transactions and review checkboxes */}
      {parsedList.length > 0 && (
        <div className="space-y-6">
          
          {/* Target Account selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/15 border border-border/60 rounded-2xl p-4">
            <div>
              <label className="text-[10px] font-black text-muted-foreground block mb-1.5 uppercase">Destinar À Conta Bancária</label>
              <select
                value={targetBankId}
                onChange={e => setTargetBankId(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="">Lançar nas respectivas contas padrões</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-muted-foreground block mb-1.5 uppercase">Destinar Ao Cartão de Crédito</label>
              <select
                value={targetCardId}
                onChange={e => setTargetCardId(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="">Não vincular a faturas de cartões</option>
                {creditCards.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Header information */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <span className="text-xs text-muted-foreground font-semibold">
              Análise concluída: <strong className="text-foreground">{parsedList.length}</strong> transações encontradas.
            </span>
            <button
              onClick={handleToggleSelectAll}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              {parsedList.every(i => selectedItems[i.id]) ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
          </div>

          {/* Checklist Table */}
          <div className="border border-border rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/40 sticky top-0 border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-wider backdrop-blur-sm z-10">
                <tr>
                  <th className="p-3 w-10 text-center">Sel</th>
                  <th className="p-3 w-28">Data</th>
                  <th className="p-3">Descrição da Transação</th>
                  <th className="p-3 w-40">Categoria Recomendada</th>
                  <th className="p-3 w-32 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {parsedList.map((item, idx) => {
                  const isSelected = !!selectedItems[item.id];
                  
                  return (
                    <tr 
                      key={item.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors",
                        isSelected ? "bg-primary/5" : "opacity-60"
                      )}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          className="text-primary hover:scale-105 active:scale-95 transition-all mx-auto block cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </button>
                      </td>
                      
                      {/* Date editable */}
                      <td className="p-3 font-mono text-muted-foreground font-semibold">
                        <input
                          type="date"
                          value={item.date}
                          onChange={e => {
                            const newDate = e.target.value;
                            setParsedList(prev => prev.map(p => p.id === item.id ? { ...p, date: newDate } : p));
                          }}
                          className="bg-transparent border-0 hover:bg-muted/40 focus:bg-card p-1 rounded font-mono text-xs text-foreground cursor-pointer select-none outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </td>

                      {/* Description editable */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => {
                            const newDesc = e.target.value;
                            setParsedList(prev => prev.map(p => p.id === item.id ? { ...p, description: newDesc } : p));
                          }}
                          className="bg-transparent font-medium text-foreground w-full border-0 focus:bg-card hover:bg-muted/40 p-1 rounded outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </td>

                      {/* Category selector */}
                      <td className="p-3">
                        <select
                          value={selectedMapping[item.id] || ''}
                          onChange={e => {
                            const newCat = e.target.value;
                            setSelectedMapping(prev => ({ ...prev, [item.id]: newCat }));
                          }}
                          className="bg-muted/60 border border-border/50 text-[11px] font-semibold rounded-lg px-2 py-1 text-foreground transition-all focus:ring-1 focus:ring-primary outline-none cursor-pointer w-full"
                        >
                          <option value="">-- Sem Categoria --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Value / Amount & type toggle */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-bold">
                          
                          {/* Color toggle button for credit/debit */}
                          <button
                            type="button"
                            onClick={() => {
                              const newType = item.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
                              setParsedList(prev => prev.map(p => p.id === item.id ? { ...p, type: newType } : p));
                              // adapt category recommendation
                              const recommended = suggestCategory(item.description, newType);
                              setSelectedMapping(prev => ({ ...prev, [item.id]: recommended }));
                            }}
                            className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-[9px] text-[#fff] font-black",
                              item.type === 'INCOME' ? "bg-emerald-500" : "bg-red-400"
                            )}
                            title={item.type === 'INCOME' ? "Mudar para Despesa (Débito)" : "Mudar para Receita (Crédito)"}
                          >
                            {item.type === 'INCOME' ? '+' : '-'}
                          </button>
                          
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={e => {
                              const newAmount = Math.max(0, parseFloat(e.target.value) || 0);
                              setParsedList(prev => prev.map(p => p.id === item.id ? { ...p, amount: newAmount } : p));
                            }}
                            className={cn(
                              "bg-transparent border-0 text-right focus:bg-card hover:bg-muted/40 p-1 rounded outline-none focus:ring-1 focus:ring-primary/50 w-24",
                              item.type === 'INCOME' ? "text-emerald-400" : "text-foreground"
                            )}
                          />

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Prompt buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setParsedList([]);
                setSelectedItems({});
                setSelectedMapping({});
              }}
              className="px-5 py-3 border border-border hover:bg-muted/20 text-muted-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Fazer outro upload
            </button>
            <button
              onClick={handleImportSubmit}
              className="px-6 py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:scale-[1.01] flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Importar {parsedList.filter(i => selectedItems[i.id]).length} Lançamentos
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
