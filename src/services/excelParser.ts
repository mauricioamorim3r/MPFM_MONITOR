/**
 * Serviço de Parsing de Excel - MPFM Monitor
 * Extração baseada em âncoras (anchor-based extraction)
 * Portado do excel_extractor.py Python
 */

import * as XLSX from 'xlsx';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type BlockType = 'CUMULATIVE' | 'DAY' | 'AVERAGE' | 'UNKNOWN';
export type SourceType = 'EXCEL_DAILY' | 'EXCEL_TOPSIDE' | 'EXCEL_SUBSEA' | 'EXCEL_SEPARATOR';

export interface ExtractedVariable {
  variableRaw: string;
  variableCode: string;
  value: number | null;
  unit: string;
  blockType: BlockType;
  sourceCell: string;
  qualityFlags: string[];
}

export interface ExtractedBlock {
  blockType: BlockType;
  anchorCell: string;
  anchorText: string;
  variables: ExtractedVariable[];
  startRow: number;
  endRow: number;
}

export interface ExcelSection {
  sectionName: string;
  assetTag: string;
  fluidType: 'OIL' | 'GAS' | 'WATER' | 'HC' | 'TOTAL';
  blocks: ExtractedBlock[];
}

export interface ExcelParseResult {
  success: boolean;
  fileName: string;
  sourceType: SourceType;
  reportDate: string | null;
  installation: string | null;
  sections: ExcelSection[];
  rawData: Record<string, Record<string, number | string | null>>;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// CONSTANTES - ÂNCORAS E MAPEAMENTOS
// ============================================================================

/**
 * Âncoras para identificação de blocos
 * Baseado no PRD_Ingestao_Excel_Diario_Base_Unica.md
 */
const BLOCK_ANCHORS: Record<BlockType, string[]> = {
  CUMULATIVE: ['Cumulative start', 'Cumulative end', 'Cumulative', 'Acumulado início', 'Acumulado fim', 'Acumulado'],
  DAY: ['Day start', 'Day end', 'Day', 'Dia início', 'Dia fim', 'Dia'],
  AVERAGE: ['Avg', 'Average', 'Mean', 'Média', 'Médio'],
  UNKNOWN: []
};

/**
 * Mapeamento de variáveis raw para códigos padronizados
 */
const VARIABLE_MAPPING: Record<string, { code: string; unit: string; description: string }> = {
  // Volume
  'gross volume': { code: 'gross_volume_m3', unit: 'm³', description: 'Volume bruto' },
  'gross standard volume': { code: 'gross_std_volume_sm3', unit: 'Sm³', description: 'Volume bruto padrão' },
  'standard volume': { code: 'std_volume_sm3', unit: 'Sm³', description: 'Volume padrão' },
  'net standard volume': { code: 'net_std_volume_sm3', unit: 'Sm³', description: 'Volume líquido padrão' },
  
  // Massa
  'mass': { code: 'mass_t', unit: 't', description: 'Massa' },
  'oil mass': { code: 'oil_mass_t', unit: 't', description: 'Massa de óleo' },
  'gas mass': { code: 'gas_mass_t', unit: 't', description: 'Massa de gás' },
  'water mass': { code: 'water_mass_t', unit: 't', description: 'Massa de água' },
  'hc mass': { code: 'hc_mass_t', unit: 't', description: 'Massa de HC' },
  'total mass': { code: 'total_mass_t', unit: 't', description: 'Massa total' },
  
  // MPFM específico
  'mpfm uncorrected mass': { code: 'mpfm_uncorr_mass_t', unit: 't', description: 'Massa não corrigida MPFM' },
  'mpfm corrected mass': { code: 'mpfm_corr_mass_t', unit: 't', description: 'Massa corrigida MPFM' },
  'pvt reference mass': { code: 'pvt_ref_mass_t', unit: 't', description: 'Massa referência PVT' },
  'pvt reference volume': { code: 'pvt_ref_vol_sm3', unit: 'Sm³', description: 'Volume referência PVT' },
  
  // Energia
  'energy': { code: 'energy_gj', unit: 'GJ', description: 'Energia' },
  'heating value': { code: 'heating_value_mj_sm3', unit: 'MJ/Sm³', description: 'Poder calorífico' },
  
  // Tempo e condições
  'flow time': { code: 'flow_time_min', unit: 'min', description: 'Tempo de fluxo' },
  'pressure': { code: 'pressure_kpag', unit: 'kPa g', description: 'Pressão' },
  'temperature': { code: 'temperature_c', unit: '°C', description: 'Temperatura' },
  'differential pressure': { code: 'dp_kpa', unit: 'kPa', description: 'Pressão diferencial' },
  
  // Densidade
  'line density': { code: 'line_density_kg_m3', unit: 'kg/m³', description: 'Densidade de linha' },
  'standard density': { code: 'std_density_kg_sm3', unit: 'kg/Sm³', description: 'Densidade padrão' },
  'density': { code: 'density_kg_m3', unit: 'kg/m³', description: 'Densidade' },
  
  // Fatores
  'k-factor': { code: 'k_factor', unit: '', description: 'K-Factor' },
  'meter factor': { code: 'meter_factor', unit: '', description: 'Meter Factor' },
  'ctl': { code: 'ctl', unit: '', description: 'Correção de temperatura' },
  'cpl': { code: 'cpl', unit: '', description: 'Correção de pressão' },
  'ctpl': { code: 'ctpl', unit: '', description: 'Correção combinada' },
  
  // BSW
  'bs&w': { code: 'bsw_pct', unit: '%', description: 'BSW' },
  'bsw': { code: 'bsw_pct', unit: '%', description: 'BSW' },
  'bs&w analyzer': { code: 'bsw_pct', unit: '%', description: 'BSW' }
};

/**
 * Padrões para identificar seções por asset
 */
const SECTION_PATTERNS: Record<string, { regex: RegExp; assetTag: string; fluidType: 'OIL' | 'GAS' | 'WATER' }> = {
  'TOPSIDE_P5': { regex: /riser\s*p5|topside.*p5|b03.*p5/i, assetTag: 'RISER_P5', fluidType: 'OIL' },
  'TOPSIDE_P6': { regex: /riser\s*p6|topside.*p6|b03.*p6/i, assetTag: 'RISER_P6', fluidType: 'OIL' },
  'SUBSEA_PE4': { regex: /pe[_\s]*4|subsea.*pe4/i, assetTag: 'PE_4', fluidType: 'OIL' },
  'SUBSEA_PE_EO': { regex: /pe[_\s]*eo|subsea.*eo/i, assetTag: 'PE_EO', fluidType: 'OIL' },
  'SEPARATOR': { regex: /test\s*separator|sep[_\s]*test/i, assetTag: 'TEST_SEP', fluidType: 'OIL' },
  'GAS_EXPORT': { regex: /gas\s*export|export\s*gas/i, assetTag: 'GAS_EXPORT', fluidType: 'GAS' },
  'GAS_LIFT': { regex: /gas\s*lift|lift\s*gas/i, assetTag: 'GAS_LIFT', fluidType: 'GAS' },
  'GAS_FUEL': { regex: /gas\s*fuel|fuel\s*gas/i, assetTag: 'GAS_FUEL', fluidType: 'GAS' },
  'GAS_FLARE': { regex: /flare|queima/i, assetTag: 'GAS_FLARE', fluidType: 'GAS' }
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Normaliza texto para comparação
 */
function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Detecta tipo de bloco baseado em texto âncora
 */
function detectBlockType(text: string): BlockType {
  const normalized = normalizeText(text);
  
  for (const [blockType, anchors] of Object.entries(BLOCK_ANCHORS)) {
    for (const anchor of anchors) {
      if (normalized.includes(normalizeText(anchor))) {
        return blockType as BlockType;
      }
    }
  }
  
  return 'UNKNOWN';
}

/**
 * Mapeia variável raw para código padronizado
 */
function mapVariable(rawName: string): { code: string; unit: string } | null {
  const normalized = normalizeText(rawName);
  
  // Busca exata primeiro
  if (VARIABLE_MAPPING[normalized]) {
    return {
      code: VARIABLE_MAPPING[normalized].code,
      unit: VARIABLE_MAPPING[normalized].unit
    };
  }
  
  // Busca parcial
  for (const [key, value] of Object.entries(VARIABLE_MAPPING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { code: value.code, unit: value.unit };
    }
  }
  
  return null;
}

/**
 * Detecta seção/asset baseado em texto
 */
function detectSection(text: string): { sectionName: string; assetTag: string; fluidType: 'OIL' | 'GAS' | 'WATER' } | null {
  for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.regex.test(text)) {
      return {
        sectionName,
        assetTag: pattern.assetTag,
        fluidType: pattern.fluidType
      };
    }
  }
  return null;
}

/**
 * Converte referência de célula (A1) para índices (row, col)
 * Exportada para uso em outros módulos
 */
export function cellToIndices(cell: string): { row: number; col: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { row: 0, col: 0 };
  
  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2], 10) - 1;
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1;
  
  return { row, col };
}

/**
 * Converte índices para referência de célula
 */
function indicesToCell(row: number, col: number): string {
  let colStr = '';
  let c = col + 1;
  while (c > 0) {
    const remainder = (c - 1) % 26;
    colStr = String.fromCharCode(65 + remainder) + colStr;
    c = Math.floor((c - 1) / 26);
  }
  return `${colStr}${row + 1}`;
}

/**
 * Extrai valor numérico de célula
 */
function extractNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === 'string') {
    // Remove espaços e substitui vírgula por ponto
    const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

/**
 * Detecta data do relatório
 */
function detectReportDate(worksheet: XLSX.WorkSheet): string | null {
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(\d{4})/i
  ];
  
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z50');
  
  // Procura nas primeiras 20 linhas
  for (let row = 0; row <= Math.min(20, range.e.r); row++) {
    for (let col = 0; col <= Math.min(10, range.e.c); col++) {
      const cell = worksheet[indicesToCell(row, col)];
      if (!cell) continue;
      
      const value = cell.v?.toString() || '';
      
      // Tenta cada padrão
      for (const pattern of datePatterns) {
        const match = value.match(pattern);
        if (match) {
          // Tenta formatar como ISO
          try {
            let date: Date;
            if (match[3] && match[3].length === 4) {
              // DD/MM/YYYY ou DD Month YYYY
              date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
            } else if (match[1] && match[1].length === 4) {
              // YYYY-MM-DD
              date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            } else {
              continue;
            }
            
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch {
            continue;
          }
        }
      }
      
      // Verifica se é um número de série do Excel
      if (typeof cell.v === 'number' && cell.v > 40000 && cell.v < 60000) {
        const date = XLSX.SSF.parse_date_code(cell.v);
        if (date) {
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
      }
    }
  }
  
  return null;
}

/**
 * Detecta instalação
 */
function detectInstallation(worksheet: XLSX.WorkSheet): string | null {
  const installationPatterns = [
    /FPSO\s+([A-Za-z]+)/i,
    /instalação[:\s]*([A-Za-z0-9\s]+)/i,
    /installation[:\s]*([A-Za-z0-9\s]+)/i,
    /platform[:\s]*([A-Za-z0-9\s]+)/i
  ];
  
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z20');
  
  for (let row = 0; row <= Math.min(10, range.e.r); row++) {
    for (let col = 0; col <= Math.min(10, range.e.c); col++) {
      const cell = worksheet[indicesToCell(row, col)];
      if (!cell) continue;
      
      const value = cell.v?.toString() || '';
      
      for (const pattern of installationPatterns) {
        const match = value.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }
  }
  
  return null;
}

// ============================================================================
// FUNÇÃO PRINCIPAL: EXTRAÇÃO POR ÂNCORAS
// ============================================================================

/**
 * Encontra todas as âncoras de bloco na planilha
 */
function findBlockAnchors(worksheet: XLSX.WorkSheet): Array<{ cell: string; row: number; col: number; text: string; blockType: BlockType }> {
  const anchors: Array<{ cell: string; row: number; col: number; text: string; blockType: BlockType }> = [];
  
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
  
  for (let row = 0; row <= range.e.r; row++) {
    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = indicesToCell(row, col);
      const cell = worksheet[cellRef];
      if (!cell) continue;
      
      const text = cell.v?.toString() || '';
      const blockType = detectBlockType(text);
      
      if (blockType !== 'UNKNOWN') {
        anchors.push({
          cell: cellRef,
          row,
          col,
          text,
          blockType
        });
      }
    }
  }
  
  return anchors;
}

/**
 * Extrai variáveis de um bloco
 */
function extractBlockVariables(
  worksheet: XLSX.WorkSheet,
  anchor: { cell: string; row: number; col: number; text: string; blockType: BlockType },
  nextAnchorRow: number | null
): ExtractedVariable[] {
  const variables: ExtractedVariable[] = [];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
  
  // Encontra a coluna de valores (geralmente é a próxima ou +2)
  const valueCol = anchor.col + 1;
  
  // Define o range de linhas para o bloco
  const startRow = anchor.row + 1;
  const endRow = nextAnchorRow ? nextAnchorRow - 1 : Math.min(anchor.row + 30, range.e.r);
  
  for (let row = startRow; row <= endRow; row++) {
    // Coluna do nome da variável (mesma coluna da âncora ou anterior)
    const nameCellRef = indicesToCell(row, anchor.col);
    const nameCell = worksheet[nameCellRef];
    if (!nameCell) continue;
    
    const varName = nameCell.v?.toString() || '';
    if (!varName.trim()) continue;
    
    // Pula cabeçalhos e linhas vazias
    const normalizedName = normalizeText(varName);
    if (['unit', 'units', 'unidade', 'valor', 'value'].includes(normalizedName)) {
      continue;
    }
    
    // Extrai o valor
    const valueCellRef = indicesToCell(row, valueCol);
    const valueCell = worksheet[valueCellRef];
    const numericValue = extractNumericValue(valueCell?.v);
    
    // Mapeia para código padronizado
    const mapping = mapVariable(varName);
    
    const qualityFlags: string[] = [];
    if (numericValue === null) {
      qualityFlags.push('MISSING_VALUE');
    }
    if (!mapping) {
      qualityFlags.push('UNMAPPED_VARIABLE');
    }
    
    variables.push({
      variableRaw: varName.trim(),
      variableCode: mapping?.code || `raw_${normalizedName.replace(/\s+/g, '_')}`,
      value: numericValue,
      unit: mapping?.unit || '',
      blockType: anchor.blockType,
      sourceCell: valueCellRef,
      qualityFlags
    });
  }
  
  return variables;
}

/**
 * Agrupa blocos em seções
 */
function groupBlocksIntoSections(
  worksheet: XLSX.WorkSheet,
  blocks: ExtractedBlock[]
): ExcelSection[] {
  const sections: ExcelSection[] = [];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
  
  // Busca cabeçalhos de seção
  const sectionHeaders: Array<{ row: number; section: { sectionName: string; assetTag: string; fluidType: 'OIL' | 'GAS' | 'WATER' } }> = [];
  
  for (let row = 0; row <= range.e.r; row++) {
    for (let col = 0; col <= Math.min(5, range.e.c); col++) {
      const cell = worksheet[indicesToCell(row, col)];
      if (!cell) continue;
      
      const text = cell.v?.toString() || '';
      const section = detectSection(text);
      
      if (section) {
        sectionHeaders.push({ row, section });
      }
    }
  }
  
  if (sectionHeaders.length === 0) {
    // Se não encontrou seções, agrupa tudo em uma seção padrão
    sections.push({
      sectionName: 'DEFAULT',
      assetTag: 'UNKNOWN',
      fluidType: 'OIL',
      blocks
    });
  } else {
    // Agrupa blocos por seção
    for (let i = 0; i < sectionHeaders.length; i++) {
      const header = sectionHeaders[i];
      const nextHeader = sectionHeaders[i + 1];
      
      const sectionBlocks = blocks.filter(block => {
        const afterCurrent = block.startRow >= header.row;
        const beforeNext = nextHeader ? block.startRow < nextHeader.row : true;
        return afterCurrent && beforeNext;
      });
      
      if (sectionBlocks.length > 0) {
        sections.push({
          sectionName: header.section.sectionName,
          assetTag: header.section.assetTag,
          fluidType: header.section.fluidType,
          blocks: sectionBlocks
        });
      }
    }
  }
  
  return sections;
}

// ============================================================================
// API PÚBLICA
// ============================================================================

/**
 * Parseia arquivo Excel usando extração por âncoras
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const result: ExcelParseResult = {
    success: false,
    fileName: file.name,
    sourceType: 'EXCEL_DAILY',
    reportDate: null,
    installation: null,
    sections: [],
    rawData: {},
    warnings: [],
    errors: []
  };
  
  try {
    // Lê o arquivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    // Processa primeira planilha (ou planilha específica se existir)
    const sheetNames = workbook.SheetNames;
    let targetSheet = sheetNames[0];
    
    // Procura por planilha com nome específico
    const preferredSheets = ['Daily', 'Diário', 'Production', 'Produção', 'Data', 'Dados'];
    for (const preferred of preferredSheets) {
      const found = sheetNames.find(name => 
        normalizeText(name).includes(normalizeText(preferred))
      );
      if (found) {
        targetSheet = found;
        break;
      }
    }
    
    const worksheet = workbook.Sheets[targetSheet];
    
    // Detecta metadados
    result.reportDate = detectReportDate(worksheet);
    result.installation = detectInstallation(worksheet);
    
    // Detecta tipo de fonte
    const fileName = file.name.toUpperCase();
    if (fileName.includes('TOPSIDE') || fileName.includes('B03')) {
      result.sourceType = 'EXCEL_TOPSIDE';
    } else if (fileName.includes('SUBSEA') || fileName.includes('B05')) {
      result.sourceType = 'EXCEL_SUBSEA';
    } else if (fileName.includes('SEP') || fileName.includes('SEPARATOR')) {
      result.sourceType = 'EXCEL_SEPARATOR';
    }
    
    // Encontra âncoras de bloco
    const anchors = findBlockAnchors(worksheet);
    
    if (anchors.length === 0) {
      result.warnings.push('Nenhuma âncora de bloco encontrada. Usando extração genérica.');
      // Fallback para extração genérica
      result.rawData = extractGenericData(worksheet);
    }
    
    // Extrai blocos
    const blocks: ExtractedBlock[] = [];
    
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const nextAnchorRow = anchors[i + 1]?.row || null;
      
      const variables = extractBlockVariables(worksheet, anchor, nextAnchorRow);
      
      if (variables.length > 0) {
        blocks.push({
          blockType: anchor.blockType,
          anchorCell: anchor.cell,
          anchorText: anchor.text,
          variables,
          startRow: anchor.row,
          endRow: nextAnchorRow ? nextAnchorRow - 1 : anchor.row + variables.length
        });
      }
    }
    
    // Agrupa em seções
    result.sections = groupBlocksIntoSections(worksheet, blocks);
    
    // Valida resultado
    const totalVariables = result.sections.reduce(
      (sum, section) => sum + section.blocks.reduce(
        (blockSum, block) => blockSum + block.variables.length, 0
      ), 0
    );
    
    if (totalVariables === 0) {
      result.errors.push('Nenhuma variável extraída do arquivo.');
    } else {
      result.success = true;
      
      // Verifica qualidade
      const missingCount = result.sections.reduce(
        (sum, section) => sum + section.blocks.reduce(
          (blockSum, block) => blockSum + block.variables.filter(
            v => v.qualityFlags.includes('MISSING_VALUE')
          ).length, 0
        ), 0
      );
      
      if (missingCount > 0) {
        result.warnings.push(`${missingCount} variáveis com valores faltantes.`);
      }
    }
    
  } catch (error) {
    result.errors.push(`Erro ao processar arquivo: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return result;
}

/**
 * Extração genérica (fallback quando não encontra âncoras)
 */
function extractGenericData(worksheet: XLSX.WorkSheet): Record<string, Record<string, number | string | null>> {
  const data: Record<string, Record<string, number | string | null>> = {};
  
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
  
  // Encontra cabeçalhos (primeira linha com conteúdo)
  let headerRow = 0;
  const headers: string[] = [];
  
  for (let col = 0; col <= range.e.c; col++) {
    const cell = worksheet[indicesToCell(headerRow, col)];
    headers.push(cell?.v?.toString() || `Col${col}`);
  }
  
  // Extrai dados
  for (let row = headerRow + 1; row <= range.e.r; row++) {
    const rowKey = `row_${row}`;
    data[rowKey] = {};
    
    for (let col = 0; col <= range.e.c; col++) {
      const header = headers[col] || `Col${col}`;
      const cell = worksheet[indicesToCell(row, col)];
      
      if (cell) {
        const numValue = extractNumericValue(cell.v);
        data[rowKey][header] = numValue !== null ? numValue : cell.v?.toString() || null;
      }
    }
  }
  
  return data;
}

/**
 * Extrai valores de um bloco específico (Day, Cumulative, etc.)
 */
export function getBlockValues(
  result: ExcelParseResult,
  blockType: BlockType,
  assetTag?: string
): Record<string, number | null> {
  const values: Record<string, number | null> = {};
  
  for (const section of result.sections) {
    if (assetTag && section.assetTag !== assetTag) continue;
    
    for (const block of section.blocks) {
      if (block.blockType !== blockType) continue;
      
      for (const variable of block.variables) {
        values[variable.variableCode] = variable.value;
      }
    }
  }
  
  return values;
}

/**
 * Extrai dados diários (Day block) para uso no RegistroDiario
 */
export function extractDailyData(result: ExcelParseResult): {
  oil: number | null;
  gas: number | null;
  water: number | null;
  hc: number | null;
  total: number | null;
  bsw: number | null;
} {
  const dayValues = getBlockValues(result, 'DAY');
  
  return {
    oil: dayValues['oil_mass_t'] ?? dayValues['pvt_ref_mass_t'] ?? null,
    gas: dayValues['gas_mass_t'] ?? null,
    water: dayValues['water_mass_t'] ?? null,
    hc: dayValues['hc_mass_t'] ?? null,
    total: dayValues['total_mass_t'] ?? null,
    bsw: dayValues['bsw_pct'] ?? null
  };
}

/**
 * Exporta para formato usado pelo store
 */
export function toMonitoringData(result: ExcelParseResult, source: 'topside' | 'subsea' | 'separator'): {
  date: string;
  source: string;
  oil: number;
  gas: number;
  water: number;
  hc: number;
  total: number;
} | null {
  if (!result.success || !result.reportDate) {
    return null;
  }
  
  const dailyData = extractDailyData(result);
  
  if (dailyData.oil === null && dailyData.hc === null) {
    return null;
  }
  
  return {
    date: result.reportDate,
    source: source.toUpperCase(),
    oil: dailyData.oil ?? 0,
    gas: dailyData.gas ?? 0,
    water: dailyData.water ?? 0,
    hc: dailyData.hc ?? (dailyData.oil ?? 0) + (dailyData.gas ?? 0),
    total: dailyData.total ?? (dailyData.oil ?? 0) + (dailyData.gas ?? 0) + (dailyData.water ?? 0)
  };
}
