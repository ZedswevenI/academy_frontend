import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  label: string;
  masked?: boolean;
}

export interface ExportRow {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ReportExportService {

  // ── Color helper ───────────────────────────────────────────────────────────
  rgb(r: number, g: number, b: number): [number, number, number] {
    return [r, g, b];
  }

  // ── Excel ──────────────────────────────────────────────────────────────────
  newWorkbook(): XLSX.WorkBook {
    return XLSX.utils.book_new();
  }

  /**
   * Append a sheet of flat rows to a workbook
   */
  appendSheet(
    wb: XLSX.WorkBook,
    columns: ExportColumn[],
    rows: ExportRow[],
    sheetName: string,
    revealedColumns: Set<string> = new Set(),
    maskFn?: (val: string) => string
  ): void {
    const headers = columns.map(c => c.label);
    const keys = columns.map(c => c.key);
    const data = rows.map(row =>
      keys.reduce((obj: any, key, idx) => {
        const col = columns[idx];
        let val = row[key];
        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
        if (col?.masked && val && !revealedColumns.has(key) && maskFn) {
          obj[headers[idx]] = maskFn(String(val));
        } else {
          obj[headers[idx]] = val ?? '';
        }
        return obj;
      }, {})
    );
    const safeSheetName = sheetName.substring(0, 31).replace(/[:\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), safeSheetName);
  }

  /**
   * Append a sheet grouped by a key — one sheet per group
   */
  appendSheetsByGroup(
    wb: XLSX.WorkBook,
    columns: ExportColumn[],
    rows: ExportRow[],
    groupKey: string,
    groupLabelKey?: string
  ): void {
    const groups = new Map<string, ExportRow[]>();
    for (const row of rows) {
      const gc = row[groupKey] || 'Unknown';
      if (!groups.has(gc)) groups.set(gc, []);
      groups.get(gc)!.push(row);
    }
    for (const [gc, groupRows] of groups.entries()) {
      const batchName = groupLabelKey ? (groupRows[0]?.[groupLabelKey] || '') : '';
      const headers = columns.map(c => c.label);
      const keys = columns.map(c => c.key);

      // Header rows with batch info
      const headerRow1: any = {};
      const headerRow2: any = {};
      headers.forEach(h => { headerRow1[h] = ''; headerRow2[h] = ''; });
      headerRow1[headers[0]] = `Batch Code: ${gc}`;
      if (batchName) headerRow2[headers[0]] = `Batch Name: ${batchName}`;

      const dataRows = groupRows.map(row =>
        keys.reduce((obj: any, key, idx) => {
          obj[headers[idx]] = row[key] ?? '';
          return obj;
        }, {})
      );

      const sheetRows = batchName
        ? [headerRow1, headerRow2, {}, ...dataRows]
        : [headerRow1, {}, ...dataRows];

      const safeSheetName = gc.substring(0, 31).replace(/[:\\/?*[\]]/g, '_');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows), safeSheetName);
    }
  }

  /**
   * Append a sheet with section headers (for faculty report pattern)
   */
  appendSectionedSheet(
    wb: XLSX.WorkBook,
    sheetName: string,
    sections: {
      title: string;
      count?: number;
      totalHours?: string | null;
      columns: ExportColumn[];
      rows: ExportRow[];
    }[]
  ): void {
    const sheetData: any[] = [];
    const addHeader = (text: string) => sheetData.push({ Section: text });
    const addEmpty = () => sheetData.push({});

    for (const section of sections) {
      if (!section.rows?.length) continue;
      const countStr = section.count !== undefined ? ` (${section.count}${section.totalHours ? ' | ' + section.totalHours : ''})` : '';
      addHeader(`${section.title}${countStr}`);
      // Column headers row
      const headerRow: any = {};
      section.columns.forEach(c => headerRow[c.label] = c.label);
      sheetData.push(headerRow);
      // Data rows
      section.rows.forEach(row => {
        const r: any = {};
        section.columns.forEach(c => { r[c.label] = row[c.key] ?? ''; });
        sheetData.push(r);
      });
      addEmpty();
    }

    const safeSheetName = sheetName.substring(0, 31).replace(/[:\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData, { skipHeader: true }), safeSheetName);
  }

  writeFile(wb: XLSX.WorkBook, filename: string): void {
    XLSX.writeFile(wb, filename);
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  newPdf(orientation: 'portrait' | 'landscape' = 'landscape'): jsPDF {
    return new jsPDF({ orientation });
  }

  /**
   * Add a standard report title + metadata header
   */
  addPdfHeader(
    doc: jsPDF,
    title: string,
    meta: { label: string; value: string }[] = [],
    startY = 14
  ): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, startY, { align: 'center' });
    startY += 8;
    if (meta.length) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (const m of meta) {
        doc.text(`${m.label}: ${m.value}`, 14, startY);
        startY += 5;
      }
    }
    return startY + 2;
  }

  /**
   * Add a colored section heading
   */
  addSectionHeading(
    doc: jsPDF,
    text: string,
    y: number,
    color: [number, number, number] = [30, 64, 175]
  ): number {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, 14, y);
    doc.setTextColor(0, 0, 0);
    return y + 5;
  }

  /**
   * Add an autoTable and return updated Y position
   */
  addTable(
    doc: jsPDF,
    columns: ExportColumn[],
    rows: ExportRow[],
    startY: number,
    headColor: [number, number, number] = [59, 130, 246],
    altColor: [number, number, number] = [249, 250, 251],
    didParseCell?: (data: any) => void
  ): number {
    const headers = columns.map(c => c.label);
    const keys = columns.map(c => c.key);
    const tableRows = rows.map(row =>
      keys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '-';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val);
      })
    );

    const options: any = {
      head: [headers],
      body: tableRows,
      startY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: headColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: altColor }
    };
    if (didParseCell) options.didParseCell = didParseCell;

    autoTable(doc, options);
    return (doc as any).lastAutoTable.finalY + 6;
  }

  /**
   * Add a remarks box + signature line
   */
  addRemarksAndSignature(doc: jsPDF, startY: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    if (startY > 160) { doc.addPage(); startY = 14; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Remarks/Explanation:', 14, startY);
    startY += 4;
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, startY, pageWidth - 40, 40, 2, 2, 'FD');
    startY += 50;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(55, 65, 81);
    doc.line(pageWidth - 80, startY, pageWidth - 14, startY);
    doc.text('Faculty Signature With Date', pageWidth - 47, startY + 6, { align: 'center' });
    return startY + 12;
  }

  /**
   * Check if new page needed, add if so
   */
  checkNewPage(doc: jsPDF, currentY: number, threshold = 170): number {
    if (currentY > threshold) {
      doc.addPage();
      return 14;
    }
    return currentY;
  }

  savePdf(doc: jsPDF, filename: string): void {
    doc.save(filename);
  }
}