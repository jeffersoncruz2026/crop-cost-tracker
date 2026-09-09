// Minimal, dependency-free .xlsx reader: unzips the workbook (raw DEFLATE via the
// browser's native DecompressionStream) and parses the OOXML spreadsheet parts by hand.
// Good enough for reading simple single/multi-sheet tabular exports — not a full parser.

type ZipEntry = { method: number; compSize: number; localHeaderOffset: number };

export type CelulaPlanilha = string | number | boolean | null;
export type LinhaPlanilha = Record<string, CelulaPlanilha>;
export type PlanilhaLida = { cabecalhos: string[]; linhas: LinhaPlanilha[] };

function lerEntradasZip(bytes: Uint8Array): { dv: DataView; entries: Map<string, ZipEntry> } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Arquivo inválido: não parece ser um .xlsx.");

  const cdCount = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  const entries = new Map<string, ZipEntry>();
  let p = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) {
      throw new Error("Arquivo .xlsx corrompido (diretório central inválido).");
    }
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localHeaderOffset = dv.getUint32(p + 42, true);
    const nameStart = p + 46;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen));
    entries.set(name, { method, compSize, localHeaderOffset });
    p = nameStart + nameLen + extraLen + commentLen;
  }
  return { dv, entries };
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function lerEntradaZip(
  bytes: Uint8Array,
  dv: DataView,
  entry: ZipEntry,
): Promise<Uint8Array> {
  const p = entry.localHeaderOffset;
  if (dv.getUint32(p, true) !== 0x04034b50) {
    throw new Error("Arquivo .xlsx corrompido (cabeçalho local inválido).");
  }
  const nameLen = dv.getUint16(p + 26, true);
  const extraLen = dv.getUint16(p + 28, true);
  const dataStart = p + 30 + nameLen + extraLen;
  const raw = bytes.subarray(dataStart, dataStart + entry.compSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return inflateRaw(raw);
  throw new Error(`Método de compactação não suportado (${entry.method}).`);
}

function decodificarEntidadesXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function analisarStringsCompartilhadas(xml: string): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const SI_RE = /<si>([\s\S]*?)<\/si>|<si\/>/g;
  let m: RegExpExecArray | null;
  while ((m = SI_RE.exec(xml))) {
    const inner = m[1] ?? "";
    let text = "";
    const T_RE = /<t[^>]*>([\s\S]*?)<\/t>|<t[^>]*\/>/g;
    let tm: RegExpExecArray | null;
    while ((tm = T_RE.exec(inner))) {
      text += decodificarEntidadesXml(tm[1] ?? "");
    }
    out.push(text);
  }
  return out;
}

function letraColunaParaIndice(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel's day-1 epoch is 1899-12-30 (it treats 1900 as a leap year, a legacy bug). */
export function serialExcelParaIso(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400000);
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function analisarLinhasPlanilha(xml: string, sharedStrings: string[]): CelulaPlanilha[][] {
  const bodyMatch = /<sheetData>([\s\S]*?)<\/sheetData>/.exec(xml);
  const body = bodyMatch?.[1] ?? "";
  const ROW_RE = /<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g;
  const CELL_RE = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  const ATTR_RE = /(\w+)="([^"]*)"/g;

  const grid: CelulaPlanilha[][] = [];
  let rm: RegExpExecArray | null;
  while ((rm = ROW_RE.exec(body))) {
    const rowInner = rm[1] ?? "";
    const cells: CelulaPlanilha[] = [];
    CELL_RE.lastIndex = 0;
    let cm: RegExpExecArray | null;
    while ((cm = CELL_RE.exec(rowInner))) {
      const attrsStr = cm[1] ?? "";
      const content = cm[2] ?? "";
      const attrs: Record<string, string> = {};
      ATTR_RE.lastIndex = 0;
      let am: RegExpExecArray | null;
      while ((am = ATTR_RE.exec(attrsStr))) attrs[am[1] as string] = am[2] as string;
      const ref = attrs["r"] ?? "";
      const type = attrs["t"] ?? "n";
      const colIdx = ref ? letraColunaParaIndice(ref) : cells.length;

      let value: CelulaPlanilha = null;
      if (type === "inlineStr") {
        const isMatch = /<is>([\s\S]*?)<\/is>/.exec(content);
        const t = isMatch ? /<t[^>]*>([\s\S]*?)<\/t>/.exec(isMatch[1] ?? "") : null;
        value = t ? decodificarEntidadesXml(t[1] ?? "") : "";
      } else {
        const vMatch = /<v>([\s\S]*?)<\/v>/.exec(content);
        const raw = vMatch ? (vMatch[1] ?? "") : null;
        if (raw === null) {
          value = null;
        } else if (type === "s") {
          value = sharedStrings[Number(raw)] ?? "";
        } else if (type === "str") {
          value = decodificarEntidadesXml(raw);
        } else if (type === "b") {
          value = raw === "1";
        } else {
          value = Number(raw);
        }
      }
      cells[colIdx] = value;
    }
    grid.push(cells);
  }
  return grid;
}

/** Reads the first sheet of a .xlsx file into headers + row objects (header -> cell value). */
export async function lerPlanilhaXlsx(arquivo: File): Promise<PlanilhaLida> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const { dv, entries } = lerEntradasZip(bytes);
  const decoder = new TextDecoder();

  const workbookEntry = entries.get("xl/workbook.xml");
  const relsEntry = entries.get("xl/_rels/workbook.xml.rels");
  if (!workbookEntry || !relsEntry) throw new Error("Arquivo .xlsx sem xl/workbook.xml.");

  const workbookXml = decoder.decode(await lerEntradaZip(bytes, dv, workbookEntry));
  const relsXml = decoder.decode(await lerEntradaZip(bytes, dv, relsEntry));

  const sheetsBlock = /<sheets>([\s\S]*?)<\/sheets>/.exec(workbookXml)?.[1] ?? "";
  const firstSheetTag = /<sheet\b[^>]*\/>/.exec(sheetsBlock)?.[0];
  const rid = firstSheetTag ? /r:id="([^"]+)"/.exec(firstSheetTag)?.[1] : undefined;
  if (!rid) throw new Error("Não foi possível localizar a primeira planilha no arquivo.");

  const relTarget = new RegExp(`<Relationship Id="${rid}"[^>]*Target="([^"]+)"`).exec(relsXml)?.[1];
  if (!relTarget) throw new Error("Não foi possível resolver o caminho da planilha.");
  const sheetPath = relTarget.startsWith("/") ? relTarget.slice(1) : `xl/${relTarget}`;

  const sheetEntry = entries.get(sheetPath);
  if (!sheetEntry) throw new Error(`Planilha ${sheetPath} não encontrada no arquivo.`);
  const sheetXml = decoder.decode(await lerEntradaZip(bytes, dv, sheetEntry));

  const sharedStringsEntry = entries.get("xl/sharedStrings.xml");
  const sharedStringsXml = sharedStringsEntry
    ? decoder.decode(await lerEntradaZip(bytes, dv, sharedStringsEntry))
    : "";
  const sharedStrings = analisarStringsCompartilhadas(sharedStringsXml);

  const grid = analisarLinhasPlanilha(sheetXml, sharedStrings);
  if (grid.length === 0) return { cabecalhos: [], linhas: [] };

  const cabecalhos = (grid[0] ?? []).map((h) => String(h ?? "").trim());
  const dateColIdx = cabecalhos.findIndex((h) => h.toUpperCase() === "DATA");

  const linhas: LinhaPlanilha[] = [];
  for (const cells of grid.slice(1)) {
    const linha: LinhaPlanilha = {};
    let temValor = false;
    cabecalhos.forEach((cab, i) => {
      if (!cab) return;
      let v = cells[i] ?? null;
      if (i === dateColIdx && typeof v === "number") v = serialExcelParaIso(v);
      if (v !== null && v !== "") temValor = true;
      linha[cab] = v;
    });
    if (temValor) linhas.push(linha);
  }

  return { cabecalhos, linhas };
}
