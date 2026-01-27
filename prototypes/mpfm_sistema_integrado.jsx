import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, Settings, Gauge, Droplets, Flame, Calendar, Bell, ChevronRight, ChevronLeft, ChevronDown, Search, Eye, Edit, Plus, AlertCircle, Info, Target, Layers, Waves, Download, Upload, RefreshCw, MoreVertical, Filter, ArrowUpRight, ArrowDownRight, BarChart3, Database, Clipboard, FlaskConical, Calculator, TrendingUp, FileCheck, Save, X, Play, Pause, Check, Beaker, Thermometer, Wind, Zap, Home, List, FileSpreadsheet, LayoutDashboard, Menu, User, LogOut, HelpCircle, Trash2, Copy, ExternalLink, Printer } from 'lucide-react';

// ============================================================================
// COMPONENTES UI BASE
// ============================================================================

const Badge = ({ variant = 'default', children, size = 'default' }) => {
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
    active: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    inactive: 'bg-zinc-600/20 text-zinc-400 border border-zinc-500/30',
    TOPSIDE: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    SUBSEA: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };
  const sizes = { sm: 'px-1.5 py-0.5 text-[10px]', default: 'px-2 py-0.5 text-xs' };
  return <span className={`rounded-full font-medium ${styles[variant] || styles.default} ${sizes[size]}`}>{children}</span>;
};

const Card = ({ children, className = '', title, subtitle, headerRight, noPadding }) => (
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
    <div className={noPadding ? '' : 'p-4'}>{children}</div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, color = 'blue', action }) => {
  const colors = { blue: 'text-blue-400 bg-blue-500/10', purple: 'text-purple-400 bg-purple-500/10', amber: 'text-amber-400 bg-amber-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', red: 'text-red-400 bg-red-500/10' };
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${colors[color]} mb-3`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {action}
    </div>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, unit, disabled = false, className = '', size = 'default', error, readOnly }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs text-zinc-400">{label}</label>}
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full bg-zinc-800 border ${error ? 'border-red-500' : 'border-zinc-700'} rounded text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 ${disabled || readOnly ? 'opacity-60 cursor-not-allowed' : ''} ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} ${unit ? 'pr-12' : ''}`}
      />
      {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{unit}</span>}
    </div>
  </div>
);

const Select = ({ label, value, onChange, options, className = '', size = 'default', disabled }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs text-zinc-400">{label}</label>}
    <select value={value} onChange={onChange} disabled={disabled} className={`w-full bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-blue-500 ${disabled ? 'opacity-60' : ''} ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}>
      {options.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Button = ({ children, variant = 'primary', size = 'default', onClick, disabled = false, className = '', icon: Icon }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-zinc-800 text-zinc-400',
    outline: 'border border-zinc-600 hover:bg-zinc-800 text-zinc-300',
  };
  const sizes = { xs: 'px-2 py-1 text-xs', sm: 'px-2 py-1.5 text-xs', default: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-sm' };
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-1.5 rounded-lg font-medium transition ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {Icon && <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'} />}
      {children}
    </button>
  );
};

const KPICard = ({ title, value, unit, subtitle, icon: Icon, color, trend, onClick }) => {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30',
    red: 'from-red-500/20 to-red-600/5 border-red-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
  };
  const iconColors = { blue: 'text-blue-400', emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400', purple: 'text-purple-400' };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-3 ${onClick ? 'cursor-pointer hover:brightness-110 transition' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400">{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-white">{value}</span>
            {unit && <span className="text-xs text-zinc-400">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
              {trend !== 0 && <span>{Math.abs(trend)}%</span>}
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-zinc-800/50 ${iconColors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, max = 100, color = 'blue', showLabel = true, size = 'default' }) => {
  const percent = Math.min((value / max) * 100, 100);
  const colors = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500' };
  const autoColor = percent >= 100 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="space-y-1">
      <div className={`bg-zinc-800 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2'}`}>
        <div className={`h-full rounded-full transition-all ${color === 'auto' ? autoColor : colors[color]}`} style={{ width: `${percent}%` }} />
      </div>
      {showLabel && <div className="flex justify-between text-xs text-zinc-500"><span>{value}</span><span>{max}</span></div>}
    </div>
  );
};

const StepIndicator = ({ steps, currentStep, onStepClick }) => (
  <div className="flex items-center gap-1 overflow-x-auto pb-1">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <button onClick={() => onStepClick?.(i + 1)} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition flex-shrink-0 ${i + 1 === currentStep ? 'bg-blue-600 text-white' : i + 1 < currentStep ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${i + 1 < currentStep ? 'bg-emerald-500 text-white' : i + 1 === currentStep ? 'bg-white text-blue-600' : 'bg-zinc-700 text-zinc-400'}`}>
            {i + 1 < currentStep ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          <span className="text-xs hidden lg:inline whitespace-nowrap">{step}</span>
        </button>
        {i < steps.length - 1 && <div className={`w-4 h-px flex-shrink-0 ${i + 1 < currentStep ? 'bg-emerald-500' : 'bg-zinc-700'}`} />}
      </React.Fragment>
    ))}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'default' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', default: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-zinc-900 border border-zinc-800 rounded-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition"><X className="w-4 h-4 text-zinc-400" /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
        {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
        {tab.label}
        {tab.count !== undefined && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-zinc-700'}`}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

// ============================================================================
// DADOS
// ============================================================================

const monitoringData = [
  { date: '2026-01-15', subOil: 4945.56, subGas: 0, subHC: 4945.56, topOil: 4823.45, topGas: 1078.23, topHC: 5901.68, sepOil: 4923.12, sepGas: 1089.45, sepHC: 6012.57, hcBalTS: -0.39, totalBalTS: -0.45, hcStatus: 'OK', action: 'MONITORAR', subVsTS: 0, topVsTS: 0, topVsSub: 0 },
  { date: '2026-01-16', subOil: 5123.78, subGas: 0, subHC: 5123.78, topOil: 4987.34, topGas: 1112.45, topHC: 6099.79, sepOil: 5098.56, sepGas: 1123.67, sepHC: 6222.23, hcBalTS: 2.16, totalBalTS: 2.10, hcStatus: 'OK', action: 'MONITORAR', subVsTS: 0, topVsTS: 0, topVsSub: 0 },
  { date: '2026-01-17', subOil: 4789.34, subGas: 0, subHC: 4789.34, topOil: 4678.56, topGas: 1034.23, topHC: 5712.79, sepOil: 4756.78, sepGas: 1045.56, sepHC: 5802.34, hcBalTS: 2.56, totalBalTS: 2.48, hcStatus: 'OK', action: 'MONITORAR', subVsTS: 0, topVsTS: 0, topVsSub: 0 },
  { date: '2026-01-18', subOil: 4956.67, subGas: 0, subHC: 4956.67, topOil: 4834.12, topGas: 1067.89, topHC: 5902.01, sepOil: 4923.45, sepGas: 1078.23, sepHC: 6001.68, hcBalTS: -0.85, totalBalTS: -0.92, hcStatus: 'OK', action: 'MONITORAR', subVsTS: 0, topVsTS: 0, topVsSub: 0 },
  { date: '2026-01-19', subOil: 5089.45, subGas: 0, subHC: 5089.45, topOil: 4967.78, topGas: 1098.34, topHC: 6066.12, sepOil: 5056.23, sepGas: 1112.56, sepHC: 6168.79, hcBalTS: -0.98, totalBalTS: -1.05, hcStatus: 'OK', action: 'MONITORAR', subVsTS: 1, topVsTS: 1, topVsSub: 0 },
  { date: '2026-01-20', subOil: 5234.12, subGas: 0, subHC: 5234.12, topOil: 5089.34, topGas: 1134.56, topHC: 6223.90, sepOil: 5198.67, sepGas: 1145.78, sepHC: 6344.45, hcBalTS: 36.07, totalBalTS: 35.95, hcStatus: 'FAIL', action: 'INVESTIGAR', subVsTS: 3, topVsTS: 3, topVsSub: 0 },
  { date: '2026-01-21', subOil: 5312.45, subGas: 0, subHC: 5312.45, topOil: 5156.78, topGas: 1156.34, topHC: 6313.12, sepOil: 5278.90, sepGas: 1167.89, sepHC: 6446.79, hcBalTS: 1.15, totalBalTS: 1.14, hcStatus: 'OK', action: 'MONITORAR', subVsTS: 0, topVsTS: 0, topVsSub: 0 },
];

const meters = [
  { tag: '13FT0367', name: 'Riser P5', location: 'TOPSIDE', status: 'active', lastCalib: '2025-07-15', kOil: 1.0023, kGas: 0.9856, kWater: 1.0012, daysToCalib: 172 },
  { tag: '13FT0417', name: 'Riser P6', location: 'TOPSIDE', status: 'inactive', lastCalib: '2025-05-20', kOil: 0.9945, kGas: 1.0134, kWater: 0.9978, daysToCalib: 116 },
  { tag: '18FT1506', name: 'PE_4', location: 'SUBSEA', status: 'active', lastCalib: '2026-01-17', kOil: 0.7276, kGas: 39.89, kWater: 0.0025, daysToCalib: 356 },
  { tag: '18FT1806', name: 'PE_EO4', location: 'SUBSEA', status: 'inactive', lastCalib: '2025-03-10', kOil: 1.0156, kGas: 0.9923, kWater: 1.0089, daysToCalib: 44 },
  { tag: '18FT1706', name: 'PE_EO105', location: 'SUBSEA', status: 'inactive', lastCalib: '2025-02-28', kOil: 0.9834, kGas: 1.0245, kWater: 0.9956, daysToCalib: 34 },
  { tag: '18FT1406', name: 'PE_EO10', location: 'SUBSEA', status: 'inactive', lastCalib: '2025-04-15', kOil: 1.0078, kGas: 0.9789, kWater: 1.0034, daysToCalib: 80 },
];

const calibrationEvents = [
  { id: 'CAL-MPFM_SUB-COM-01-26', meter: '18FT1506', meterName: 'PE_4', type: 'Comissionamento', status: 'Em Andamento', startDate: '2026-01-17', currentStep: 4, progress: 57, responsible: 'Mauricio Amorim' },
  { id: 'CAL-MPFM_TOP-PER-07-25', meter: '13FT0367', meterName: 'Riser P5', type: 'Periódica', status: 'Concluída', startDate: '2025-07-15', currentStep: 7, progress: 100, responsible: 'João Silva' },
  { id: 'CAL-MPFM_SUB-INV-12-25', meter: '18FT1806', meterName: 'PE_EO4', type: 'Investigação', status: 'Pendente', startDate: '2025-12-20', currentStep: 1, progress: 0, responsible: 'Ana Costa' },
];

const alerts = [
  { id: 1, type: 'error', message: 'Balanço HC > 10% detectado em 20/01', meter: '13FT0367', time: '2h atrás', read: false },
  { id: 2, type: 'warning', message: 'K-Factor de gás fora do range normal', meter: '18FT1506', time: '5h atrás', read: false },
  { id: 3, type: 'info', message: 'Calibração CAL-MPFM_SUB-COM-01-26 em andamento', meter: '18FT1506', time: '1d atrás', read: true },
  { id: 4, type: 'success', message: 'Calibração CAL-MPFM_TOP-PER-07-25 concluída', meter: '13FT0367', time: '3d atrás', read: true },
];

const complianceItems = [
  { item: '4.5', desc: 'Monitoramento de variáveis críticas', status: 'OK', evidence: 'Planilha diária atualizada' },
  { item: '7.3', desc: 'RAD a cada 180 dias', status: 'OK', evidence: 'Último RAD em 15/10/2025' },
  { item: '8.6.3', desc: 'Totalização mínima 24h', status: 'OK', evidence: 'Duração registrada: 24.0h' },
  { item: '10.3', desc: 'Relatório final em 30 dias', status: 'WARNING', evidence: 'Prazo: 16/02/2026 (21 dias)' },
  { item: '10.4', desc: 'Parciais a cada 10 dias', status: 'OK', evidence: 'Última parcial: 20/01/2026' },
  { item: '10.5', desc: 'Plano de contingência', status: 'OK', evidence: 'PC-MPFM-001 aprovado' },
];

const totalizadoresData = [
  { inicio: '04/12/2025 00:00', fim: '04/12/2025 01:00', dt: 1.00, mpfmOleo: 127.18, mpfmGas: 0, mpfmAgua: 0, hc: 127.18, total: 127.21, refOleo: 105.96, refGas: 25.62, status: 'OK' },
  { inicio: '04/12/2025 01:00', fim: '04/12/2025 02:00', dt: 1.00, mpfmOleo: 127.10, mpfmGas: 0, mpfmAgua: 0, hc: 127.10, total: 127.21, refOleo: 105.96, refGas: 25.59, status: 'OK' },
  { inicio: '04/12/2025 02:00', fim: '04/12/2025 03:00', dt: 1.00, mpfmOleo: 127.09, mpfmGas: 0, mpfmAgua: 0, hc: 127.09, total: 127.20, refOleo: 105.96, refGas: 25.58, status: 'OK' },
  { inicio: '04/12/2025 03:00', fim: '04/12/2025 04:00', dt: 1.00, mpfmOleo: 244.32, mpfmGas: 0, mpfmAgua: 0, hc: 244.32, total: 244.54, refOleo: 105.96, refGas: 25.58, status: 'OK' },
  { inicio: '04/12/2025 04:00', fim: '04/12/2025 05:00', dt: 1.00, mpfmOleo: 422.27, mpfmGas: 0, mpfmAgua: 0, hc: 422.27, total: 422.65, refOleo: 105.96, refGas: 25.59, status: 'OK' },
  { inicio: '04/12/2025 05:00', fim: '04/12/2025 06:00', dt: 1.00, mpfmOleo: 448.77, mpfmGas: 0, mpfmAgua: 0, hc: 448.77, total: 449.10, refOleo: 105.96, refGas: 25.62, status: 'OK' },
];

const composicaoMolar = [
  { comp: 'CO2', mw: 44.01, mol: 0.020 },
  { comp: 'N2', mw: 28.01, mol: 0.575 },
  { comp: 'C1 (Metano)', mw: 16.04, mol: 62.183 },
  { comp: 'C2 (Etano)', mw: 30.07, mol: 8.069 },
  { comp: 'C3 (Propano)', mw: 44.10, mol: 5.047 },
  { comp: 'i-C4', mw: 58.12, mol: 1.069 },
  { comp: 'n-C4', mw: 58.12, mol: 1.856 },
  { comp: 'i-C5', mw: 72.15, mol: 0.681 },
  { comp: 'n-C5', mw: 72.15, mol: 0.788 },
  { comp: 'n-C6', mw: 86.18, mol: 1.112 },
  { comp: 'C7', mw: 97.37, mol: 1.138 },
  { comp: 'C8', mw: 111.29, mol: 1.657 },
  { comp: 'C9', mw: 125.25, mol: 1.472 },
  { comp: 'C10+', mw: 289.64, mol: 14.331 },
];

// ============================================================================
// MÓDULO DE MONITORAMENTO
// ============================================================================

const MonitoringDashboard = () => {
  const latestData = monitoringData[monitoringData.length - 1];
  const maxConsecDays = Math.max(...monitoringData.map(d => Math.max(d.subVsTS, d.topVsTS, d.topVsSub)));
  const activeMeters = meters.filter(m => m.status === 'active').length;
  const alertCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard title="Balanço HC Atual" value={latestData.hcBalTS.toFixed(2)} unit="%" subtitle={Math.abs(latestData.hcBalTS) > 10 ? 'FORA DO LIMITE' : 'Dentro do limite'} icon={Target} color={Math.abs(latestData.hcBalTS) > 10 ? 'red' : 'emerald'} />
        <KPICard title="Balanço Total" value={latestData.totalBalTS.toFixed(2)} unit="%" subtitle="Limite: ±7%" icon={Activity} color={Math.abs(latestData.totalBalTS) > 7 ? 'red' : 'emerald'} />
        <KPICard title="Dias Consecutivos" value={maxConsecDays} unit="/10" subtitle="Gatilho calibração" icon={Calendar} color={maxConsecDays >= 10 ? 'red' : maxConsecDays >= 7 ? 'amber' : 'emerald'} />
        <KPICard title="Medidores Ativos" value={activeMeters} unit={`/${meters.length}`} icon={Gauge} color="purple" />
        <KPICard title="Alertas Pendentes" value={alertCount} icon={Bell} color={alertCount > 0 ? 'amber' : 'emerald'} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Histórico de Balanço de Massa" subtitle="Últimos 7 dias - Limites ANP: HC ±10%, Total ±7%">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monitoringData}>
              <defs>
                <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#71717a" fontSize={10} domain={[-15, 40]} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }} />
              <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" />
              <ReferenceLine y={-10} stroke="#ef4444" strokeDasharray="5 5" />
              <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="3 3" />
              <ReferenceLine y={-7} stroke="#f59e0b" strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#52525b" />
              <Area type="monotone" dataKey="hcBalTS" stroke="#3b82f6" fill="url(#hcGrad)" name="HC %" strokeWidth={2} />
              <Area type="monotone" dataKey="totalBalTS" stroke="#10b981" fill="url(#totalGrad)" name="Total %" strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Produção HC por Sistema" subtitle="Últimos 7 dias (t)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monitoringData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#71717a" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="subHC" fill="#3b82f6" name="Subsea" radius={[4, 4, 0, 0]} />
              <Bar dataKey="topHC" fill="#8b5cf6" name="Topside" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sepHC" fill="#10b981" name="Test Sep" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tabela e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Monitoramento Diário" subtitle="Últimos registros" className="lg:col-span-2" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/50">
                  <th className="py-2 px-3 text-left text-zinc-400">Data</th>
                  <th className="py-2 px-3 text-right text-blue-400">Subsea HC</th>
                  <th className="py-2 px-3 text-right text-purple-400">Topside HC</th>
                  <th className="py-2 px-3 text-right text-emerald-400">Test Sep HC</th>
                  <th className="py-2 px-3 text-center text-zinc-400">Bal HC%</th>
                  <th className="py-2 px-3 text-center text-zinc-400">Status</th>
                  <th className="py-2 px-3 text-center text-zinc-400">Ação</th>
                </tr>
              </thead>
              <tbody>
                {monitoringData.slice().reverse().slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-zinc-200">{row.date}</td>
                    <td className="py-2 px-3 text-right text-blue-400">{row.subHC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                    <td className="py-2 px-3 text-right text-purple-400">{row.topHC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                    <td className="py-2 px-3 text-right text-emerald-400">{row.sepHC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                    <td className={`py-2 px-3 text-center font-mono ${Math.abs(row.hcBalTS) > 10 ? 'text-red-400' : 'text-zinc-300'}`}>{row.hcBalTS > 0 ? '+' : ''}{row.hcBalTS.toFixed(2)}%</td>
                    <td className="py-2 px-3 text-center"><Badge variant={row.hcStatus} size="sm">{row.hcStatus}</Badge></td>
                    <td className="py-2 px-3 text-center"><Badge variant={row.action === 'MONITORAR' ? 'success' : 'error'} size="sm">{row.action}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Alertas Recentes" headerRight={<Badge variant={alertCount > 0 ? 'warning' : 'success'}>{alertCount} novos</Badge>} noPadding>
          <div className="divide-y divide-zinc-800">
            {alerts.slice(0, 4).map(alert => (
              <div key={alert.id} className={`p-3 ${!alert.read ? 'bg-zinc-800/30' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 p-1 rounded ${alert.type === 'error' ? 'bg-red-500/20 text-red-400' : alert.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : alert.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {alert.type === 'error' ? <AlertCircle className="w-3 h-3" /> : alert.type === 'warning' ? <AlertTriangle className="w-3 h-3" /> : alert.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 truncate">{alert.message}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{alert.meter} • {alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Medidores */}
      <Card title="Medidores MPFM" subtitle="Status e próximas calibrações" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800/50">
                <th className="py-2 px-3 text-left text-zinc-400">TAG</th>
                <th className="py-2 px-3 text-left text-zinc-400">Nome</th>
                <th className="py-2 px-3 text-center text-zinc-400">Localização</th>
                <th className="py-2 px-3 text-center text-zinc-400">Status</th>
                <th className="py-2 px-3 text-center text-zinc-400">Última Calib.</th>
                <th className="py-2 px-3 text-right text-zinc-400">K-Oil</th>
                <th className="py-2 px-3 text-right text-zinc-400">K-Gas</th>
                <th className="py-2 px-3 text-center text-zinc-400">Próx. Calib.</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((meter, idx) => (
                <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 px-3 font-mono text-blue-400">{meter.tag}</td>
                  <td className="py-2 px-3 text-zinc-200">{meter.name}</td>
                  <td className="py-2 px-3 text-center"><Badge variant={meter.location} size="sm">{meter.location}</Badge></td>
                  <td className="py-2 px-3 text-center"><Badge variant={meter.status} size="sm">{meter.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="py-2 px-3 text-center text-zinc-400">{meter.lastCalib}</td>
                  <td className={`py-2 px-3 text-right font-mono ${meter.kOil < 0.8 || meter.kOil > 1.2 ? 'text-red-400' : 'text-emerald-400'}`}>{meter.kOil.toFixed(4)}</td>
                  <td className={`py-2 px-3 text-right font-mono ${meter.kGas < 0.8 || meter.kGas > 1.2 ? 'text-red-400' : 'text-emerald-400'}`}>{meter.kGas.toFixed(4)}</td>
                  <td className="py-2 px-3 text-center"><Badge variant={meter.daysToCalib < 30 ? 'error' : meter.daysToCalib < 60 ? 'warning' : 'success'} size="sm">{meter.daysToCalib}d</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// MÓDULO DE AVALIAÇÃO DE DESEMPENHO - LISTA DE EVENTOS
// ============================================================================

const CalibrationEventsList = ({ onSelectEvent, onNewEvent }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-white">Eventos de Calibração</h2>
        <p className="text-xs text-zinc-500">Avaliações de desempenho MPFM - Comissionamento, Periódica, Investigação</p>
      </div>
      <Button onClick={onNewEvent} icon={Plus}>Nova Avaliação</Button>
    </div>

    <Tabs 
      tabs={[
        { id: 'all', label: 'Todos', count: calibrationEvents.length },
        { id: 'active', label: 'Em Andamento', count: calibrationEvents.filter(e => e.status === 'Em Andamento').length },
        { id: 'pending', label: 'Pendentes', count: calibrationEvents.filter(e => e.status === 'Pendente').length },
        { id: 'completed', label: 'Concluídas', count: calibrationEvents.filter(e => e.status === 'Concluída').length },
      ]}
      activeTab="all"
      onChange={() => {}}
    />

    <div className="grid gap-3">
      {calibrationEvents.map((event, idx) => (
        <Card key={idx} className="hover:ring-1 hover:ring-blue-500/50 cursor-pointer transition" noPadding onClick={() => onSelectEvent(event)}>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${event.status === 'Concluída' ? 'bg-emerald-500/20' : event.status === 'Em Andamento' ? 'bg-blue-500/20' : 'bg-zinc-700'}`}>
                  {event.status === 'Concluída' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : event.status === 'Em Andamento' ? <Play className="w-6 h-6 text-blue-400" /> : <Clock className="w-6 h-6 text-zinc-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{event.id}</span>
                    <Badge variant={event.status === 'Concluída' ? 'success' : event.status === 'Em Andamento' ? 'info' : 'warning'}>{event.status}</Badge>
                    <Badge variant="purple">{event.type}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    <span className="text-blue-400">{event.meter}</span> - {event.meterName} | Início: {event.startDate} | Resp: {event.responsible}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <ProgressBar value={event.progress} color={event.status === 'Concluída' ? 'emerald' : 'blue'} showLabel={false} size="sm" />
                    </div>
                    <span className="text-xs text-zinc-400">Etapa {event.currentStep}/7</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// ============================================================================
// MÓDULO DE AVALIAÇÃO DE DESEMPENHO - WORKFLOW
// ============================================================================

const CalibrationWorkflow = ({ event, onBack }) => {
  const [currentStep, setCurrentStep] = useState(event?.currentStep || 1);
  const steps = ['Registro', 'PVT', 'Totalizadores', 'K-Fatores', 'Balanços', 'Pós-Monit.', 'Alarmes'];

  const [formData, setFormData] = useState({
    eventId: event?.id || 'CAL-MPFM_SUB-COM-01-26',
    status: event?.status || 'Em Andamento',
    tagMPFM: event?.meter || '18-FT-1506',
    meterName: event?.meterName || 'PE_4',
    natureza: event?.type || 'Comissionamento',
    operador: 'Equinor Brasil Energia Ltda.',
    unidade: 'FPSO Bacalhau',
    responsavel: event?.responsible || 'Mauricio Amorim',
    dataEmissao: '2026-01-23',
    inicioTotalizacao: '2025-12-04T00:00',
    fimTotalizacao: '2025-12-04T23:59',
    duracaoEfetiva: '24.0',
    pvtReportId: 'SLB - P.1077663_2025BRRD-P004039-J0001_v01',
    densidadeOleo: '773.41',
    densidadeGas: '0.87',
    kMin: '0.80',
    kMax: '1.20',
    limiteHC: '10.00',
    limiteTotal: '7.00',
  });

  const updateForm = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Card>
              <SectionHeader icon={Clipboard} title="Identificação do Responsável e Autoridade" color="blue" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Input label="ID do Evento/Relatório" value={formData.eventId} onChange={(e) => updateForm('eventId', e.target.value)} />
                <Select label="Status" value={formData.status} onChange={(e) => updateForm('status', e.target.value)} options={[
                  { value: 'Em Andamento', label: 'Em Andamento' },
                  { value: 'Aguardando PVT', label: 'Aguardando PVT' },
                  { value: 'Concluída', label: 'Concluída' },
                ]} />
                <Input label="Operador" value={formData.operador} onChange={(e) => updateForm('operador', e.target.value)} />
                <Input label="Responsável" value={formData.responsavel} onChange={(e) => updateForm('responsavel', e.target.value)} />
              </div>
            </Card>
            <Card>
              <SectionHeader icon={Database} title="Dados da Instalação" color="purple" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Input label="Unidade / FPSO" value={formData.unidade} readOnly />
                <Input label="Bacia / Campo" value="Santos / Bacalhau" readOnly />
                <Input label="Localização" value="MEDIDOR SUBSEA - Poço PE-4" readOnly />
                <Input label="Referência Metrológica" value="Separador de Teste - TAG: 20VA121" readOnly />
              </div>
            </Card>
            <Card>
              <SectionHeader icon={Gauge} title="Identificação do Instrumento (MPFM)" color="amber" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Input label="TAG do MPFM" value={formData.tagMPFM} readOnly />
                <Input label="Número de Série" value="14-100269" readOnly />
                <Input label="Fabricante / Modelo" value="TechnipFMC / MPM High-Performance" readOnly />
                <Input label="Tamanho" value='5" - B = 0.7 MPM' readOnly />
              </div>
            </Card>
            <Card>
              <SectionHeader icon={Calendar} title="Escopo e Período do Teste" color="red" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Input label="Natureza da Atividade" value={`${formData.natureza} - ${formData.meterName} - ${formData.tagMPFM}`} readOnly />
                <Input label="Início da Totalização" type="datetime-local" value={formData.inicioTotalizacao} onChange={(e) => updateForm('inicioTotalizacao', e.target.value)} />
                <Input label="Fim da Totalização" type="datetime-local" value={formData.fimTotalizacao} onChange={(e) => updateForm('fimTotalizacao', e.target.value)} />
                <Input label="Duração Efetiva (h)" value={formData.duracaoEfetiva} unit="h" readOnly />
              </div>
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Card>
              <SectionHeader icon={FlaskConical} title="Identificação do Relatório PVT / Amostragem" color="purple" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Input label="ID do Relatório Laboratorial" value={formData.pvtReportId} onChange={(e) => updateForm('pvtReportId', e.target.value)} className="col-span-2" />
                <Input label="Data da Amostragem" type="date" value="2026-01-10" />
                <Input label="Software de Modelagem" value="PVTsim" />
                <Select label="Status de Aprovação" value="Aprovado" options={[{ value: 'Aprovado', label: 'Aprovado' }, { value: 'Pendente', label: 'Pendente' }]} />
                <Input label="Data de Aprovação" type="date" value="2026-01-10" />
              </div>
            </Card>
            <Card>
              <SectionHeader icon={Beaker} title="Propriedades de Referência (@std)" color="blue" />
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Input label="Densidade Óleo" value={formData.densidadeOleo} unit="kg/m³" />
                <Input label="Densidade Gás" value={formData.densidadeGas} unit="kg/m³" />
                <Input label="Densidade Água" value="1.25" unit="kg/m³" />
                <Input label="GOR" value="216.81" unit="Sm³/Sm³" />
                <Input label="BSW" value="205.55" unit="%" />
              </div>
            </Card>
            <Card>
              <SectionHeader icon={Database} title="Composição Molar (mol%)" color="amber" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-2 px-2 text-left text-zinc-400">Componente</th>
                      <th className="py-2 px-2 text-right text-zinc-400">MW (kg/kmol)</th>
                      <th className="py-2 px-2 text-right text-blue-400">mol% (entrada)</th>
                      <th className="py-2 px-2 text-right text-emerald-400">mol% (normalizado)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {composicaoMolar.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/50">
                        <td className="py-1.5 px-2 text-zinc-200">{row.comp}</td>
                        <td className="py-1.5 px-2 text-right text-zinc-400">{row.mw.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right text-blue-400">{row.mol.toFixed(3)}</td>
                        <td className="py-1.5 px-2 text-right text-emerald-400">{row.mol.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-800/50">
                    <tr>
                      <td className="py-2 px-2 text-zinc-200 font-medium">Soma mol%</td>
                      <td></td>
                      <td className="py-2 px-2 text-right text-blue-400 font-medium">{composicaoMolar.reduce((a, b) => a + b.mol, 0).toFixed(3)}</td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-medium">100.000</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300"><Info className="w-3 h-3 inline mr-1" />Preencha Data/Hora e leituras de totalizador. As deltas e totais de 24h são calculados automaticamente.</p>
            </div>
            <Card>
              <SectionHeader icon={Database} title="03 – Totalizadores / Horário (mínimo 24h)" color="blue" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-2 px-1 text-left text-zinc-400">Início</th>
                      <th className="py-2 px-1 text-left text-zinc-400">Fim</th>
                      <th className="py-2 px-1 text-center text-zinc-400">Δt</th>
                      <th className="py-2 px-1 text-right text-blue-400">MPFM Óleo</th>
                      <th className="py-2 px-1 text-right text-blue-400">MPFM Gás</th>
                      <th className="py-2 px-1 text-right text-blue-400">HC</th>
                      <th className="py-2 px-1 text-right text-emerald-400">REF Óleo</th>
                      <th className="py-2 px-1 text-right text-emerald-400">REF Gás</th>
                      <th className="py-2 px-1 text-center text-zinc-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalizadoresData.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/50">
                        <td className="py-1.5 px-1 text-zinc-300 text-[10px]">{row.inicio}</td>
                        <td className="py-1.5 px-1 text-zinc-300 text-[10px]">{row.fim}</td>
                        <td className="py-1.5 px-1 text-center text-zinc-400">{row.dt}</td>
                        <td className="py-1.5 px-1 text-right text-blue-400">{row.mpfmOleo.toFixed(2)}</td>
                        <td className="py-1.5 px-1 text-right text-blue-400">{row.mpfmGas}</td>
                        <td className="py-1.5 px-1 text-right text-blue-400 font-medium">{row.hc.toFixed(2)}</td>
                        <td className="py-1.5 px-1 text-right text-emerald-400">{row.refOleo.toFixed(2)}</td>
                        <td className="py-1.5 px-1 text-right text-emerald-400">{row.refGas.toFixed(2)}</td>
                        <td className="py-1.5 px-1 text-center"><Badge variant={row.status} size="sm">{row.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <SectionHeader icon={Calculator} title="Total 24h - Somatório" color="amber" />
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-zinc-800/50 rounded-lg"><p className="text-xs text-zinc-500">Duração</p><p className="text-lg font-bold text-white">24.0h</p></div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20"><p className="text-xs text-zinc-500">MPFM Óleo</p><p className="text-lg font-bold text-blue-400">332.27 kg</p></div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20"><p className="text-xs text-zinc-500">MPFM Gás</p><p className="text-lg font-bold text-blue-400">1.88 kg</p></div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20"><p className="text-xs text-zinc-500">MPFM HC</p><p className="text-lg font-bold text-blue-400">334.15 kg</p></div>
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><p className="text-xs text-zinc-500">REF Óleo</p><p className="text-lg font-bold text-emerald-400">241.75 kg</p></div>
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><p className="text-xs text-zinc-500">REF Gás</p><p className="text-lg font-bold text-emerald-400">75.17 kg</p></div>
              </div>
            </Card>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <Card>
              <SectionHeader icon={Settings} title="Parâmetros de Aceitação" color="amber" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Input label="K mínimo" value={formData.kMin} />
                <Input label="K máximo" value={formData.kMax} />
                <Input label="Limite desvio HC (±)" value={formData.limiteHC} unit="%" />
                <Input label="Limite desvio Total (±)" value={formData.limiteTotal} unit="%" />
              </div>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <SectionHeader icon={Database} title="Massas Totalizadas (24h)" color="blue" />
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-2 px-2 text-left text-zinc-400">Fase</th>
                      <th className="py-2 px-2 text-right text-blue-400">MPFM</th>
                      <th className="py-2 px-2 text-right text-emerald-400">Ref</th>
                      <th className="py-2 px-2 text-right text-zinc-400">Desvio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[{ fase: 'Óleo', mpfm: 332, ref: 242, desvio: 37.2 }, { fase: 'Gás', mpfm: 2, ref: 75, desvio: -97.3 }, { fase: 'Água', mpfm: 0, ref: 0, desvio: 0 }, { fase: 'HC', mpfm: 334, ref: 317, desvio: 5.4 }].map((r, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td className="py-2 px-2 text-zinc-200">{r.fase}</td>
                        <td className="py-2 px-2 text-right text-blue-400">{r.mpfm}</td>
                        <td className="py-2 px-2 text-right text-emerald-400">{r.ref}</td>
                        <td className={`py-2 px-2 text-right ${Math.abs(r.desvio) > 10 ? 'text-red-400' : 'text-zinc-300'}`}>{r.desvio}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <Card>
                <SectionHeader icon={Calculator} title="K-Factors Calculados" color="purple" />
                <div className="space-y-3">
                  {[{ fase: 'K-Oil', k: 0.7276, status: 'Fora' }, { fase: 'K-Gas', k: 39.8885, status: 'Fora' }, { fase: 'K-Água', k: 0.0025, status: 'Fora' }].map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg flex items-center justify-between ${item.status === 'Fora' ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                      <div>
                        <span className="text-xs text-zinc-400">{item.fase}</span>
                        <p className={`text-xl font-bold ${item.status === 'Fora' ? 'text-red-400' : 'text-emerald-400'}`}>{item.k.toFixed(4)}</p>
                      </div>
                      <Badge variant={item.status}>{item.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <Card>
              <SectionHeader icon={Target} title="Balanço HC Subsea vs Topside (com desconto de Gás Lift)" color="blue" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <Input label="MPFM Topside – Óleo (t)" type="number" />
                <Input label="MPFM Topside – Gás (t)" type="number" />
                <Input label="Gás Lift – Gás (t)" type="number" />
                <Input label="Desvio (%)" readOnly />
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-xs text-emerald-300"><CheckCircle className="w-3 h-3 inline mr-1" />Status (±10%): Dentro do limite</p>
              </div>
            </Card>
            <Card>
              <SectionHeader icon={CheckCircle} title="Checagens de Envelope / Integridade" color="emerald" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-2 px-3 text-left text-zinc-400">Item</th>
                      <th className="py-2 px-3 text-right text-zinc-400">Valor</th>
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
                        <td className="py-2 px-3 text-center"><Badge variant="OK" size="sm">OK</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-xs text-purple-300"><Info className="w-3 h-3 inline mr-1" />Registre por período as massas totalizadas e o efeito dos novos K-factors. Útil para evidência pós-calibração.</p>
            </div>
            <Card>
              <SectionHeader icon={Eye} title="06 – Monitoramento Pós-Aplicação de Novos Fatores" color="purple" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-2 px-2 text-left text-zinc-400">Data</th>
                      <th className="py-2 px-2 text-center text-zinc-400">Duração</th>
                      <th className="py-2 px-2 text-right text-zinc-400">MPFM Óleo</th>
                      <th className="py-2 px-2 text-right text-zinc-400">MPFM Gás</th>
                      <th className="py-2 px-2 text-right text-blue-400">MPFM Corr. Total</th>
                      <th className="py-2 px-2 text-right text-emerald-400">REF Total</th>
                      <th className="py-2 px-2 text-center text-zinc-400">Desvio</th>
                      <th className="py-2 px-2 text-left text-zinc-400">Alarmes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td className="py-1.5 px-2"><input type="date" className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                        <td className="py-1.5 px-2"><input type="number" className="w-12 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white text-center" /></td>
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
            </Card>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-300"><AlertTriangle className="w-3 h-3 inline mr-1" />Use este log para rastreabilidade: alarmes críticos devem estar inativos no início do teste e investigados quando ocorrerem.</p>
            </div>
            <Card>
              <SectionHeader icon={Bell} title="07 – Registro de Alarmes / Eventos (HMI/MPM/FCS320)" color="red" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-2 px-2 text-left text-zinc-400">Data/Hora</th>
                      <th className="py-2 px-2 text-left text-zinc-400">TAG</th>
                      <th className="py-2 px-2 text-left text-zinc-400">Código</th>
                      <th className="py-2 px-2 text-left text-zinc-400">Descrição</th>
                      <th className="py-2 px-2 text-center text-zinc-400">Gravidade</th>
                      <th className="py-2 px-2 text-left text-zinc-400">Ação Tomada</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-800/50 bg-amber-500/5">
                      <td className="py-2 px-2 text-zinc-300">2026-01-13 00:00</td>
                      <td className="py-2 px-2 text-blue-400">18-FT-1506</td>
                      <td className="py-2 px-2 text-zinc-300">Gamma</td>
                      <td className="py-2 px-2 text-zinc-300">Gamma = 633.22</td>
                      <td className="py-2 px-2 text-center"><Badge variant="warning" size="sm">Warning</Badge></td>
                      <td className="py-2 px-2 text-zinc-400">Monitorando</td>
                    </tr>
                    {[...Array(4)].map((_, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td className="py-1.5 px-2"><input type="datetime-local" className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                        <td className="py-1.5 px-2"><input className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
                        <td className="py-1.5 px-2"><input className="w-20 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" /></td>
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
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} icon={ChevronLeft}>Voltar</Button>
          <div>
            <h2 className="text-lg font-semibold text-white">{formData.eventId}</h2>
            <p className="text-xs text-zinc-500">{formData.tagMPFM} - {formData.meterName} | {formData.natureza}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">{formData.status}</Badge>
          <Button variant="secondary" size="sm" icon={Save}>Salvar</Button>
          <Button variant="secondary" size="sm" icon={FileText}>Relatório</Button>
        </div>
      </div>

      {/* Step Navigator */}
      <Card className="p-3">
        <StepIndicator steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
      </Card>

      {/* Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button variant="secondary" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} icon={ChevronLeft}>Anterior</Button>
        <div className="flex gap-2">
          {currentStep < 7 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>Próximo<ChevronRight className="w-4 h-4 ml-1" /></Button>
          ) : (
            <Button variant="success" icon={Check}>Concluir Avaliação</Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// APP PRINCIPAL
// ============================================================================

export default function App() {
  const [activeModule, setActiveModule] = useState('monitoring');
  const [activeSubPage, setActiveSubPage] = useState('dashboard');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);

  const modules = [
    { id: 'monitoring', label: 'Monitoramento SGM-FM', icon: Activity, desc: 'Variáveis críticas' },
    { id: 'performance', label: 'Avaliação de Desempenho', icon: Gauge, desc: 'Calibração MPFM' },
    { id: 'compliance', label: 'Conformidade ANP', icon: FileCheck, desc: 'RANP 44/2015' },
  ];

  const renderContent = () => {
    if (activeModule === 'monitoring') {
      return <MonitoringDashboard />;
    }
    if (activeModule === 'performance') {
      if (selectedEvent) {
        return <CalibrationWorkflow event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
      }
      return <CalibrationEventsList onSelectEvent={setSelectedEvent} onNewEvent={() => setShowNewEventModal(true)} />;
    }
    if (activeModule === 'compliance') {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Conformidade ANP 44/2015</h2>
          <div className="grid grid-cols-3 gap-4">
            <KPICard title="Conformes" value={complianceItems.filter(i => i.status === 'OK').length} icon={CheckCircle} color="emerald" />
            <KPICard title="Alertas" value={complianceItems.filter(i => i.status === 'WARNING').length} icon={AlertTriangle} color="amber" />
            <KPICard title="Não Conformes" value={complianceItems.filter(i => i.status === 'ERROR').length} icon={AlertCircle} color="red" />
          </div>
          <Card title="Checklist de Conformidade" noPadding>
            <div className="divide-y divide-zinc-800">
              {complianceItems.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.status === 'OK' ? 'bg-emerald-500/20 text-emerald-400' : item.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {item.status === 'OK' ? <CheckCircle className="w-4 h-4" /> : item.status === 'WARNING' ? <AlertTriangle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200"><span className="text-blue-400 font-mono">{item.item}</span> - {item.desc}</p>
                      <p className="text-xs text-zinc-500">{item.evidence}</p>
                    </div>
                  </div>
                  <Badge variant={item.status}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200 flex-shrink-0`}>
        <div className="p-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            {!collapsed && <div><div className="font-bold text-sm">MPFM Monitor</div><div className="text-xs text-zinc-500">FPSO Bacalhau</div></div>}
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {modules.map(m => (
            <button key={m.id} onClick={() => { setActiveModule(m.id); setSelectedEvent(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${activeModule === m.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}>
              <m.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <div className="text-left"><div className="text-xs font-medium">{m.label}</div><div className="text-[10px] opacity-60">{m.desc}</div></div>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800">
          {!collapsed && <div className="text-xs text-zinc-500"><div>RANP 44/2015 ANP</div><div className="text-zinc-600">v2.1.0</div></div>}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed(!collapsed)} className="p-2 hover:bg-zinc-800 rounded-lg transition">
              <Menu className="w-5 h-5 text-zinc-400" />
            </button>
            <div><h1 className="text-sm font-semibold">{modules.find(m => m.id === activeModule)?.label}</h1><p className="text-xs text-zinc-500">Última atualização: 26/01/2026 14:32</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={Upload}>Importar</Button>
            <Button variant="secondary" size="sm" icon={Download}>Exportar</Button>
            <button className="relative p-2 hover:bg-zinc-800 rounded-lg">
              <Bell className="w-5 h-5 text-zinc-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium">MA</div>
          </div>
        </header>
        <div className="flex-1 p-4 overflow-auto">{renderContent()}</div>
      </main>

      {/* Modal Nova Avaliação */}
      <Modal isOpen={showNewEventModal} onClose={() => setShowNewEventModal(false)} title="Nova Avaliação de Desempenho">
        <div className="space-y-4">
          <Select label="Tipo de Avaliação" options={[
            { value: 'comissionamento', label: 'Comissionamento (Início de Operação)' },
            { value: 'periodica', label: 'Avaliação Periódica (6/12 meses)' },
            { value: 'investigacao', label: 'Investigação (Gatilho ANP)' },
          ]} />
          <Select label="Medidor MPFM" options={meters.filter(m => m.status === 'active').map(m => ({ value: m.tag, label: `${m.tag} - ${m.name} (${m.location})` }))} />
          <Input label="Responsável" value="Mauricio Amorim" />
          <Input label="Data de Início" type="date" value="2026-01-26" />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowNewEventModal(false)}>Cancelar</Button>
            <Button onClick={() => { setShowNewEventModal(false); setSelectedEvent(calibrationEvents[0]); }} icon={Play}>Iniciar Avaliação</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
