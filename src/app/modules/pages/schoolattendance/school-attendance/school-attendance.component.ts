// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { Router } from '@angular/router';
// import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators';
// import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
// import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
// import { AuthService } from '../../../../service/auth/auth.service';
// import { AlertService } from '../../../../service/alert/alert.service';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

// @Component({
//   selector: 'app-school-attendance',
//   standalone: false,
//   templateUrl: './school-attendance.component.html',
//   styleUrl: './school-attendance.component.scss',
// })
// export class SchoolAttendanceComponent implements OnInit, OnDestroy {
//   private destroy$ = new Subject<void>();
//   loading = false;
//   batches: any[] = [];
//   markedSet = new Set<string>();
//   selectedDate: number = 0;
//   selectedDateLabel = '';
//   dates: {
//     label: string;
//     value: number;
//     isToday: boolean;
//     isFuture: boolean;
//   }[] = [];
//   currentWeekMonday = 0;
//   isAO = false;
//   isTeacher = false;
//   staffId = '';
//   roleLevel = '';
//   showPrintModal = false;
//   printBatch: any = null;
//   printMonth = '';
//   printLoading = false;
//   monthOptions: { label: string; value: string }[] = [];

//   constructor(
//     private breadcrumb: BredcrumpService,
//     private router: Router,
//     private commonApi: CommonapiService,
//     private auth: AuthService,
//     private alert: AlertService,
//   ) {
//     this.breadcrumb.set([{ label: 'School Attendance' }]);
//   }

//   ngOnInit(): void {
//     this.roleLevel = this.auth.getRole();
//     this.isAO = ['L1', 'L3'].includes(this.roleLevel);
//     this.isTeacher = ['L4', 'L5'].includes(this.roleLevel);
//     this.staffId = this.auth.getStaffId();
//     this.buildWeekDates(this.getTodayUtcMs());
//     const today =
//       this.dates.find((d) => d.value === this.getTodayUtcMs()) || this.dates[0];
//     this.selectDate(today);
//     this.buildMonthOptions();
//   }

//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   buildMonthOptions(): void {
//     const now = new Date();
//     const months = [
//       'January',
//       'February',
//       'March',
//       'April',
//       'May',
//       'June',
//       'July',
//       'August',
//       'September',
//       'October',
//       'November',
//       'December',
//     ];
//     this.monthOptions = [];
//     for (let i = 0; i < 6; i++) {
//       const d = new Date(
//         Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
//       );
//       const val = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
//       this.monthOptions.push({
//         label: `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
//         value: val,
//       });
//     }
//     this.printMonth = this.monthOptions[0]?.value || '';
//   }

//   getTodayUtcMs(): number {
//     const now = new Date();
//     return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
//   }

//   getMondayOfWeek(anyMs: number): number {
//     const d = new Date(anyMs);
//     const utcDay = d.getUTCDay();
//     const diff = utcDay === 0 ? -6 : 1 - utcDay;
//     return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff);
//   }

//   buildWeekDates(anyMs: number): void {
//     const monday = this.getMondayOfWeek(anyMs);
//     this.currentWeekMonday = monday;
//     const today = this.getTodayUtcMs();
//     const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
//     const months = [
//       'Jan',
//       'Feb',
//       'Mar',
//       'Apr',
//       'May',
//       'Jun',
//       'Jul',
//       'Aug',
//       'Sep',
//       'Oct',
//       'Nov',
//       'Dec',
//     ];
//     this.dates = Array.from({ length: 7 }, (_, i) => {
//       const ms = monday + i * 86_400_000;
//       const d = new Date(ms);
//       return {
//         label: `${dayLabels[i]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`,
//         value: ms,
//         isToday: ms === today,
//         isFuture: ms > today,
//       };
//     });
//   }

//   prevWeek(): void {
//     this.buildWeekDates(this.currentWeekMonday - 7 * 86_400_000);
//     this.selectDate(this.dates[0]);
//   }

//   nextWeek(): void {
//     this.buildWeekDates(this.currentWeekMonday + 7 * 86_400_000);
//     this.selectDate(this.dates[0]);
//   }

//   selectDate(d: any): void {
//     this.selectedDate = d.value;
//     this.selectedDateLabel = d.label;
//     this.loadBatches();
//   }

//   loadBatches(): void {
//     const tenantId = localStorage.getItem('tenantId');
//     const payload: any = { entiId: tenantId, roleLevel: this.roleLevel };
//     if (this.isTeacher) payload.staffId = this.staffId;

//     this.loading = true;
//     this.commonApi
//       .fetchData(payload, 'batch', 'school-attendance/batches')
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (res: any) => {
//           this.loading = false;
//           this.batches = res?.data || [];
//           this.checkMarkedStatus();
//         },
//         error: () => {
//           this.loading = false;
//           this.batches = [];
//         },
//       });
//   }

//   checkMarkedStatus(): void {
//     if (!this.batches.length || !this.selectedDate) return;
//     const tenantId = localStorage.getItem('tenantId');
//     this.markedSet.clear();

//     this.commonApi
//       .fetchData(
//         {
//           entiId: tenantId,
//           fromDate: this.selectedDate,
//           toDate: this.selectedDate,
//           batchCodes: this.batches.map((b) => b.batchCode),
//         },
//         'batch',
//         'school-attendance/marked-check',
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (res: any) => {
//           const marked: string[] = res?.markedBatchCodes || [];
//           this.markedSet = new Set(marked);
//         },
//         error: () => {},
//       });
//   }

//   isMarked(batchCode: string): boolean {
//     return this.markedSet.has(batchCode);
//   }

//   goToMark(batch: any): void {
//     this.router.navigate(['/app/school-attendance/mark'], {
//       state: {
//         batchCode: batch.batchCode,
//         batchName: batch.batchName,
//         batchId: batch.batchId,
//         section: batch.section || '',
//         classNo: batch.classNo || '',
//         date: this.selectedDate,
//         dateLabel: this.selectedDateLabel,
//         roleLevel: this.roleLevel,
//         markedBy: localStorage.getItem('userId'),
//         markedByName: localStorage.getItem('userName') || '',
//         markedByRole: this.roleLevel,
//       },
//     });
//   }

//   get isPastDate(): boolean {
//     return this.selectedDate < this.getTodayUtcMs();
//   }

//   get isFutureDate(): boolean {
//     return this.selectedDate > this.getTodayUtcMs();
//   }

//   canMarkBatch(batch: any): boolean {
//     if (this.isTeacher) return !this.isPastDate && !this.isFutureDate;
//     return !this.isFutureDate;
//   }

//   openPrintModal(batch: any): void {
//     this.printBatch = batch;
//     this.showPrintModal = true;
//   }

//   closePrintModal(): void {
//     this.showPrintModal = false;
//     this.printBatch = null;
//   }

//   downloadPdf(): void {
//     if (!this.printBatch || !this.printMonth || this.printLoading) return;
//     const [year, month] = this.printMonth.split('-').map(Number);
//     const tenantId = localStorage.getItem('tenantId');
//     this.printLoading = true;
//     this.commonApi
//       .fetchData(
//         {
//           entiId: tenantId,
//           batchCode: this.printBatch.batchCode,
//           month,
//           year,
//         },
//         'batch',
//         'school-attendance/monthly-report',
//       )
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (res: any) => {
//           this.printLoading = false;
//           this.generatePdf(res?.data, year, month);
//         },
//         error: (err: any) => {
//           this.printLoading = false;
//           this.alert.error(err?.error?.message || 'Failed to generate report');
//         },
//       });
//   }

//   // private generatePdf(data: any, year: number, month: number): void {
//   //   if (!data) return;
//   //   const monthNames = [
//   //     'January',
//   //     'February',
//   //     'March',
//   //     'April',
//   //     'May',
//   //     'June',
//   //     'July',
//   //     'August',
//   //     'September',
//   //     'October',
//   //     'November',
//   //     'December',
//   //   ];
//   //   const monthLabel = `${monthNames[month - 1]} ${year}`;
//   //   const lastDay = data.lastDay || 31;
//   //   const rows: any[] = data.rows || [];
//   //   const batch = this.printBatch;
//   //   const doc = new jsPDF({
//   //     orientation: 'landscape',
//   //     unit: 'mm',
//   //     format: 'a4',
//   //   });
//   //   const pageW = doc.internal.pageSize.getWidth();
//   //   doc.setFontSize(14);
//   //   doc.setFont('helvetica', 'bold');
//   //   doc.text('ATTENDANCE REGISTER', pageW / 2, 14, { align: 'center' });
//   //   doc.setFontSize(10);
//   //   doc.setFont('helvetica', 'normal');
//   //   doc.text(`Batch: ${batch.batchName} (${batch.batchCode})`, 14, 22);
//   //   doc.text(`Month: ${monthLabel}`, 14, 28);
//   //   const rightX = pageW - 14;
//   //   if (batch.section)
//   //     doc.text(`Section: ${batch.section}`, rightX, 22, { align: 'right' });
//   //   if (batch.classNo)
//   //     doc.text(`Class: ${batch.classNo}`, rightX, 28, { align: 'right' });
//   //   doc.setDrawColor(0);
//   //   doc.line(14, 31, pageW - 14, 31);
//   //   const head: any[][] = [[]];
//   //   head[0].push(
//   //     { content: 'Sl', styles: { halign: 'center', fontStyle: 'bold' } },
//   //     {
//   //       content: 'Name',
//   //       styles: { halign: 'left', fontStyle: 'bold', cellWidth: 38 },
//   //     },
//   //   );
//   //   for (let d = 1; d <= lastDay; d++) {
//   //     head[0].push({
//   //       content: String(d),
//   //       styles: { halign: 'center', fontStyle: 'bold', cellWidth: 6 },
//   //     });
//   //   }
//   //   head[0].push(
//   //     {
//   //       content: 'P',
//   //       styles: { halign: 'center', fontStyle: 'bold', cellWidth: 8 },
//   //     },
//   //     {
//   //       content: 'WD',
//   //       styles: { halign: 'center', fontStyle: 'bold', cellWidth: 8 },
//   //     },
//   //     {
//   //       content: '%',
//   //       styles: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
//   //     },
//   //   );
//   //   const body: any[][] = rows.map((row: any, idx: number) => {
//   //     const cells: any[] = [
//   //       { content: idx + 1, styles: { halign: 'center' } },
//   //       { content: row.name, styles: { halign: 'left' } },
//   //     ];
//   //     for (const cell of row.attendance || []) {
//   //       const val = cell || '';
//   //       cells.push({
//   //         content: val,
//   //         styles: {
//   //           halign: 'center',
//   //           textColor:
//   //             val === 'A'
//   //               ? [220, 53, 69]
//   //               : val === 'L'
//   //                 ? [255, 153, 0]
//   //                 : val === 'P'
//   //                   ? [25, 135, 84]
//   //                   : [180, 180, 180],
//   //           fontStyle: val ? 'bold' : 'normal',
//   //         },
//   //       });
//   //     }
//   //     cells.push(
//   //       {
//   //         content: row.presentCount,
//   //         styles: {
//   //           halign: 'center',
//   //           fontStyle: 'bold',
//   //           textColor: [25, 135, 84],
//   //         },
//   //       },
//   //       { content: row.workingDays, styles: { halign: 'center' } },
//   //       {
//   //         content: `${row.percentage}%`,
//   //         styles: {
//   //           halign: 'center',
//   //           fontStyle: 'bold',
//   //           textColor: row.percentage >= 75 ? [25, 135, 84] : [220, 53, 69],
//   //         },
//   //       },
//   //     );

//   //     return cells;
//   //   });
//   //   const totalRow: any[] = [
//   //     { content: '', styles: { halign: 'center' } },
//   //     { content: 'TOTAL', styles: { halign: 'left', fontStyle: 'bold' } },
//   //     { content: '', styles: { halign: 'center' } },
//   //   ];
//   //   for (let d = 1; d <= lastDay; d++) {
//   //     const dayIdx = d - 1;
//   //     const dateMs = Date.UTC(year, month - 1, d);
//   //     const dayCount = rows.filter(
//   //       (r: any) =>
//   //         r.attendance[dayIdx] === 'P' || r.attendance[dayIdx] === 'L',
//   //     ).length;
//   //     totalRow.push({
//   //       content: dayCount || '',
//   //       styles: { halign: 'center', fontStyle: 'bold' },
//   //     });
//   //   }
//   //   const totalPresent = rows.reduce(
//   //     (s: number, r: any) => s + (r.presentCount || 0),
//   //     0,
//   //   );
//   //   const totalWorking = rows.length > 0 ? rows[0].workingDays : 0;
//   //   const avgPct = rows.length
//   //     ? Math.round(
//   //         rows.reduce((s: number, r: any) => s + (r.percentage || 0), 0) /
//   //           rows.length,
//   //       )
//   //     : 0;

//   //   totalRow.push(
//   //     {
//   //       content: totalPresent,
//   //       styles: { halign: 'center', fontStyle: 'bold' },
//   //     },
//   //     {
//   //       content: totalWorking,
//   //       styles: { halign: 'center', fontStyle: 'bold' },
//   //     },
//   //     {
//   //       content: `${avgPct}%`,
//   //       styles: { halign: 'center', fontStyle: 'bold' },
//   //     },
//   //   );
//   //   body.push(totalRow);
//   //   const legendY = (doc as any).lastAutoTable?.finalY
//   //     ? (doc as any).lastAutoTable.finalY + 6
//   //     : 200;
//   //   autoTable(doc, {
//   //     startY: 35,
//   //     head,
//   //     body,
//   //     theme: 'grid',
//   //     styles: {
//   //       fontSize: 6.5,
//   //       cellPadding: 1.2,
//   //       lineColor: [200, 200, 200],
//   //       lineWidth: 0.2,
//   //     },
//   //     headStyles: {
//   //       fillColor: [41, 128, 185],
//   //       textColor: 255,
//   //       fontSize: 7,
//   //       cellPadding: 1.5,
//   //     },
//   //     alternateRowStyles: { fillColor: [245, 248, 255] },
//   //     columnStyles: {
//   //       0: { cellWidth: 7 },
//   //       1: { cellWidth: 38 },
//   //       2: { cellWidth: 18 },
//   //     },
//   //     margin: { left: 14, right: 14 },
//   //     didParseCell: (hookData: any) => {
//   //       if (hookData.row.index === body.length - 1) {
//   //         hookData.cell.styles.fillColor = [230, 230, 230];
//   //       }
//   //     },
//   //   });
//   //   const finalY = (doc as any).lastAutoTable?.finalY || 200;
//   //   doc.setFontSize(7);
//   //   doc.setFont('helvetica', 'normal');
//   //   doc.setTextColor(80, 80, 80);
//   //   doc.text(
//   //     'P = Present   A = Absent   L = Late   WD = Working Days   % = Attendance %',
//   //     14,
//   //     finalY + 6,
//   //   );
//   //   doc.save(
//   //     `Attendance_${batch.batchCode}_${monthLabel.replace(' ', '_')}.pdf`,
//   //   );
//   // }

// private generatePdf(data: any, year: number, month: number): void {
//     if (!data) return;
//     const monthNames = ['January','February','March','April','May','June',
//                         'July','August','September','October','November','December'];
//     const monthLabel  = `${monthNames[month - 1]} ${year}`;
//     const lastDay     = data.lastDay || 31;
//     const rows: any[] = data.rows   || [];
//     const batch       = this.printBatch;
//     const workingDays = data.workingDays || 0;
//     const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
//     const pageW = doc.internal.pageSize.getWidth();   // 297
//     const pageH = doc.internal.pageSize.getHeight();  // 210
//     const ml = 10, mr = 10;
//     const contentW = pageW - ml - mr;
//     const bold   = (s: number) => { doc.setFont('helvetica', 'bold');   doc.setFontSize(s); };
//     const normal = (s: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(s); };
//     bold(14);
//     doc.text('ATTENDANCE REGISTER', pageW / 2, 12, { align: 'center' });
//     normal(9);
//     doc.text(`Batch  : ${batch.batchName} (${batch.batchCode})`, ml, 19);
//     if (batch.section)  doc.text(`Section : ${batch.section}`,    ml, 24);
//     if (batch.classNo)  doc.text(`Class   : ${batch.classNo}`,    ml, batch.section ? 29 : 24);
//     bold(10);
//     doc.text(`Month : ${monthLabel}`, pageW / 2, 19, { align: 'center' });
//     normal(9);
//     doc.text(`No. of Working Days : ${workingDays}`, pageW - mr, 19, { align: 'right' });
//     doc.text(`Total Students      : ${rows.length}`,  pageW - mr, 24, { align: 'right' });
//     doc.setDrawColor(0); doc.setLineWidth(0.4);
//     doc.line(ml, 32, pageW - mr, 32);
//     const srW    = 6;
//     const idW    = 22;
//     const nameW  = 36;
//     const dayW   = 5.5;
//     const pW     = 8;
//     const aW     = 8;
//     const pctW   = 10;
//     const remW   = contentW - srW - idW - nameW - (lastDay * dayW) - pW - aW - pctW;
//     const head: any[][] = [[]];
//     head[0].push(
//       { content: 'Sr',      styles: { halign: 'center', fontStyle: 'bold', cellWidth: srW } },
//       { content: 'Adm No',  styles: { halign: 'center', fontStyle: 'bold', cellWidth: idW } },
//       { content: 'Name',    styles: { halign: 'left',   fontStyle: 'bold', cellWidth: nameW } },
//     );
//     for (let d = 1; d <= lastDay; d++) {
//       head[0].push({
//         content: String(d),
//         styles: { halign: 'center', fontStyle: 'bold', cellWidth: dayW, fontSize: 6 }
//       });
//     }
//     head[0].push(
//       { content: 'P',       styles: { halign: 'center', fontStyle: 'bold', cellWidth: pW } },
//       { content: 'A',       styles: { halign: 'center', fontStyle: 'bold', cellWidth: aW } },
//       { content: `% of\n${workingDays}d`, styles: { halign: 'center', fontStyle: 'bold', cellWidth: pctW, fontSize: 5.5 } },
//       { content: 'Remarks', styles: { halign: 'center', fontStyle: 'bold', cellWidth: remW > 5 ? remW : 12 } },
//     );
//     const body: any[][] = rows.map((row: any, idx: number) => {
//       const cells: any[] = [
//         { content: idx + 1,          styles: { halign: 'center' } },
//         { content: row.admissionNo,  styles: { halign: 'center', fontSize: 5.5 } },
//         { content: row.name,         styles: { halign: 'left',   fontSize: 6.5 } },
//       ];
//       for (const val of (row.attendance || [])) {
//         const v = val || '';
//         cells.push({
//           content: v,
//           styles: {
//             halign: 'center',
//             fontStyle: v ? 'bold' : 'normal',
//             textColor: v === 'A' ? [220, 53, 69]
//                      : v === 'L' ? [255, 153, 0]
//                      : v === 'P' ? [25, 135, 84]
//                      : [210, 210, 210],
//             fillColor: v === '' ? [245, 245, 245] : [255, 255, 255],
//           }
//         });
//       }
//       cells.push(
//         { content: row.presentCount, styles: { halign: 'center', fontStyle: 'bold', textColor: [25, 135, 84] } },
//         { content: row.absentCount,  styles: { halign: 'center', fontStyle: 'bold', textColor: [220, 53, 69] } },
//         {
//           content: `${row.percentage}%`,
//           styles: {
//             halign: 'center', fontStyle: 'bold',
//             textColor: row.percentage >= 75 ? [25, 135, 84] : [220, 53, 69]
//           }
//         },
//         { content: '', styles: { halign: 'left' } },
//       );
//       return cells;
//     });
//     const dayTotalsRow: any[] = [
//       { content: '',        styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255] } },
//       { content: '',        styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255] } },
//       { content: 'Present', styles: { halign: 'right',  fontStyle: 'bold', fillColor: [230, 235, 255], fontSize: 6.5 } },
//     ];
//     for (let d = 0; d < lastDay; d++) {
//       const cnt = rows.filter((r: any) =>
//         r.attendance[d] === 'P' || r.attendance[d] === 'L'
//       ).length;
//       dayTotalsRow.push({
//         content: cnt || '',
//         styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255], fontSize: 6 }
//       });
//     }
//     const totalPresent = rows.reduce((s: number, r: any) => s + (r.presentCount || 0), 0);
//     const totalAbsent  = rows.reduce((s: number, r: any) => s + (r.absentCount  || 0), 0);
//     const avgPct       = rows.length
//       ? Math.round(rows.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / rows.length)
//       : 0;

//     dayTotalsRow.push(
//       { content: totalPresent, styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255], textColor: [25, 135, 84] } },
//       { content: totalAbsent,  styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255], textColor: [220, 53, 69] } },
//       { content: `${avgPct}%`, styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255] } },
//       { content: '',           styles: { fillColor: [230, 235, 255] } },
//     );
//     body.push(dayTotalsRow);
//     const dayPctRow: any[] = [
//       { content: '', styles: { fillColor: [245, 245, 245] } },
//       { content: '', styles: { fillColor: [245, 245, 245] } },
//       { content: 'Attendance %', styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 245], fontSize: 6 } },
//     ];
//     for (let d = 0; d < lastDay; d++) {
//       const presentOnDay = rows.filter((r: any) =>
//         r.attendance[d] === 'P' || r.attendance[d] === 'L'
//       ).length;
//       const pct = rows.length > 0 ? Math.round((presentOnDay / rows.length) * 100) : 0;
//       dayPctRow.push({
//         content: presentOnDay > 0 ? `${pct}` : '',
//         styles: { halign: 'center', fontSize: 5.5, fillColor: [245, 245, 245],
//                   textColor: pct >= 75 ? [25, 135, 84] : pct > 0 ? [220, 53, 69] : [180, 180, 180] }
//       });
//     }
//     dayPctRow.push(
//       { content: '', styles: { fillColor: [245, 245, 245] } },
//       { content: '', styles: { fillColor: [245, 245, 245] } },
//       { content: '', styles: { fillColor: [245, 245, 245] } },
//       { content: '', styles: { fillColor: [245, 245, 245] } },
//     );
//     body.push(dayPctRow);
//     const blankRow = (label: string) => {
//       const r: any[] = [
//         { content: '', styles: { fillColor: [255, 255, 255] } },
//         { content: '', styles: { fillColor: [255, 255, 255] } },
//         { content: label, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], fontSize: 6, textColor: [100, 100, 100] } },
//       ];
//       for (let d = 0; d < lastDay; d++) {
//         r.push({ content: '', styles: { fillColor: [255, 255, 255] } });
//       }
//       r.push(
//         { content: '', styles: { fillColor: [255, 255, 255] } },
//         { content: '', styles: { fillColor: [255, 255, 255] } },
//         { content: '', styles: { fillColor: [255, 255, 255] } },
//         { content: '', styles: { fillColor: [255, 255, 255] } },
//       );
//       return r;
//     };
//     body.push(blankRow('Present (Morning)'));
//     body.push(blankRow('Present (Afternoon)'));
//     body.push(blankRow('Girls'));
//     body.push(blankRow('Boys'));
//     body.push(blankRow('Class Teacher Initial'));
//     autoTable(doc, {
//       startY: 34,
//       head,
//       body,
//       theme: 'grid',
//       styles: {
//         fontSize: 6.5,
//         cellPadding: 1.2,
//         lineColor: [200, 200, 200],
//         lineWidth: 0.2,
//         overflow: 'linebreak',
//       },
//       headStyles: {
//         fillColor: [41, 128, 185],
//         textColor: 255,
//         fontSize: 7,
//         cellPadding: 1.5,
//         halign: 'center',
//       },
//       alternateRowStyles: { fillColor: [248, 250, 255] },
//       margin: { left: ml, right: mr },
//       didParseCell: (hookData: any) => {
//         const lastDataRowIdx = rows.length;
//         if (hookData.row.index === lastDataRowIdx) {
//           hookData.cell.styles.fillColor = [230, 235, 255];
//         }
//         if (hookData.row.index === lastDataRowIdx + 1) {
//           hookData.cell.styles.fillColor = [245, 245, 245];
//         }
//         if (hookData.row.index > lastDataRowIdx + 1) {
//           hookData.cell.styles.fillColor = [255, 255, 255];
//         }
//       },
//     });
//     const finalY = (doc as any).lastAutoTable?.finalY || pageH - 40;
//     const footY  = Math.min(finalY + 8, pageH - 28);
//     normal(7.5);
//     doc.setTextColor(80, 80, 80);
//     doc.text('No. on Roll at beginning of month : ___________', ml, footY);
//     doc.text('No. on Roll at end of month        : ___________', ml, footY + 5);
//     doc.text('No. Admitted                        : ___________', ml, footY + 10);
//     doc.text('No. Left with TC                    : ___________', ml, footY + 15);
//     const sigX = pageW - mr - 70;
//     doc.text('Signature of Class Teacher', sigX, footY + 10, { align: 'left' });
//     doc.line(sigX, footY + 8, sigX + 65, footY + 8);
//     doc.text('Signature of Principal / Academic Coordinator', sigX, footY + 18, { align: 'left' });
//     doc.line(sigX, footY + 16, sigX + 65, footY + 16);
//     if (batch.classTeacherName) {
//       normal(7);
//       doc.setTextColor(60, 60, 60);
//       doc.text(`(${batch.classTeacherName})`, sigX, footY + 12.5);
//     }
//     normal(7);
//     doc.setTextColor(100, 100, 100);
//     doc.text(
//       'Legend :  P = Present    A = Absent    L = Late    (shaded) = No attendance taken    % = against working days only',
//       pageW / 2, footY + 22, { align: 'center' }
//     );
//     doc.save(`Attendance_${batch.batchCode}_${monthLabel.replace(' ', '_')}.pdf`);
//   }
// }

import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BredcrumpService } from '../../../../service/bredcrump/bredcrump.service';
import { CommonapiService } from '../../../../service/commonapi/commonapi.service';
import { AuthService } from '../../../../service/auth/auth.service';
import { AlertService } from '../../../../service/alert/alert.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-school-attendance',
  standalone: false,
  templateUrl: './school-attendance.component.html',
  styleUrl: './school-attendance.component.scss',
})
export class SchoolAttendanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── State ─────────────────────────────────────────────────────────────────
  loading           = false;
  batches: any[]    = [];
  markedSet         = new Set<string>();
  holidaySet        = new Set<string>();   // batchCodes that are holidays on selectedDate
  selectedDate      = 0;
  selectedDateLabel = '';
  dates: { label: string; value: number; isToday: boolean; isFuture: boolean; }[] = [];
  currentWeekMonday = 0;

  // ── Role ──────────────────────────────────────────────────────────────────
  isAO       = false;
  isTeacher  = false;
  canDeclare = false;   // L1, L3, L4
  staffId    = '';
  roleLevel  = '';

  // ── Holiday popover ───────────────────────────────────────────────────────
  popoverDate: number | null = null;       // which date strip item is open
  holidayPopoverDateMap = new Map<number, { name: string; type: string; attendanceId: string }>();
  // holiday info for dates in the current week
  declareForm = { name: '', type: 'HOLIDAY' };
  declaringHoliday  = false;
  removingHoliday   = false;

  // ── Print modal ───────────────────────────────────────────────────────────
  showPrintModal = false;
  printBatch: any = null;
  printMonth      = '';
  printLoading    = false;
  monthOptions: { label: string; value: string }[] = [];

  constructor(
    private breadcrumb: BredcrumpService,
    private router: Router,
    private commonApi: CommonapiService,
    private auth: AuthService,
    private alert: AlertService,
    private elRef: ElementRef
  ) {
    this.breadcrumb.set([{ label: 'School Attendance' }]);
  }

  ngOnInit(): void {
    this.roleLevel  = this.auth.getRole();
    this.isAO       = ['L1', 'L3'].includes(this.roleLevel);
    this.isTeacher  = ['L4', 'L5'].includes(this.roleLevel);
    this.canDeclare = ['L1', 'L3', 'L4'].includes(this.roleLevel);
    this.staffId    = this.auth.getStaffId();
    this.buildWeekDates(this.getTodayUtcMs());
    const today = this.dates.find(d => d.value === this.getTodayUtcMs()) || this.dates[0];
    this.selectDate(today);
    this.buildMonthOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Close popover when clicking outside ───────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.elRef.nativeElement.querySelector('.date-popover-wrap')?.contains(e.target as Node)) {
      this.popoverDate = null;
    }
  }

  // ── Date helpers ──────────────────────────────────────────────────────────
  getTodayUtcMs(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }

  getMondayOfWeek(anyMs: number): number {
    const d = new Date(anyMs);
    const utcDay = d.getUTCDay();
    const diff = utcDay === 0 ? -6 : 1 - utcDay;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff);
  }

  buildWeekDates(anyMs: number): void {
    const monday = this.getMondayOfWeek(anyMs);
    this.currentWeekMonday = monday;
    const today = this.getTodayUtcMs();
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    this.dates = Array.from({ length: 7 }, (_, i) => {
      const ms = monday + i * 86_400_000;
      const d  = new Date(ms);
      return {
        label:    `${dayLabels[i]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`,
        value:    ms,
        isToday:  ms === today,
        isFuture: ms > today,
      };
    });
  }

  buildMonthOptions(): void {
    const now = new Date();
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    this.monthOptions = [];
    for (let i = 0; i < 6; i++) {
      const d   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const val = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      this.monthOptions.push({ label: `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`, value: val });
    }
    this.printMonth = this.monthOptions[0]?.value || '';
  }

  prevWeek(): void { this.buildWeekDates(this.currentWeekMonday - 7 * 86_400_000); this.selectDate(this.dates[0]); }
  nextWeek(): void { this.buildWeekDates(this.currentWeekMonday + 7 * 86_400_000); this.selectDate(this.dates[0]); }

  selectDate(d: any): void {
    this.selectedDate      = d.value;
    this.selectedDateLabel = d.label;
    this.popoverDate       = null;
    this.loadBatches();
    this.loadWeekHolidays();
  }

  // Normal date select - always selects date, never opens popover
  selectDateOnly(d: any): void {
    const changed = this.selectedDate !== d.value;
    this.selectedDate      = d.value;
    this.selectedDateLabel = d.label;
    this.popoverDate       = null;
    if (changed) { this.loadBatches(); this.loadWeekHolidays(); }
  }

  // Holiday icon click - only for canDeclare on non-future dates
  onHolidayIconClick(d: any, event: MouseEvent): void {
    event.stopPropagation();
    const changed = this.selectedDate !== d.value;
    this.selectedDate      = d.value;
    this.selectedDateLabel = d.label;
    if (changed) { this.loadBatches(); this.loadWeekHolidays(); }
    if (this.popoverDate === d.value) {
      this.popoverDate = null;
    } else {
      this.popoverDate = d.value;
      const existing = this.holidayPopoverDateMap.get(d.value);
      this.declareForm = { name: existing?.name || '', type: existing?.type || 'HOLIDAY' };
    }
  }

  // ── Load week-level holiday info for all 7 dates ──────────────────────────
  loadWeekHolidays(): void {
    if (!this.batches.length) return;
    // Use first batch to get institute-level holidays for the week
    // (holidays declared for all batches share the same date pattern)
    const tenantId  = localStorage.getItem('tenantId');
    const batchCode = this.batches[0]?.batchCode;
    if (!batchCode) return;

    const fromDate = this.dates[0].value;
    const toDate   = this.dates[6].value;

    this.commonApi.fetchData(
      { entiId: tenantId, batchCode, fromDate, toDate },
      'batch', 'school-attendance/holiday/list'
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.holidayPopoverDateMap.clear();
        (res?.data || []).forEach((h: any) => {
          this.holidayPopoverDateMap.set(h.date, {
            name:          h.holidayName || h.type,
            type:          h.type,
            attendanceId:  h.attendanceId
          });
        });
      },
      error: () => {}
    });
  }

  isDateHoliday(dateMs: number): boolean {
    return this.holidayPopoverDateMap.has(dateMs);
  }

  getDateHolidayName(dateMs: number): string {
    return this.holidayPopoverDateMap.get(dateMs)?.name || '';
  }

  // ── Declare holiday for ALL batches on selected date ─────────────────────
  declareHoliday(): void {
    if (!this.declareForm.name.trim()) {
      this.alert.error('Please enter a holiday name');
      return;
    }
    const tenantId = localStorage.getItem('tenantId');
    this.declaringHoliday = true;

    this.commonApi.fetchData(
      {
        entiId:      tenantId,
        date:        this.popoverDate,
        holidayName: this.declareForm.name.trim(),
        type:        this.declareForm.type,
        userId:      localStorage.getItem('userId')
      },
      'batch', 'school-attendance/holiday/declare-all-batches'
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.declaringHoliday = false;
        if (res?.status) {
          this.alert.success(`Holiday declared: ${this.declareForm.name}`);
          this.holidayPopoverDateMap.set(this.popoverDate!, {
            name: this.declareForm.name.trim(),
            type: this.declareForm.type,
            attendanceId: ''
          });
          this.popoverDate = null;
          this.declareForm = { name: '', type: 'HOLIDAY' };
          // Refresh marked status so holiday chips appear on batch cards
          this.checkMarkedStatus();
        } else {
          this.alert.error(res?.message || 'Failed to declare holiday');
        }
      },
      error: (err: any) => {
        this.declaringHoliday = false;
        this.alert.error(err?.error?.message || 'Failed to declare holiday');
      }
    });
  }

  // ── Remove holiday ────────────────────────────────────────────────────────
  removeHoliday(dateMs: number): void {
    if (!confirm('Remove holiday for all batches on this date?')) return;
    const tenantId  = localStorage.getItem('tenantId');
    const batchCode = this.batches[0]?.batchCode;
    if (!batchCode) return;

    this.removingHoliday = true;

    // Remove for each batch (bulk: use the first batch as a representative,
    // then remove for all)
    const ops = this.batches.map(b =>
      this.commonApi.fetchData(
        { entiId: tenantId, batchCode: b.batchCode, date: dateMs, userId: localStorage.getItem('userId') },
        'batch', 'school-attendance/holiday/remove'
      ).pipe(takeUntil(this.destroy$)).toPromise()
    );

    Promise.allSettled(ops).then(() => {
      this.removingHoliday = false;
      this.holidayPopoverDateMap.delete(dateMs);
      this.popoverDate = null;
      this.alert.success('Holiday removed');
      this.checkMarkedStatus();
    });
  }

  closePopover(): void {
    this.popoverDate  = null;
    this.declareForm  = { name: '', type: 'HOLIDAY' };
  }

  // ── Batch loading ─────────────────────────────────────────────────────────
  loadBatches(): void {
    const tenantId  = localStorage.getItem('tenantId');
    const payload: any = { entiId: tenantId, roleLevel: this.roleLevel };
    if (this.isTeacher) payload.staffId = this.staffId;

    this.loading = true;
    this.commonApi.fetchData(payload, 'batch', 'school-attendance/batches')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.batches = res?.data || [];
          this.checkMarkedStatus();
          this.loadWeekHolidays();
        },
        error: () => { this.loading = false; this.batches = []; }
      });
  }

  checkMarkedStatus(): void {
    if (!this.batches.length || !this.selectedDate) return;
    const tenantId = localStorage.getItem('tenantId');
    this.markedSet.clear();
    this.holidaySet.clear();

    this.commonApi.fetchData(
      { entiId: tenantId, fromDate: this.selectedDate, toDate: this.selectedDate,
        batchCodes: this.batches.map(b => b.batchCode) },
      'batch', 'school-attendance/marked-check'
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        (res?.markedBatchCodes  || []).forEach((c: string) => this.markedSet.add(c));
        (res?.holidayBatchCodes || []).forEach((c: string) => this.holidaySet.add(c));
      },
      error: () => {}
    });
  }

  isMarked(batchCode: string):  boolean { return this.markedSet.has(batchCode); }
  isHoliday(batchCode: string): boolean { return this.holidaySet.has(batchCode); }

  goToMark(batch: any): void {
    this.router.navigate(['/app/school-attendance/mark'], {
      state: {
        batchCode:    batch.batchCode,
        batchName:    batch.batchName,
        batchId:      batch.batchId,
        section:      batch.section  || '',
        classNo:      batch.classNo  || '',
        date:         this.selectedDate,
        dateLabel:    this.selectedDateLabel,
        roleLevel:    this.roleLevel,
        markedBy:     localStorage.getItem('userId'),
        markedByName: localStorage.getItem('userName') || '',
        markedByRole: this.roleLevel,
      },
    });
  }

  get isPastDate():   boolean { return this.selectedDate < this.getTodayUtcMs(); }
  get isFutureDate(): boolean { return this.selectedDate > this.getTodayUtcMs(); }

  canMarkBatch(batch: any): boolean {
    if (this.isHoliday(batch.batchCode)) return false;
    if (this.isTeacher) return !this.isPastDate && !this.isFutureDate;
    return !this.isFutureDate;
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  openPrintModal(batch: any): void  { this.printBatch = batch; this.showPrintModal = true; }
  closePrintModal(): void           { this.showPrintModal = false; this.printBatch = null; }

  downloadPdf(): void {
    if (!this.printBatch || !this.printMonth || this.printLoading) return;
    const [year, month] = this.printMonth.split('-').map(Number);
    const tenantId = localStorage.getItem('tenantId');
    this.printLoading = true;
    this.commonApi.fetchData(
      { entiId: tenantId, batchCode: this.printBatch.batchCode, month, year },
      'batch', 'school-attendance/monthly-report'
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.printLoading = false;
        this.generatePdf(res?.data, year, month);
      },
      error: (err: any) => {
        this.printLoading = false;
        this.alert.error(err?.error?.message || 'Failed to generate report');
      }
    });
  }

  // ── PDF generation (holiday-aware) ────────────────────────────────────────
  private generatePdf(data: any, year: number, month: number): void {
    if (!data) return;

    const monthNames  = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    const monthLabel  = `${monthNames[month - 1]} ${year}`;
    const lastDay     = data.lastDay     || 31;
    const rows: any[] = data.rows        || [];
    const batch       = this.printBatch;
    const workingDays = data.workingDays || 0;

    // Build holiday day-number sets from API response
    const holidays: any[]       = data.holidays || [];
    const holidayDaySet         = new Set<number>();
    const holidayNameMap        = new Map<number, string>();
    holidays.forEach((h: any) => {
      const dayNum = new Date(h.date).getUTCDate();
      holidayDaySet.add(dayNum);
      holidayNameMap.set(dayNum, h.name);
    });

    const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const ml = 10, mr = 10;
    const contentW = pageW - ml - mr;

    const bold   = (s: number) => { doc.setFont('helvetica', 'bold');   doc.setFontSize(s); };
    const normal = (s: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(s); };

    // ── Header ────────────────────────────────────────────────────────────
    bold(14);
    doc.text('ATTENDANCE REGISTER', pageW / 2, 12, { align: 'center' });
    normal(9);
    doc.text(`Batch  : ${batch.batchName} (${batch.batchCode})`, ml, 19);
    if (batch.section) doc.text(`Section : ${batch.section}`, ml, 24);
    if (batch.classNo) doc.text(`Class   : ${batch.classNo}`, ml, batch.section ? 29 : 24);
    bold(10);
    doc.text(`Month : ${monthLabel}`, pageW / 2, 19, { align: 'center' });
    normal(9);
    doc.text(`No. of Working Days : ${workingDays}`, pageW - mr, 19, { align: 'right' });
    doc.text(`Total Students      : ${rows.length}`,  pageW - mr, 24, { align: 'right' });
    if (holidays.length) {
      doc.text(`Holidays : ${holidays.length}`, pageW - mr, 29, { align: 'right' });
    }
    doc.setDrawColor(0); doc.setLineWidth(0.4);
    doc.line(ml, 32, pageW - mr, 32);

    // ── Column widths ─────────────────────────────────────────────────────
    const srW = 6, idW = 22, nameW = 36, dayW = 5.5, pW = 8, aW = 8, pctW = 10;
    const remW = contentW - srW - idW - nameW - (lastDay * dayW) - pW - aW - pctW;

    // ── Head ──────────────────────────────────────────────────────────────
    const head: any[][] = [[]];
    head[0].push(
      { content: 'Sr',     styles: { halign: 'center', fontStyle: 'bold', cellWidth: srW } },
      { content: 'Adm No', styles: { halign: 'center', fontStyle: 'bold', cellWidth: idW } },
      { content: 'Name',   styles: { halign: 'left',   fontStyle: 'bold', cellWidth: nameW } },
    );
    for (let d = 1; d <= lastDay; d++) {
      const isHol = holidayDaySet.has(d);
      head[0].push({
        content: String(d),
        styles: {
          halign: 'center', fontStyle: 'bold', cellWidth: dayW, fontSize: 6,
          fillColor: isHol ? [255, 200, 0]   : [41, 128, 185],
          textColor: isHol ? [80,  60,  0]   : [255, 255, 255],
        }
      });
    }
    head[0].push(
      { content: 'P',                           styles: { halign: 'center', fontStyle: 'bold', cellWidth: pW } },
      { content: 'A',                           styles: { halign: 'center', fontStyle: 'bold', cellWidth: aW } },
      { content: `% of\n${workingDays}d`,       styles: { halign: 'center', fontStyle: 'bold', cellWidth: pctW, fontSize: 5.5 } },
      { content: 'Remarks',                     styles: { halign: 'center', fontStyle: 'bold', cellWidth: remW > 5 ? remW : 12 } },
    );

    // ── Body rows ─────────────────────────────────────────────────────────
    const body: any[][] = rows.map((row: any, idx: number) => {
      const cells: any[] = [
        { content: idx + 1,         styles: { halign: 'center' } },
        { content: row.admissionNo, styles: { halign: 'center', fontSize: 5.5 } },
        { content: row.name,        styles: { halign: 'left',   fontSize: 6.5 } },
      ];
      for (const val of (row.attendance || [])) {
        const v = val || '';
        cells.push({
          content: v,
          styles: {
            halign:    'center',
            fontStyle: v && v !== 'H' ? 'bold' : 'normal',
            fontSize:  v === 'H' ? 5.5 : 6.5,
            textColor: v === 'A' ? [220, 53,  69]
                     : v === 'L' ? [255, 153, 0]
                     : v === 'P' ? [25,  135, 84]
                     : v === 'H' ? [120, 90,  0]
                     :             [210, 210, 210],
            fillColor: v === 'H' ? [255, 243, 180]
                     : v === ''  ? [245, 245, 245]
                     :             [255, 255, 255],
          }
        });
      }
      cells.push(
        { content: row.presentCount, styles: { halign: 'center', fontStyle: 'bold', textColor: [25, 135, 84] } },
        { content: row.absentCount,  styles: { halign: 'center', fontStyle: 'bold', textColor: [220, 53, 69] } },
        { content: `${row.percentage}%`, styles: { halign: 'center', fontStyle: 'bold',
            textColor: row.percentage >= 75 ? [25, 135, 84] : [220, 53, 69] } },
        { content: '', styles: { halign: 'left' } },
      );
      return cells;
    });

    // ── Day totals row ────────────────────────────────────────────────────
    const dayTotalsRow: any[] = [
      { content: '',        styles: { fillColor: [230, 235, 255] } },
      { content: '',        styles: { fillColor: [230, 235, 255] } },
      { content: 'Present', styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 235, 255], fontSize: 6.5 } },
    ];
    for (let d = 0; d < lastDay; d++) {
      const isHol = holidayDaySet.has(d + 1);
      if (isHol) {
        dayTotalsRow.push({ content: 'H', styles: { halign: 'center', fontSize: 5.5,
          fillColor: [255, 243, 180], textColor: [120, 90, 0] } });
      } else {
        const cnt = rows.filter((r: any) => r.attendance[d] === 'P' || r.attendance[d] === 'L').length;
        dayTotalsRow.push({ content: cnt || '',
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255], fontSize: 6 } });
      }
    }
    const totalPresent = rows.reduce((s: number, r: any) => s + (r.presentCount || 0), 0);
    const totalAbsent  = rows.reduce((s: number, r: any) => s + (r.absentCount  || 0), 0);
    const avgPct       = rows.length ? Math.round(rows.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / rows.length) : 0;
    dayTotalsRow.push(
      { content: totalPresent, styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255], textColor: [25, 135, 84] } },
      { content: totalAbsent,  styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255], textColor: [220, 53, 69] } },
      { content: `${avgPct}%`, styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 235, 255] } },
      { content: '',           styles: { fillColor: [230, 235, 255] } },
    );
    body.push(dayTotalsRow);

    // ── Day % row ─────────────────────────────────────────────────────────
    const dayPctRow: any[] = [
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: 'Attendance %', styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 245], fontSize: 6 } },
    ];
    for (let d = 0; d < lastDay; d++) {
      const isHol = holidayDaySet.has(d + 1);
      if (isHol) {
        dayPctRow.push({ content: 'H', styles: { halign: 'center', fontSize: 5.5,
          fillColor: [255, 243, 180], textColor: [120, 90, 0] } });
      } else {
        const cnt = rows.filter((r: any) => r.attendance[d] === 'P' || r.attendance[d] === 'L').length;
        const pct = rows.length > 0 ? Math.round((cnt / rows.length) * 100) : 0;
        dayPctRow.push({ content: cnt > 0 ? `${pct}` : '',
          styles: { halign: 'center', fontSize: 5.5, fillColor: [245, 245, 245],
            textColor: pct >= 75 ? [25, 135, 84] : pct > 0 ? [220, 53, 69] : [180, 180, 180] } });
      }
    }
    dayPctRow.push(
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
      { content: '', styles: { fillColor: [245, 245, 245] } },
    );
    body.push(dayPctRow);

    // ── Blank manual rows ─────────────────────────────────────────────────
    const blankRow = (label: string) => {
      const r: any[] = [
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: label, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], fontSize: 6, textColor: [100, 100, 100] } },
      ];
      for (let d = 0; d < lastDay; d++) r.push({ content: '', styles: { fillColor: [255, 255, 255] } });
      r.push(
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
        { content: '', styles: { fillColor: [255, 255, 255] } },
      );
      return r;
    };
    body.push(blankRow('Present (Morning)'));
    body.push(blankRow('Present (Afternoon)'));
    body.push(blankRow('Girls'));
    body.push(blankRow('Boys'));
    body.push(blankRow('Class Teacher Initial'));

    // ── Render table ──────────────────────────────────────────────────────
    autoTable(doc, {
      startY: 34, head, body, theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 1.2, lineColor: [200, 200, 200], lineWidth: 0.2, overflow: 'linebreak' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7, cellPadding: 1.5, halign: 'center' },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      margin: { left: ml, right: mr },
      didParseCell: (hookData: any) => {
        const li = rows.length;
        if (hookData.row.index === li)     hookData.cell.styles.fillColor = [230, 235, 255];
        if (hookData.row.index === li + 1) hookData.cell.styles.fillColor = [245, 245, 245];
        if (hookData.row.index  >  li + 1) hookData.cell.styles.fillColor = [255, 255, 255];
      },
    });

    // ── Footer ────────────────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable?.finalY || pageH - 40;
    const footY  = Math.min(finalY + 8, pageH - 28);

    normal(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('No. on Roll at beginning of month : ___________', ml, footY);
    doc.text('No. on Roll at end of month        : ___________', ml, footY + 5);
    doc.text('No. Admitted                        : ___________', ml, footY + 10);
    doc.text('No. Left with TC                    : ___________', ml, footY + 15);

    const sigX = pageW - mr - 70;
    doc.line(sigX, footY + 8,  sigX + 65, footY + 8);
    doc.text('Signature of Class Teacher',                    sigX, footY + 10);
    doc.line(sigX, footY + 16, sigX + 65, footY + 16);
    doc.text('Signature of Principal / Academic Coordinator', sigX, footY + 18);
    if (batch.classTeacherName) {
      normal(7); doc.setTextColor(60, 60, 60);
      doc.text(`(${batch.classTeacherName})`, sigX, footY + 12.5);
    }

    // Holiday list
    if (holidays.length) {
      normal(7); doc.setTextColor(100, 80, 0);
      const hText = holidays.map((h: any) => {
        const dn = new Date(h.date).getUTCDate();
        return `${dn} — ${h.name} (${h.type})`;
      }).join('   |   ');
      doc.text(`Holidays : ${hText}`, ml, footY + 17);
    }

    normal(7); doc.setTextColor(100, 100, 100);
    doc.text(
      'P = Present   A = Absent   L = Late   H = Holiday/Week-off   (grey) = Not taken   % = of working days',
      pageW / 2, footY + 22, { align: 'center' }
    );

    doc.save(`Attendance_${batch.batchCode}_${monthLabel.replace(' ', '_')}.pdf`);
  }
}