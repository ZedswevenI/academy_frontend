// invigilation-print.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared print service — injected into BOTH InvigilationListComponent
// and InvigilationViewComponent so both call the SAME print method.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class InvigilationPrintService {

  /**
   * Open a print window for all sessions of a given day.
   * Called identically from InvigilationListComponent.print()
   * and InvigilationViewComponent.print().
   *
   * dayData = response from GET /invigilation/by-date/:date
   * { date, dateFormatted, day, sessions[] }
   */
  print(dayData: any): void {
    const html = this.buildHtml(dayData);
    const win  = window.open('', '_blank', 'width=960,height=700');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups and try again.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  // ── Build full HTML ────────────────────────────────────────────────────────
  private buildHtml(day: any): string {
    const order: any = { MORNING: 1, AFTERNOON: 2, EVENING: 3 };
    const sessions   = [...(day.sessions || [])].sort(
      (a, b) => (order[a.session] || 9) - (order[b.session] || 9)
    );
    const blocks = sessions.map(s => this.buildSessionBlock(s, day)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invigilation – ${day.dateFormatted}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; font-size:13px; color:#000; background:#fff; padding:18px; }
    .page-title { text-align:center; font-size:15px; font-weight:bold; margin-bottom:20px; text-transform:uppercase; letter-spacing:1px; }
    .session-block { margin-bottom:28px; page-break-inside:avoid; }
    .inv-table { width:100%; border-collapse:collapse; border:2px solid #2d6a2d; }
    .header-row td { background:#2e6b2e; color:#fff; font-weight:bold; font-size:13px; padding:10px 12px; text-align:center; border:1px solid #1a4d1a; vertical-align:middle; }
    .sub-header td { background:#c47a1e; color:#fff; font-weight:bold; font-size:12px; padding:8px 10px; text-align:center; border:1px solid #a36217; }
    .data-row td { padding:7px 10px; text-align:center; border:1px solid #ccc; font-size:13px; }
    .data-row:nth-child(even) td { background:#fafafa; }
    @media print { body { padding:8px; } @page { size:A4 landscape; margin:1cm; } }
  </style>
</head>
<body>
  <div class="page-title">Invigilation Duty — ${day.dateFormatted} (${day.day})</div>
  ${blocks}
</body>
</html>`;
  }

  private buildSessionBlock(session: any, day: any): string {
    const sessionLabel  = this.sessionLabel(session.session, day.day);
    const examTime      = this.fmtRange(session.examStartTime, session.examEndTime);
    const slot1Time     = this.fmtRange(session.slot1StartTime, session.slot1EndTime);
    const slot2Time     = this.fmtRange(session.slot2StartTime, session.slot2EndTime);

    const dataRows = (session.rooms || []).map((r: any, i: number) => `
      <tr class="data-row">
        <td>${i + 1}</td>
        <td>${r.roomNo || '–'}</td>
        <td>${r.slot1StaffName || r.slot1StaffCode || '–'}</td>
        <td>${r.slot2StaffName || r.slot2StaffCode || '–'}</td>
      </tr>`).join('');

    const emptyRow = !session.rooms?.length
      ? `<tr class="data-row"><td colspan="4" style="text-align:center;color:#888;padding:14px">No rooms assigned</td></tr>`
      : '';

    return `
<div class="session-block">
  <table class="inv-table">
    <tr class="header-row">
      <td colspan="2">DATE: ${day.dateFormatted}<br>${sessionLabel}</td>
      <td>EXAM &nbsp;–&nbsp; ${session.examName}</td>
      <td>EXAM TIME.<br>${examTime}</td>
    </tr>
    <tr class="sub-header">
      <td>S. NO</td>
      <td>ROOM NO</td>
      <td>FACULTY NAME${slot1Time ? '<br><span style="font-weight:normal;font-size:11px">(' + slot1Time + ')</span>' : ''}</td>
      <td>FACULTY NAME${slot2Time ? '<br><span style="font-weight:normal;font-size:11px">(' + slot2Time + ')</span>' : ''}</td>
    </tr>
    ${dataRows}${emptyRow}
  </table>
</div>`;
  }

  private sessionLabel(session: string, day: string): string {
    if (session === 'MORNING')   return `${day} (Morning)`;
    if (session === 'AFTERNOON') return `${day} (A|N)`;
    if (session === 'EVENING')   return `${day} (Evening)`;
    return day;
  }

  private fmtRange(start: string | null, end: string | null): string {
    const fmt = (t: string | null): string => {
      if (!t) return '';
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    if (start && end) return `${fmt(start)} - ${fmt(end)}`;
    return fmt(start || end) || '–';
  }
}