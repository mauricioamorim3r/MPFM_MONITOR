import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, Settings, Gauge, Droplets, Flame, Calendar, Bell, ChevronRight, ChevronLeft, ChevronDown, Search, Eye, Edit, Plus, AlertCircle, Info, Target, Layers, Waves, Download, Upload, RefreshCw, MoreVertical, Filter, ArrowUpRight, ArrowDownRight, BarChart3, Database, Clipboard, FlaskConical, Calculator, TrendingUp, FileCheck, Save, X, Play, Pause, Check, Beaker, Thermometer, Wind, Zap } from 'lucide-react';

// ============================================================================
// COMPONENTES UI BASE
// ============================================================================

const Badge = ({ variant = 'default', children }) => {
  const styles = {
    default: 'bg-zinc-700 text-zinc-300',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    OK: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    ALERT: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    FAIL: 'bg-red-500/20 text-red-400 border border-red-500/30',
    Dentro: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    Fora: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant] || styles.default}`}>{children}</span>;
};

const Card = ({ children, className = '', title, subtitle, headerRight }) => (
  <div className={`bg-zinc-900/80 border border-zinc-800 rounded-xl ${className}`}>
    {title && (
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
    )}
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, color = 'blue' }) => {
  const colors = { blue: 'text-blue-400 bg-blue-500/10', purple: 'text-purple-400 bg-purple-500/10', amber: 'text-amber-400 bg-amber-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', red: 'text-red-400 bg-red-500/10' };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors[color]} mb-3`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, unit, disabled = false, className = '', size = 'default', error }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs text-zinc-400">{label}</label>}
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-zinc-800 border ${error ? 'border-red-500' : 'border-zinc-700'} rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
      />
      {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{unit}</span>}
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const Select = ({ label, value, onChange, options, className = '', size = 'default' }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs text-zinc-400">{label}</label>}
    <select value={value} onChange={onChange} className={`w-full bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500 ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}>
      {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Button = ({ children, variant = 'primary', size = 'default', onClick, disabled = false, className = '' }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-zinc-800 text-zinc-400',
  };
  const sizes = { sm: 'px-2 py-1 text-xs', default: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-sm' };
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-1.5 rounded-lg font-medium transition ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
        {tab.label}
      </button>
    ))}
  </div>
);

const StepIndicator = ({ steps, currentStep, onStepClick }) => (
  <div className="flex items-center gap-1">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <button onClick={() => onStepClick && onStepClick(i + 1)} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition ${i + 1 === currentStep ? 'bg-blue-600 text-white' : i + 1 < currentStep ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${i + 1 < currentStep ? 'bg-emerald-500 text-white' : i + 1 === currentStep ? 'bg-white text-blue-600' : 'bg-zinc-700 text-zinc-400'}`}>
            {i + 1 < currentStep ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          <span className="text-xs hidden xl:inline">{step}</span>
        </button>
        {i < steps.length - 1 && <div className={`w-4 h-px ${i + 1 < currentStep ? 'bg-emerald-500' : 'bg-zinc-700'}`} />}
      </React.Fragment>
    ))}
  </div>
);

const DataTable = ({ columns, data, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-zinc-700">
          {columns.map((col, i) => (
            <th key={i} className={`py-2 px-2 text-zinc-400 font-medium ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIdx) => (
          <tr key={rowIdx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
            {columns.map((col, colIdx) => (
              <td key={colIdx} className={`py-2 px-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.cellClassName || ''}`}>
                {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ============================================================================
// DADOS INICIAIS DO FORMULÁRIO
// ============================================================================

const initialFormData = {
  // 01 - Registro
  eventId: 'CAL-MPFM_SUB-COM-01-26',
  status: 'Em Andamento',
  resultado: '',
  operador: 'Equinor Brasil Energia Ltda.',
  serviceOrder: '-',
  responsavelCalibracao: 'xxx',
  preenchidoPor: 'Mauricio Amorim',
  dataEmissao: '2026-01-23',
  unidade: 'FPSO Bacalhau',
  baciaCampo: 'Santos / Bacalhau',
  localizacao: 'MEDIDOR SUBSEA - Poço PE-4',
  referenciaMet: 'Separador de Teste - TAG: 20VA121',
  tagMPFM: '18-FT-1506',
  serialNumber: '14-100269',
  fabricante: 'TechnipFMC',
  modelo: 'MPM High-Performance Flowmeter',
  tamanho: '5"',
  razaoBeta: 'B = 0.7 MPM',
  modoMedicao: 'Dual Mode',
  sistema: 'PE-4',
  versaoSoftwareMedidor: 'FW-MPM-BAC-v1.12.3',
  versaoFPM207: 'v2.8.5',
  versaoFCS320: 'v8.4.1 Build 710',
  versaoPVTsim: 'v23.1.0',
  naturezaAtividade: 'Comissionamento - PE-4 - 18-FT-1506',
  idEventoDesvio: '-',
  inicioEstabilizacao: '2026-01-10T00:00',
  inicioTotalizacao: '2025-12-04T00:00',
  fimTotalizacao: '2025-12-04T23:59',
  duracaoEfetiva: '24.0',
  observacoesIniciais: '',
  comentariosGerais: '',

  // 02 - PVT
  pvtReportId: 'SLB - P.1077663_2025BRRD-P004039-J0001_v01',
  dataAmostragem: '2026-01-10',
  pontoAmostragem: 'Separador',
  softwareModelagem: 'PVTsim',
  versaoModelo: 'Aprovado',
  statusAprovacao: 'Aprovado',
  dataAprovacao: '2026-01-10',
  comentariosPVT: 'Os valores utilizados dos parâmetros de PVT são os apresentados no relatório xxx',
  
  // Propriedades de Referência
  densidadeOleo: '773.41',
  densidadeGas: '0.87',
  densidadeAgua: '1.25',
  gor: '216.81',
  bsw: '205.55',
  fatorEncolhimento: '',

  // Composição Molar
  composicao: {
    CO2: { molar: 16.016, mol: 0.020, mw: 44.01 },
    N2: { molar: 28.014, mol: 0.575, mw: 28.01 },
    C1: { molar: 16.043, mol: 62.183, mw: 16.04 },
    C2: { molar: 30.070, mol: 8.069, mw: 30.07 },
    C3: { molar: 44.097, mol: 5.047, mw: 44.10 },
    iC4: { molar: 58.124, mol: 1.069, mw: 58.12 },
    nC4: { molar: 58.124, mol: 1.856, mw: 58.12 },
    iC5: { molar: 72.151, mol: 0.681, mw: 72.15 },
    nC5: { molar: 72.151, mol: 0.788, mw: 72.15 },
    nC6: { molar: 86.178, mol: 1.112, mw: 86.18 },
    C7: { molar: 97.365, mol: 1.138, mw: 97.37 },
    C8: { molar: 111.286, mol: 1.657, mw: 111.29 },
    C9: { molar: 125.253, mol: 1.472, mw: 125.25 },
    'C10+': { molar: 289.640, mol: 14.331, mw: 289.64 },
  },

  // Pseudo componentes
  penelouxGas: '1.000',
  penelouxOil: '1.000',
  mwC7: '97.365',
  mwC8: '111.286',
  mwC9: '125.253',
  mwC10: '289.640',
  densC7: '748.787',
  densC8: '771.408',
  densC9: '788.640',

  // 04 - K-Fatores
  kMin: '0.80',
  kMax: '1.20',
  limiteHC: '10.00',
  limiteTotal: '7.00',
  
  massas: {
    oleo: { mpfm: 332, ref: 242 },
    gas: { mpfm: 2, ref: 75 },
    agua: { mpfm: 0, ref: 0 },
  },

  kFactors: {
    oleo: { k: 0.7276, status: 'Fora' },
    gas: { k: 39.8885, status: 'Fora' },
    agua: { k: 0.0025, status: 'Fora' },
  },
};

const totalizadoresData = [
  { inicio: '04/12/2025 00:00', fim: '04/12/2025 01:00', dt: 1.00, mpfmOleo: 127.18, mpfmGas: 0, mpfmAgua: 0, hc: 127.18, total: 127.21, refOleoM3: 137, density: 773.41, refOleoCalc: 105.96, refOleoPi: 114, refGas: 25.62, refAgua: 0, status: 'OK' },
  { inicio: '04/12/2025 01:00', fim: '04/12/2025 02:00', dt: 1.00, mpfmOleo: 127.10, mpfmGas: 0, mpfmAgua: 0, hc: 127.10, total: 127.21, refOleoM3: 137, density: 773.41, refOleoCalc: 105.96, refOleoPi: 115, refGas: 25.59, refAgua: 0, status: 'OK' },
  { inicio: '04/12/2025 02:00', fim: '04/12/2025 03:00', dt: 1.00, mpfmOleo: 127.09, mpfmGas: 0, mpfmAgua: 0, hc: 127.09, total: 127.20, refOleoM3: 137, density: 773.41, refOleoCalc: 105.96, refOleoPi: 115, refGas: 25.58, refAgua: 0, status: 'OK' },
  { inicio: '04/12/2025 03:00', fim: '04/12/2025 04:00', dt: 1.00, mpfmOleo: 244.32, mpfmGas: 0, mpfmAgua: 0, hc: 244.32, total: 244.54, refOleoM3: 137, density: 773.41, refOleoCalc: 105.96, refOleoPi: 114, refGas: 25.58, refAgua: 0, status: 'OK' },
  { inicio: '04/12/2025 04:00', fim: '04/12/2025 05:00', dt: 1.00, mpfmOleo: 422.27, mpfmGas: 0, mpfmAgua: 0, hc: 422.27, total: 422.65, refOleoM3: 137, density: 773.41, refOleoCalc: 105.96, refOleoPi: 114, refGas: 25.59, refAgua: 0, status: 'OK' },
  { inicio: '04/12/2025 05:00', fim: '04/12/2025 06:00', dt: 1.00, mpfmOleo: 448.77, mpfmGas: 0, mpfmAgua: 0, hc: 448.77, total: 449.10, refOleoM3: 137, density: 773.41, refOleoCalc: 105.96, refOleoPi: 114, refGas: 25.62, refAgua: 0, status: 'OK' },
  { inicio: '04/12/2025 06:00', fim: '04/12/2025 07:00', dt: 1.00, mpfmOleo: 453.24, mpfmGas: 0, mpfmAgua: 0, hc: 453.24, total: 453.64, refOleoM3: 136, density: 773.41, refOleoCalc: 105.18, refOleoPi: 114, refGas: 25.69, refAgua: 0, status: 'OK' },
  { inicio: '04/12/2025 07:00', fim: '04/12/2025 08:00', dt: 1.00, mpfmOleo: 461.07, mpfmGas: 0, mpfmAgua: 0, hc: 461.07, total: 461.46, refOleoM3: 136, density: 773.41, refOleoCalc: 105.18, refOleoPi: 114, refGas: 25.69, refAgua: 0, status: 'OK' },
];

const alarmesData = [
  { dataHora: '2026-01-13 00:00', tag: '18-FT-1506', codigo: 'Gamma', descricao: 'Gamma = 633.22', gravidade: 'Warning', acao: 'Monitorando', parametro: 'Gamma', valor: 633.22, low: 0, high: 0 },
  { dataHora: '', tag: '', codigo: '', descricao: '', gravidade: '', acao: '', parametro: 'dPInlet', valor: '', low: 0, high: 0 },
  { dataHora: '', tag: '', codigo: '', descricao: '', gravidade: '', acao: '', parametro: 'dPOutlet', valor: '', low: 0, high: '' },
  { dataHora: '', tag: '', codigo: '', descricao: '', gravidade: '', acao: '', parametro: 'Pressure', valor: '', low: 0, high: 0 },
  { dataHora: '', tag: '', codigo: '', descricao: '', gravidade: '', acao: '', parametro: 'Temperature', valor: '', low: 0, high: 0 },
  { dataHora: '', tag: '', codigo: '', descricao: '', gravidade: '', acao: '', parametro: '3D Broadband', valor: '', low: 0, high: '' },
  { dataHora: '', tag: '', codigo: '', descricao: '', gravidade: '', acao: '', parametro: 'Software', valor: '', low: 0, high: '' },
  { dataHora: '', tag: '', codigo: '', descricao: '', gravidade: '', acao: '', parametro: 'Communication Port', valor: '', low: 0, high: '' },
];

// ============================================================================
// COMPONENTES DE FORMULÁRIO POR ETAPA
// ============================================================================

const Step01Registro = ({ formData, updateForm }) => (
  <div className="space-y-4">
    {/* Identificação do Responsável */}
    <Card className="p-4">
      <SectionHeader icon={Clipboard} title="Identificação do Responsável e Autoridade" color="blue" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label="ID do Evento/Relatório" value={formData.eventId} onChange={(e) => updateForm('eventId', e.target.value)} />
        <Select label="Status" value={formData.status} onChange={(e) => updateForm('status', e.target.value)} options={[
          { value: 'Em Andamento', label: 'Em Andamento' },
          { value: 'Aguardando PVT', label: 'Aguardando PVT' },
          { value: 'Em Totalização', label: 'Em Totalização' },
          { value: 'Concluída', label: 'Concluída' },
        ]} />
        <Input label="Operador" value={formData.operador} onChange={(e) => updateForm('operador', e.target.value)} />
        <Input label="Resultado" value={formData.resultado} onChange={(e) => updateForm('resultado', e.target.value)} placeholder="Aprovado/Reprovado" />
        <Input label="Ordem de Serviço (S.O.)" value={formData.serviceOrder} onChange={(e) => updateForm('serviceOrder', e.target.value)} />
        <Input label="Responsável Calibração – Nome/Cargo" value={formData.responsavelCalibracao} onChange={(e) => updateForm('responsavelCalibracao', e.target.value)} />
        <Input label="Preenchido por – Nome/Cargo" value={formData.preenchidoPor} onChange={(e) => updateForm('preenchidoPor', e.target.value)} />
        <Input label="Data de Emissão" type="date" value={formData.dataEmissao} onChange={(e) => updateForm('dataEmissao', e.target.value)} />
      </div>
    </Card>

    {/* Dados da Instalação */}
    <Card className="p-4">
      <SectionHeader icon={Database} title="Dados da Instalação" color="purple" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label="Unidade / FPSO" value={formData.unidade} onChange={(e) => updateForm('unidade', e.target.value)} />
        <Input label="Bacia / Campo" value={formData.baciaCampo} onChange={(e) => updateForm('baciaCampo', e.target.value)} />
        <Input label="Localização na Planta" value={formData.localizacao} onChange={(e) => updateForm('localizacao', e.target.value)} className="col-span-2" />
        <Input label="Referência Metrológica (Autorizada)" value={formData.referenciaMet} onChange={(e) => updateForm('referenciaMet', e.target.value)} className="col-span-2" />
      </div>
    </Card>

    {/* Identificação do Instrumento */}
    <Card className="p-4">
      <SectionHeader icon={Gauge} title="Identificação do Instrumento (MPFM)" color="amber" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label="TAG do MPFM" value={formData.tagMPFM} onChange={(e) => updateForm('tagMPFM', e.target.value)} />
        <Input label="Número de Série (S/N)" value={formData.serialNumber} onChange={(e) => updateForm('serialNumber', e.target.value)} />
        <Input label="Fabricante / Modelo" value={`${formData.fabricante} / ${formData.modelo}`} onChange={(e) => updateForm('fabricante', e.target.value)} className="col-span-2" />
        <Input label="Tamanho / Razão Beta" value={`${formData.tamanho} ${formData.razaoBeta}`} onChange={(e) => updateForm('tamanho', e.target.value)} />
        <Input label="Modo de Medição Ativo" value={formData.modoMedicao} onChange={(e) => updateForm('modoMedicao', e.target.value)} />
        <Input label="Sistema" value={formData.sistema} onChange={(e) => updateForm('sistema', e.target.value)} />
      </div>
    </Card>

    {/* Configuração de Software */}
    <Card className="p-4">
      <SectionHeader icon={Settings} title="Configuração de Software e Integridade" color="emerald" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label="Versão de Software (Medidor)" value={formData.versaoSoftwareMedidor} onChange={(e) => updateForm('versaoSoftwareMedidor', e.target.value)} />
        <Input label="Versão do Computador de Vazão FPM207" value={formData.versaoFPM207} onChange={(e) => updateForm('versaoFPM207', e.target.value)} />
        <Input label="Versão do Software FCS320" value={formData.versaoFCS320} onChange={(e) => updateForm('versaoFCS320', e.target.value)} />
        <Input label="Software de Simulação (Calsep PVTsim)" value={formData.versaoPVTsim} onChange={(e) => updateForm('versaoPVTsim', e.target.value)} />
      </div>
    </Card>

    {/* Escopo e Período */}
    <Card className="p-4">
      <SectionHeader icon={Calendar} title="Escopo e Período do Teste de Calibração" color="red" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label="Natureza da Atividade" value={formData.naturezaAtividade} onChange={(e) => updateForm('naturezaAtividade', e.target.value)} className="col-span-2" />
        <Input label="ID do Evento de Desvio (se aplicável)" value={formData.idEventoDesvio} onChange={(e) => updateForm('idEventoDesvio', e.target.value)} />
        <div></div>
        <Input label="Início da Estabilização" type="datetime-local" value={formData.inicioEstabilizacao} onChange={(e) => updateForm('inicioEstabilizacao', e.target.value)} />
        <Input label="Início da Totalização (24h)" type="datetime-local" value={formData.inicioTotalizacao} onChange={(e) => updateForm('inicioTotalizacao', e.target.value)} />
        <Input label="Fim da Totalização" type="datetime-local" value={formData.fimTotalizacao} onChange={(e) => updateForm('fimTotalizacao', e.target.value)} />
        <Input label="Duração Total Efetiva (h)" value={formData.duracaoEfetiva} onChange={(e) => updateForm('duracaoEfetiva', e.target.value)} unit="h" disabled />
        <Input label="Observações Iniciais" value={formData.observacoesIniciais} onChange={(e) => updateForm('observacoesIniciais', e.target.value)} className="col-span-2" />
      </div>
    </Card>

    {/* Comentários Gerais */}
    <Card className="p-4">
      <SectionHeader icon={FileText} title="Comentários Gerais" />
      <textarea 
        value={formData.comentariosGerais} 
        onChange={(e) => updateForm('comentariosGerais', e.target.value)}
        className="w-full h-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        placeholder="Observações adicionais sobre o evento de calibração..."
      />
    </Card>
  </div>
);

const Step02PVT = ({ formData, updateForm }) => {
  const componentes = Object.entries(formData.composicao);
  const somaMol = componentes.reduce((acc, [_, v]) => acc + v.mol, 0);
  
  return (
    <div className="space-y-4">
      {/* Identificação do Relatório PVT */}
      <Card className="p-4">
        <SectionHeader icon={FlaskConical} title="Identificação do Relatório PVT / Amostragem" color="purple" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input label="ID do Relatório Laboratorial" value={formData.pvtReportId} onChange={(e) => updateForm('pvtReportId', e.target.value)} className="col-span-2" />
          <Input label="Data da Amostragem" type="date" value={formData.dataAmostragem} onChange={(e) => updateForm('dataAmostragem', e.target.value)} />
          <Input label="Ponto de Amostragem" value={formData.pontoAmostragem} onChange={(e) => updateForm('pontoAmostragem', e.target.value)} />
          <Input label="Software de Modelagem (PVTSim/Multiflash/etc.)" value={formData.softwareModelagem} onChange={(e) => updateForm('softwareModelagem', e.target.value)} />
          <Input label="Versão/Arquivo do Modelo (ex.: .mfl/.fdb)" value={formData.versaoModelo} onChange={(e) => updateForm('versaoModelo', e.target.value)} />
          <Select label="Status de Aprovação Técnica (PVT GROUP)" value={formData.statusAprovacao} onChange={(e) => updateForm('statusAprovacao', e.target.value)} options={[
            { value: 'Pendente', label: 'Pendente' },
            { value: 'Em Análise', label: 'Em Análise' },
            { value: 'Aprovado', label: 'Aprovado' },
            { value: 'Reprovado', label: 'Reprovado' },
          ]} />
          <Input label="Data de Aprovação" type="date" value={formData.dataAprovacao} onChange={(e) => updateForm('dataAprovacao', e.target.value)} />
        </div>
        <div className="mt-3">
          <Input label="Comentários" value={formData.comentariosPVT} onChange={(e) => updateForm('comentariosPVT', e.target.value)} />
        </div>
      </Card>

      {/* Propriedades de Referência */}
      <Card className="p-4">
        <SectionHeader icon={Beaker} title="Propriedades de Referência (@std) e entradas simplificadas" color="blue" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Input label="Densidade Óleo" value={formData.densidadeOleo} onChange={(e) => updateForm('densidadeOleo', e.target.value)} unit="kg/m³" />
          <Input label="Densidade Gás" value={formData.densidadeGas} onChange={(e) => updateForm('densidadeGas', e.target.value)} unit="kg/m³" />
          <Input label="Densidade Água" value={formData.densidadeAgua} onChange={(e) => updateForm('densidadeAgua', e.target.value)} unit="kg/m³" />
          <Input label="GOR" value={formData.gor} onChange={(e) => updateForm('gor', e.target.value)} unit="Sm³/Sm³" />
          <Input label="BSW" value={formData.bsw} onChange={(e) => updateForm('bsw', e.target.value)} unit="%" />
          <Input label="Fator de encolhimento do óleo" value={formData.fatorEncolhimento} onChange={(e) => updateForm('fatorEncolhimento', e.target.value)} className="col-span-2" />
        </div>
      </Card>

      {/* Composição Molar */}
      <Card className="p-4">
        <SectionHeader icon={Database} title="Composição molar (mol%) – entrada e checagem de normalização" color="amber" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="py-2 px-2 text-left text-zinc-400">Componente</th>
                <th className="py-2 px-2 text-right text-zinc-400">Massa Molar (kg/kmol)</th>
                <th className="py-2 px-2 text-right text-zinc-400">mol% (entrada)</th>
                <th className="py-2 px-2 text-right text-zinc-400">mol% (normalizado)</th>
                <th className="py-2 px-2 text-right text-zinc-400">kmol/h (opcional)</th>
              </tr>
            </thead>
            <tbody>
              {componentes.map(([nome, dados]) => (
                <tr key={nome} className="border-b border-zinc-800/50">
                  <td className="py-1.5 px-2 text-zinc-200">{nome}</td>
                  <td className="py-1.5 px-2 text-right text-zinc-400">{dados.mw.toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right">
                    <input type="number" value={dados.mol} className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-blue-400 text-right" />
                  </td>
                  <td className="py-1.5 px-2 text-right text-emerald-400">{(dados.mol / somaMol * 100).toFixed(3)}</td>
                  <td className="py-1.5 px-2 text-right">
                    <input type="number" className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400 text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-800/50">
              <tr>
                <td className="py-2 px-2 text-zinc-200 font-medium">Soma mol% (entrada)</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-blue-400 font-medium">{somaMol.toFixed(3)}</td>
                <td className="py-2 px-2 text-right text-emerald-400 font-medium">100.000</td>
                <td className="py-2 px-2"></td>
              </tr>
              <tr>
                <td className="py-2 px-2 text-zinc-200 font-medium">MW mistura (kg/kmol)</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-amber-400 font-medium" colSpan={3}>
                  {(componentes.reduce((acc, [_, d]) => acc + d.mol * d.mw, 0) / somaMol).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Pseudo Componentes e Fatores Peneloux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionHeader icon={Layers} title="Well Composition Pseudo components" color="emerald" />
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Input label="Peneloux correction factor gas" value={formData.penelouxGas} onChange={(e) => updateForm('penelouxGas', e.target.value)} size="sm" />
              <Input label="Peneloux correction factor oil" value={formData.penelouxOil} onChange={(e) => updateForm('penelouxOil', e.target.value)} size="sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="PVT heptane C7 mole weight" value={formData.mwC7} unit="g/mol" size="sm" />
              <Input label="PVT heptane C7 ref. dens." value={formData.densC7} unit="kg/m³" size="sm" />
              <Input label="PVT octane C8 mole weight" value={formData.mwC8} unit="g/mol" size="sm" />
              <Input label="PVT octane C8 ref. dens." value={formData.densC8} unit="kg/m³" size="sm" />
              <Input label="PVT nonane C9 mole weight" value={formData.mwC9} unit="g/mol" size="sm" />
              <Input label="PVT nonane C9 ref. dens." value={formData.densC9} unit="kg/m³" size="sm" />
              <Input label="PVT C10+ mole weight" value={formData.mwC10} unit="g/mol" size="sm" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={CheckCircle} title="Controle de aplicação do novo PVT" color="emerald" />
          <p className="text-xs text-zinc-500 mb-3">Evidência operacional</p>
          <div className="space-y-2">
            {['PVT carregada no FCS320', 'PVT carregada no FPM207', 'Gamma reiniciado', 'Pressão verificada', 'Temperatura verificada'].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                <span className="text-xs text-zinc-300">{item}</span>
                <Select value="OK" options={[{ value: 'OK', label: 'OK' }, { value: 'NOK', label: 'NOK' }, { value: '-', label: '-' }]} size="sm" className="w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Step03Totalizadores = ({ formData }) => (
  <div className="space-y-4">
    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <p className="text-xs text-blue-300"><Info className="w-3 h-3 inline mr-1" />Preencha Data/Hora e leituras de totalizador nos pontos de amostragem. As deltas e totais de 24h são calculados automaticamente.</p>
    </div>

    <Card className="p-4">
      <SectionHeader icon={Database} title="03 – Totalizadores / Horário (mínimo 24h) – cálculo automático de massas por período" color="blue" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-1 text-left text-zinc-400">Data/Hora Início</th>
              <th className="py-2 px-1 text-left text-zinc-400">Data/Hora Fim</th>
              <th className="py-2 px-1 text-center text-zinc-400">Δt (h)</th>
              <th className="py-2 px-1 text-right text-blue-400 bg-blue-900/10">MPFM Óleo Corr (t)</th>
              <th className="py-2 px-1 text-right text-blue-400 bg-blue-900/10">MPFM Gás Corr (t)</th>
              <th className="py-2 px-1 text-right text-blue-400 bg-blue-900/10">MPFM Água Corr (t)</th>
              <th className="py-2 px-1 text-right text-blue-400 bg-blue-900/10">HC (t)</th>
              <th className="py-2 px-1 text-right text-blue-400 bg-blue-900/10">Total (t)</th>
              <th className="py-2 px-1 text-right text-emerald-400 bg-emerald-900/10">REF Óleo (m³)</th>
              <th className="py-2 px-1 text-right text-emerald-400 bg-emerald-900/10">Density</th>
              <th className="py-2 px-1 text-right text-emerald-400 bg-emerald-900/10">REF Óleo CALC</th>
              <th className="py-2 px-1 text-right text-emerald-400 bg-emerald-900/10">REF Óleo PI</th>
              <th className="py-2 px-1 text-right text-emerald-400 bg-emerald-900/10">REF Gás</th>
              <th className="py-2 px-1 text-right text-emerald-400 bg-emerald-900/10">REF Água</th>
              <th className="py-2 px-1 text-center text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {totalizadoresData.map((row, idx) => (
              <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                <td className="py-1.5 px-1 text-zinc-300">{row.inicio}</td>
                <td className="py-1.5 px-1 text-zinc-300">{row.fim}</td>
                <td className="py-1.5 px-1 text-center text-zinc-400">{row.dt.toFixed(2)}</td>
                <td className="py-1.5 px-1 text-right text-blue-400 bg-blue-900/5">{row.mpfmOleo.toFixed(2)}</td>
                <td className="py-1.5 px-1 text-right text-blue-400 bg-blue-900/5">{row.mpfmGas}</td>
                <td className="py-1.5 px-1 text-right text-blue-400 bg-blue-900/5">{row.mpfmAgua}</td>
                <td className="py-1.5 px-1 text-right text-blue-400 font-medium bg-blue-900/5">{row.hc.toFixed(2)}</td>
                <td className="py-1.5 px-1 text-right text-blue-400 font-medium bg-blue-900/5">{row.total.toFixed(2)}</td>
                <td className="py-1.5 px-1 text-right text-emerald-400 bg-emerald-900/5">{row.refOleoM3}</td>
                <td className="py-1.5 px-1 text-right text-zinc-400 bg-emerald-900/5">{row.density}</td>
                <td className="py-1.5 px-1 text-right text-emerald-400 bg-emerald-900/5">{row.refOleoCalc.toFixed(2)}</td>
                <td className="py-1.5 px-1 text-right text-emerald-400 bg-emerald-900/5">{row.refOleoPi}</td>
                <td className="py-1.5 px-1 text-right text-emerald-400 bg-emerald-900/5">{row.refGas.toFixed(2)}</td>
                <td className="py-1.5 px-1 text-right text-emerald-400 bg-emerald-900/5">{row.refAgua}</td>
                <td className="py-1.5 px-1 text-center"><Badge variant={row.status}>{row.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* Totais 24h */}
    <Card className="p-4">
      <SectionHeader icon={Calculator} title="Total (24h) – somatório das deltas (exceto primeira linha)" color="amber" />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500">Duração total (h)</p>
          <p className="text-lg font-bold text-white">24.0</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-xs text-zinc-500">MPFM Massa Óleo (kg)</p>
          <p className="text-lg font-bold text-blue-400">332.27</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-xs text-zinc-500">MPFM Gás (kg)</p>
          <p className="text-lg font-bold text-blue-400">1.88</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-xs text-zinc-500">MPFM Massa HC (kg)</p>
          <p className="text-lg font-bold text-blue-400">334.15</p>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <p className="text-xs text-zinc-500">REF Massa Óleo (kg)</p>
          <p className="text-lg font-bold text-emerald-400">241.75</p>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <p className="text-xs text-zinc-500">REF Gás (kg)</p>
          <p className="text-lg font-bold text-emerald-400">75.17</p>
        </div>
      </div>
    </Card>

    <div className="flex gap-2">
      <Button variant="secondary"><Upload className="w-4 h-4" />Importar do PI System</Button>
      <Button variant="secondary"><Plus className="w-4 h-4" />Adicionar Linha</Button>
      <Button variant="secondary"><Download className="w-4 h-4" />Exportar CSV</Button>
    </div>
  </div>
);

const Step04KFactors = ({ formData, updateForm }) => (
  <div className="space-y-4">
    {/* Parâmetros de Aceitação */}
    <Card className="p-4">
      <SectionHeader icon={Settings} title="Parâmetros de aceitação (ajustáveis)" color="amber" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label="K mínimo" type="number" value={formData.kMin} onChange={(e) => updateForm('kMin', e.target.value)} />
        <Input label="K máximo" type="number" value={formData.kMax} onChange={(e) => updateForm('kMax', e.target.value)} />
        <Input label="Limite desvio Massa HC (±)" type="number" value={formData.limiteHC} onChange={(e) => updateForm('limiteHC', e.target.value)} unit="%" />
        <Input label="Limite desvio Massa Total (±)" type="number" value={formData.limiteTotal} onChange={(e) => updateForm('limiteTotal', e.target.value)} unit="%" />
      </div>
    </Card>

    {/* Massas Totalizadas */}
    <Card className="p-4">
      <SectionHeader icon={Database} title="Massas totalizadas (24h) – referência vs MPFM (não corrigidas)" color="blue" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-3 text-left text-zinc-400">Fase</th>
              <th className="py-2 px-3 text-right text-blue-400">MPFM (kg)</th>
              <th className="py-2 px-3 text-right text-emerald-400">Referência (kg)</th>
              <th className="py-2 px-3 text-right text-zinc-400">Diferença (kg)</th>
              <th className="py-2 px-3 text-right text-zinc-400">Desvio (%)</th>
            </tr>
          </thead>
          <tbody>
            {[
              { fase: 'Óleo', mpfm: 332, ref: 242, diff: 90, desvio: 37.2 },
              { fase: 'Gás', mpfm: 2, ref: 75, diff: -73, desvio: -97.3 },
              { fase: 'Água', mpfm: 0, ref: 0, diff: 0, desvio: 0 },
              { fase: 'HC (Óleo+Gás)', mpfm: 334, ref: 317, diff: 17, desvio: 5.4, isTotal: true },
              { fase: 'Total', mpfm: 335, ref: 317, diff: 18, desvio: 5.7, isTotal: true },
            ].map((row, i) => (
              <tr key={i} className={`border-b border-zinc-800/50 ${row.isTotal ? 'bg-zinc-800/30' : ''}`}>
                <td className={`py-2 px-3 text-zinc-200 ${row.isTotal ? 'font-medium' : ''}`}>{row.fase}</td>
                <td className="py-2 px-3 text-right text-blue-400">{row.mpfm}</td>
                <td className="py-2 px-3 text-right text-emerald-400">{row.ref}</td>
                <td className="py-2 px-3 text-right text-zinc-300">{row.diff}</td>
                <td className={`py-2 px-3 text-right ${Math.abs(row.desvio) > 10 ? 'text-red-400' : 'text-zinc-300'}`}>{row.desvio.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* K-Factors Calculados */}
    <Card className="p-4">
      <SectionHeader icon={Calculator} title="Cálculo dos K-Factors (razão Referência / MPFM)" color="purple" />
      <div className="grid grid-cols-3 gap-4">
        {[
          { fase: 'K-Oil', k: 0.7276, status: 'Fora' },
          { fase: 'K-Gas', k: 39.8885, status: 'Fora' },
          { fase: 'K-Água', k: 0.0025, status: 'Fora' },
        ].map((item, i) => (
          <div key={i} className={`p-4 rounded-lg ${item.status === 'Fora' ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-300">{item.fase}</span>
              <Badge variant={item.status}>{item.status}</Badge>
            </div>
            <p className={`text-2xl font-bold ${item.status === 'Fora' ? 'text-red-400' : 'text-emerald-400'}`}>{item.k.toFixed(4)}</p>
            <p className="text-xs text-zinc-500 mt-1">Range: 0.80 - 1.20</p>
          </div>
        ))}
      </div>
    </Card>

    {/* Massas Corrigidas */}
    <Card className="p-4">
      <SectionHeader icon={TrendingUp} title="Massas corrigidas (aplicação de K) e desvios pós-correção" color="emerald" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-2 text-left text-zinc-400">Fase</th>
              <th className="py-2 px-2 text-right text-zinc-400">MPFM bruto (kg)</th>
              <th className="py-2 px-2 text-right text-purple-400">K aplicado</th>
              <th className="py-2 px-2 text-right text-blue-400">MPFM corrigido (kg)</th>
              <th className="py-2 px-2 text-right text-emerald-400">Referência (kg)</th>
              <th className="py-2 px-2 text-right text-zinc-400">Desvio pós (%)</th>
              <th className="py-2 px-2 text-center text-zinc-400">Critério</th>
              <th className="py-2 px-2 text-center text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { fase: 'Óleo', bruto: 332, k: 0.7276, corrigido: 242, ref: 242, desvio: 0, criterio: '±10.00%' },
              { fase: 'Gás', bruto: 2, k: 39.8885, corrigido: 75, ref: 75, desvio: 0, criterio: '±10.00%' },
              { fase: 'Água', bruto: 0, k: 0.0025, corrigido: 0, ref: 0, desvio: 0, criterio: '±7.00%' },
              { fase: 'HC', bruto: 334, k: '(K_oil/K_gas)', corrigido: 317, ref: 317, desvio: 0, criterio: '±10.00%' },
              { fase: 'Total', bruto: 335, k: '(K_oil/K_gas/K_water)', corrigido: 317, ref: 317, desvio: 0, criterio: '±7.00%' },
            ].map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-2 px-2 text-zinc-200">{row.fase}</td>
                <td className="py-2 px-2 text-right text-zinc-300">{row.bruto}</td>
                <td className="py-2 px-2 text-right text-purple-400 font-mono">{typeof row.k === 'number' ? row.k.toFixed(4) : row.k}</td>
                <td className="py-2 px-2 text-right text-blue-400">{row.corrigido}</td>
                <td className="py-2 px-2 text-right text-emerald-400">{row.ref}</td>
                <td className="py-2 px-2 text-right text-zinc-300">{row.desvio.toFixed(2)}%</td>
                <td className="py-2 px-2 text-center text-zinc-400">{row.criterio}</td>
                <td className="py-2 px-2 text-center"><Badge variant="OK">OK</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* Validação FCS320 */}
    <Card className="p-4">
      <SectionHeader icon={CheckCircle} title="Validação opcional contra o FCS320 (cole valores oficiais para conferência)" color="blue" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-3 text-left text-zinc-400">Fase</th>
              <th className="py-2 px-3 text-right text-zinc-400">Esperado (MPFM bruto × K) (kg)</th>
              <th className="py-2 px-3 text-right text-zinc-400">FCS320 (kg) – entrada</th>
              <th className="py-2 px-3 text-right text-zinc-400">Diferença (kg)</th>
              <th className="py-2 px-3 text-center text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {['Óleo', 'Gás', 'Água'].map((fase, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-2 px-3 text-zinc-200">{fase}</td>
                <td className="py-2 px-3 text-right text-emerald-400">{fase === 'Óleo' ? 242 : fase === 'Gás' ? 75 : 0}</td>
                <td className="py-2 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-2 px-3 text-right text-zinc-400">-</td>
                <td className="py-2 px-3 text-center">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

const Step05Balanco = ({ formData }) => (
  <div className="space-y-4">
    {/* Balanço HC Subsea vs Topside */}
    <Card className="p-4">
      <SectionHeader icon={Target} title="Balanço de Massa de Hidrocarbonetos – Subsea vs Topside (com desconto de Gás Lift)" color="blue" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-3 text-left text-zinc-400">Fonte</th>
              <th className="py-2 px-3 text-right text-zinc-400">Massa Óleo (t)</th>
              <th className="py-2 px-3 text-right text-zinc-400">Massa Gás (t)</th>
              <th className="py-2 px-3 text-right text-zinc-400">Massa HC (t)</th>
              <th className="py-2 px-3 text-left text-zinc-400">Observações</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-1.5 px-3"><input className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-3"><input className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
              </tr>
            ))}
            <tr className="bg-zinc-800/50">
              <td className="py-2 px-3 text-zinc-200 font-medium">Total Subsea HC</td>
              <td className="py-2 px-3 text-right text-blue-400 font-medium">-</td>
              <td className="py-2 px-3 text-right text-blue-400 font-medium">-</td>
              <td className="py-2 px-3 text-right text-blue-400 font-medium">-</td>
              <td className="py-2 px-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    {/* Topside e Gás Lift */}
    <Card className="p-4">
      <SectionHeader icon={Flame} title="Topside (MPFM) e Gás Lift" color="purple" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Input label="MPFM Topside – Massa Óleo (t)" type="number" />
        <Input label="MPFM Topside – Massa Gás (t)" type="number" />
        <Input label="Gás Lift – Massa Gás (t)" type="number" />
        <div></div>
        <Input label="HC Topside (t)" type="number" disabled className="bg-zinc-800/50" />
        <Input label="HC Topside Líquido (t) = HC - Gás Lift" type="number" disabled className="bg-zinc-800/50" />
        <Input label="Desvio (%) = (Subsea/TopsideLiq - 1)" type="number" disabled className="bg-zinc-800/50" />
        <div className="flex items-end">
          <div className="w-full p-2 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500">Status (±10%)</p>
            <Badge variant="OK">Dentro do limite</Badge>
          </div>
        </div>
      </div>
    </Card>

    {/* Checagens de Envelope */}
    <Card className="p-4">
      <SectionHeader icon={CheckCircle} title="Checagens de Envelope / Integridade (entradas + status)" color="emerald" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-3 text-left text-zinc-400">Item de controle</th>
              <th className="py-2 px-3 text-right text-zinc-400">Valor observado</th>
              <th className="py-2 px-3 text-right text-zinc-400">Limite</th>
              <th className="py-2 px-3 text-center text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {['GVF', 'Pressão', 'Temperatura', 'Vazão', 'BSW'].map((item, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-2 px-3 text-zinc-200">{item}</td>
                <td className="py-2 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-2 px-3"><input className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-2 px-3 text-center"><Badge variant="OK">OK</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* Mistura com Gás Lift */}
    <Card className="p-4">
      <SectionHeader icon={Wind} title="Mistura de composição (LivePVT) com Gás Lift – cálculo por conservação de moles" color="amber" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label="Massa Gás Lift (kg/h)" type="number" />
        <Input label="Massa Gás Produção (kg/h)" type="number" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-2 text-left text-zinc-400">Componente</th>
              <th className="py-2 px-2 text-right text-zinc-400">MW (kg/kmol)</th>
              <th className="py-2 px-2 text-right text-zinc-400">mol% GL</th>
              <th className="py-2 px-2 text-right text-zinc-400">mol% Produção</th>
              <th className="py-2 px-2 text-right text-emerald-400">mol% Misturado</th>
            </tr>
          </thead>
          <tbody>
            {['CO2', 'N2', 'C1', 'C2', 'C3', 'iC4', 'nC4', 'iC5', 'nC5', 'C6+'].map((comp, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-1.5 px-2 text-zinc-200">{comp}</td>
                <td className="py-1.5 px-2"><input type="number" className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2 text-right text-emerald-400">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* Água Condensada */}
    <Card className="p-4">
      <SectionHeader icon={Droplets} title="Cálculo de Água Condensada (Wet Gas) – opcional" color="blue" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-3 text-left text-zinc-400">Condição</th>
              <th className="py-2 px-3 text-right text-zinc-400">Pressão (barg)</th>
              <th className="py-2 px-3 text-right text-zinc-400">Temp (°C)</th>
              <th className="py-2 px-3 text-right text-zinc-400">Massa Vapor (kg/h)</th>
            </tr>
          </thead>
          <tbody>
            {['Condição 1', 'Condição 2', 'Condição 3'].map((cond, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-2 px-3 text-zinc-200">{cond}</td>
                <td className="py-2 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-2 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-2 px-3"><input type="number" className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

const Step06PosMonitoramento = () => (
  <div className="space-y-4">
    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
      <p className="text-xs text-purple-300"><Info className="w-3 h-3 inline mr-1" />Registre por período (ex.: diário) as massas totalizadas e o efeito dos novos K-factors. Útil para evidência pós-calibração.</p>
    </div>

    <Card className="p-4">
      <SectionHeader icon={Eye} title="06 – Monitoramento pós-aplicação de novos fatores (tendência, alarmes e evidências)" color="purple" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-2 text-left text-zinc-400">Data</th>
              <th className="py-2 px-2 text-left text-zinc-400">Início (dt)</th>
              <th className="py-2 px-2 text-left text-zinc-400">Fim (dt)</th>
              <th className="py-2 px-2 text-center text-zinc-400">Duração (h)</th>
              <th className="py-2 px-2 text-right text-zinc-400">MPFM Óleo (kg)</th>
              <th className="py-2 px-2 text-right text-zinc-400">MPFM Gás (kg)</th>
              <th className="py-2 px-2 text-right text-zinc-400">MPFM Água (kg)</th>
              <th className="py-2 px-2 text-right text-blue-400">MPFM Corr. Óleo</th>
              <th className="py-2 px-2 text-right text-blue-400">MPFM Corr. Gás</th>
              <th className="py-2 px-2 text-right text-blue-400">MPFM Corr. Água</th>
              <th className="py-2 px-2 text-right text-blue-400">MPFM Corr. Total</th>
              <th className="py-2 px-2 text-right text-emerald-400">REF Total (opcional)</th>
              <th className="py-2 px-2 text-center text-zinc-400">Desvio Total (%)</th>
              <th className="py-2 px-2 text-left text-zinc-400">Alarmes/ações</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-1.5 px-2"><input type="date" className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-2"><input type="datetime-local" className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-2"><input type="datetime-local" className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-14 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-center" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2"><input type="number" className="w-16 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-right" /></td>
                <td className="py-1.5 px-2 text-center text-zinc-400">-</td>
                <td className="py-1.5 px-2"><input className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" placeholder="Nenhum" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm"><Plus className="w-3 h-3" />Adicionar Linha</Button>
      </div>
    </Card>
  </div>
);

const Step07Alarmes = () => (
  <div className="space-y-4">
    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p className="text-xs text-red-300"><AlertTriangle className="w-3 h-3 inline mr-1" />Use este log para rastreabilidade: alarmes críticos devem estar inativos no início do teste e investigados quando ocorrerem.</p>
    </div>

    <Card className="p-4">
      <SectionHeader icon={Bell} title="07 – Registro de Alarmes / Eventos (HMI/MPM/FCS320)" color="red" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-2 text-left text-zinc-400">Data/Hora</th>
              <th className="py-2 px-2 text-left text-zinc-400">TAG do Equipamento</th>
              <th className="py-2 px-2 text-left text-zinc-400">Código do Alarme</th>
              <th className="py-2 px-2 text-left text-zinc-400">Descrição do Evento</th>
              <th className="py-2 px-2 text-center text-zinc-400">Gravidade</th>
              <th className="py-2 px-2 text-left text-zinc-400">Ação Tomada / Evidência</th>
            </tr>
          </thead>
          <tbody>
            {alarmesData.slice(0, 1).map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/50 bg-amber-500/5">
                <td className="py-2 px-2 text-zinc-300">{row.dataHora}</td>
                <td className="py-2 px-2 text-blue-400">{row.tag}</td>
                <td className="py-2 px-2 text-zinc-300">{row.codigo}</td>
                <td className="py-2 px-2 text-zinc-300">{row.descricao}</td>
                <td className="py-2 px-2 text-center"><Badge variant="warning">{row.gravidade}</Badge></td>
                <td className="py-2 px-2 text-zinc-400">{row.acao}</td>
              </tr>
            ))}
            {[...Array(8)].map((_, i) => (
              <tr key={i + 1} className="border-b border-zinc-800/50">
                <td className="py-1.5 px-2"><input type="datetime-local" className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-2"><input className="w-24 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-2"><input className="w-24 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-2"><input className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                <td className="py-1.5 px-2">
                  <select className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white">
                    <option>-</option><option>Info</option><option>Warning</option><option>Critical</option>
                  </select>
                </td>
                <td className="py-1.5 px-2"><input className="w-full px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* Tabela de Parâmetros */}
    <Card className="p-4">
      <SectionHeader icon={Gauge} title="Parâmetros Monitorados" color="blue" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="py-2 px-3 text-left text-zinc-400">Parâmetro</th>
              <th className="py-2 px-3 text-right text-zinc-400">Valor</th>
              <th className="py-2 px-3 text-right text-zinc-400">Low</th>
              <th className="py-2 px-3 text-right text-zinc-400">High</th>
            </tr>
          </thead>
          <tbody>
            {alarmesData.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-2 px-3 text-zinc-200">{row.parametro}</td>
                <td className="py-2 px-3 text-right text-blue-400">{row.valor || '-'}</td>
                <td className="py-2 px-3 text-right text-zinc-400">{row.low}</td>
                <td className="py-2 px-3 text-right text-zinc-400">{row.high || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

// ============================================================================
// APP PRINCIPAL
// ============================================================================

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);

  const steps = ['Registro', 'PVT', 'Totalizadores', 'K-Fatores', 'Balanços', 'Pós-Monit.', 'Alarmes'];

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step01Registro formData={formData} updateForm={updateForm} />;
      case 2: return <Step02PVT formData={formData} updateForm={updateForm} />;
      case 3: return <Step03Totalizadores formData={formData} />;
      case 4: return <Step04KFactors formData={formData} updateForm={updateForm} />;
      case 5: return <Step05Balanco formData={formData} />;
      case 6: return <Step06PosMonitoramento />;
      case 7: return <Step07Alarmes />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">MPFM Calibração - Workflow</h1>
              <p className="text-xs text-zinc-500">{formData.eventId} | {formData.tagMPFM} - {formData.naturezaAtividade}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">{formData.status}</Badge>
            <Button variant="secondary" size="sm"><Save className="w-4 h-4" />Salvar</Button>
            <Button variant="secondary" size="sm"><Download className="w-4 h-4" />Exportar</Button>
          </div>
        </div>
      </header>

      {/* Step Navigator */}
      <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-3 overflow-x-auto">
        <StepIndicator steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      {/* Content */}
      <main className="p-4 max-w-7xl mx-auto">
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1}>
            <ChevronLeft className="w-4 h-4" />Anterior
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary"><FileText className="w-4 h-4" />Gerar Relatório</Button>
            {currentStep < 7 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>Próximo<ChevronRight className="w-4 h-4" /></Button>
            ) : (
              <Button variant="success"><Check className="w-4 h-4" />Concluir Avaliação</Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
