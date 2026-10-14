import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

let logoBase64: string | null = null;
let schoolLogoBase64: string | null = null;

const getLogoBase64 = async (): Promise<string> => {
  if (logoBase64) return logoBase64;
  try {
    const response = await fetch('/assets/z7i_logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
        resolve(logoBase64);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

const getSchoolLogoBase64 = async (): Promise<string> => {
  if (schoolLogoBase64) return schoolLogoBase64;
  try {
    const response = await fetch('/assets/suguna_pip_logo.jpeg');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => { schoolLogoBase64 = reader.result as string; resolve(schoolLogoBase64!); };
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
};

export interface PrintStudent {
  studentName: string;
  admissionNo: string;
  classNo: number | null;
  programName: string;
  batchCode: string;
  academicYear?: string;
  section?: string;
}

export interface PrintMockExam {
  examId: string;
  examName: string;
  syncedAt: number;
  obtainedMarks: number;
  totalMarks: number;
  rank: number | null;
  sectionResults: {
    sectionId: string;
    subjectName: string;
    obtainedMarks: number;
    totalMarks: number;
  }[];
}

export interface PrintSchoolExam {
  examId?: string;
  examName: string;
  examDate: number;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number | null;
  subjects: {
    subjectName: string;
    obtainedMarks: number;
    maxMarks: number | null;
    grade: string | null;
    avgObtained?: number | null;
    maxObtained?: number | null;
  }[];
}

export interface SectionStats {
  sectionId: string;
  subjectName: string;
  avgObtained: number;
  maxObtained: number;
}

const formatDate = (ts: number): string => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

const formatDateDMY = (ts: number): string => {
  if (!ts) return '—';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const formatMonthYear = (ts: number): string => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const toRoman = (num: number | null): string => {
  if (num == null) return '—';
  return num >= 1 && num <= 12 ? ROMAN_NUMERALS[num] : String(num);
};

const SUBJECT_ABBREV: Record<string, string> = {
  english: 'ENG', hindi: 'HIN', tamil: 'TAM', mathematics: 'MATH', maths: 'MATH',
  science: 'SCI', 'social science': 'SOC', telugu: 'TEL', kannada: 'KAN',
  malayalam: 'MAL', 'computer science': 'COMP', 'physical education': 'PE',
};
const subjectAbbrev = (name: string): string => {
  if (!name) return '—';
  const key = name.trim().toLowerCase();
  return SUBJECT_ABBREV[key] || name.trim().slice(0, 4).toUpperCase();
};

const GRADE_BANDS = [
  { desc: '91-100', grade: 'A1' },
  { desc: '81-90', grade: 'A2' },
  { desc: '71-80', grade: 'B1' },
  { desc: '61-70', grade: 'B2' },
  { desc: '51-60', grade: 'C1' },
  { desc: '41-50', grade: 'C2' },
  { desc: '33-40', grade: 'D' },
  { desc: '0-32', grade: 'E' },
];

const SCHOOL_NAME = 'SUGUNA PIP SCHOOL';
const SCHOOL_AFFILIATION = '(A CBSE Affiliated Senior Secondary School)';
const SCHOOL_ADDRESS = 'Nehru Nagar, Kalapatty Road, Coimbatore – 641014';
const SCHOOL_PHONE = '+91 75026 89000';
const SCHOOL_WEBSITE = 'www.sugunapips.in';

// ─────────────────────────────────────────────────────────────────────────────
// CPT PRINT HTML
// ─────────────────────────────────────────────────────────────────────────────

// Shared CSS for one exam scorecard block, used by both the standalone
// single-student document and the bulk wrapAllPages() document.
const CPT_BLOCK_CSS = `
    .exam-block { margin-bottom: 28px; page-break-inside: avoid; break-inside: avoid; }
    .cpt-title { text-align: center; font-size: 12.5pt; font-weight: 800; margin-bottom: 16px; }
    .cpt-greeting { font-size: 10.5pt; margin-bottom: 4px; }
    .cpt-reg { font-size: 10.5pt; margin-bottom: 14px; }
    .cpt-intro { font-size: 10.5pt; margin-bottom: 6px; }
    .cpt-paper-label { font-size: 10.5pt; font-weight: 700; margin-bottom: 6px; }
    .marks-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 18px; }
    .marks-table th { border: 1px solid #333; padding: 6px 10px; font-weight: 700; background: #f0f0f0; text-align: center; }
    .marks-table td { border: 1px solid #333; padding: 6px 10px; text-align: center; background: #fff; }
    .marks-table tr.total-row td { font-weight: 700; background: #f8f9fa; }
    .cpt-signoff p { font-size: 10.5pt; margin-bottom: 2px; }
    .cpt-tagline { color: #c0392b; font-weight: 600; }
`;

// One complete scorecard block (greeting + marks table + sign-off) for a
// single exam. The Total row's "Highest" comes from the backend's
// batchHighestTotal (the real topper's combined total) rather than summing
// each subject's individual highest — the student who tops the combined
// total is usually not the one who topped every subject. The Total row's
// "Average" is a correct sum of per-subject averages (average is linear,
// unlike max), so it's computed client-side even when highestTotal is
// missing.
const buildCPTExamBlockHtml = (
  student: PrintStudent,
  exam: PrintMockExam,
  batchStatsMap: Map<string, SectionStats[]>,
  highestTotalMap?: Map<string, number>,
): string => {
  const stats = batchStatsMap.get(exam.examId) || [];
  const statsMap = new Map(stats.map((s) => [s.sectionId, s]));
  const highestTotal = highestTotalMap?.get(exam.examId);
  const examName = exam.examName || 'Z-SAT';
  const monthYear = exam.syncedAt ? formatMonthYear(exam.syncedAt) : '';

  let avgTotal = 0;
  let avgTotalKnown = false;
  const rows = (exam.sectionResults || [])
    .map((sec) => {
      const stat = statsMap.get(sec.sectionId);
      if (stat) {
        avgTotal += stat.avgObtained;
        avgTotalKnown = true;
      }
      return `
      <tr>
        <td style="text-align:left;">${sec.subjectName || sec.sectionId || '—'}</td>
        <td>${sec.obtainedMarks ?? '—'}</td>
        <td><strong>${sec.totalMarks ?? '—'}</strong></td>
        <td>${stat ? stat.maxObtained : '—'}</td>
        <td>${stat ? Math.round(stat.avgObtained) : '—'}</td>
      </tr>`;
    })
    .join('');

  return `
    <div class="exam-block">
      <div class="cpt-title">${examName.toUpperCase()} EXAM RESULTS${monthYear ? ' - ' + monthYear : ''}</div>

      <div class="cpt-greeting">Dear <strong>${student.studentName || '—'}</strong>,</div>
      <div class="cpt-reg">Registration No: <strong>${student.admissionNo || '—'}</strong></div>

      <div class="cpt-intro">Your Test results are out. Please find your scorecard.</div>
      <div class="cpt-intro">Your Performance in our ${examName} Exam is given below:</div>
      <div class="cpt-paper-label">Paper 1</div>

      <table class="marks-table">
        <thead>
          <tr>
            <th style="text-align:left;">Subject</th>
            <th>Your Marks</th>
            <th>Out of</th>
            <th>Highest</th>
            <th>Average</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" style="text-align:center;color:#888;">No subject data</td></tr>'}
          <tr class="total-row">
            <td style="text-align:left;">Total</td>
            <td>${exam.obtainedMarks ?? '—'}</td>
            <td>${exam.totalMarks ?? '—'}</td>
            <td>${highestTotal != null ? highestTotal : '—'}</td>
            <td>${avgTotalKnown ? Math.round(avgTotal) : '—'}</td>
          </tr>
        </tbody>
      </table>

      <div class="cpt-signoff">
        <p>Yours sincerely,</p>
        <p>${examName} Team</p>
        <p>Z7i - Coimbatore</p>
        <p class="cpt-tagline">"You Aspire, We Inspire"</p>
      </div>
    </div>`;
};

export const buildCPTPrintHtml = async (
  student: PrintStudent,
  mockExams: PrintMockExam[],
  batchStatsMap: Map<string, SectionStats[]>,
  highestTotalMap?: Map<string, number>,
): Promise<string> => {
  const logo = await getLogoBase64();
  const logoHtml = logo
    ? `<img src="${logo}" alt="Z7i" style="height:60px;max-width:200px;object-fit:contain;" />`
    : `<h2>Z7i INSTITUTE</h2><p>JEE | NEET | Foundation</p>`;
  const examBlocksHtml = mockExams
    .map((exam) => buildCPTExamBlockHtml(student, exam, batchStatsMap, highestTotalMap))
    .join('');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CPT Results — ${student.studentName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #111; padding: 20px 30px; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .logo-header { text-align: center; margin-bottom: 16px; }
        .logo-header h2 { font-size: 20pt; font-weight: 800; letter-spacing: 1px; }
        .logo-header p { font-size: 10pt; color: #555; }
        .logo-header img { display: block; margin: 0 auto; }
        ${CPT_BLOCK_CSS}
        @media print {
          body { padding: 8px 15px; }
          .page { page-break-after: always; }
          @page { margin: 10mm 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="logo-header">
          <img src="/assets/z7i_logo.png"
       alt="Z7i Institute"
       style="height:60px; max-width:200px; object-fit:contain;"
       crossorigin="anonymous" />
          <p>JEE | NEET | Foundation</p>
        </div>

        ${examBlocksHtml || '<p style="text-align:center;color:#888;padding:20px;">No mock exam data available.</p>'}
      </div>
    </body>
    </html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL PRINT HTML
// ─────────────────────────────────────────────────────────────────────────────

// Shared CSS for one report-card block, used by both the standalone
// single-student document and the bulk wrapAllPages() document.
const SCHOOL_BLOCK_CSS = `
    .exam-block {
      background: #F7F06A;
      padding: 20px 24px;
      margin-bottom: 0;
      min-height: 1100px;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .school-header-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .school-header-table td { vertical-align: middle; padding: 0; border: none; }
    .school-header-table .logo-cell { width: 84px; padding-right: 14px; }
    .school-header-table .logo-cell img { display: block; }
    .school-info h2 { font-size: 16pt; font-weight: 800; color: #1a3a6b; letter-spacing: 0.5px; }
    .school-info .affiliation { font-size: 9pt; font-weight: 700; color: #333; }
    .school-info .addr, .school-info .contact { font-size: 8.5pt; color: #444; }
    .exam-block hr { border: none; border-top: 2px solid #1a3a6b; margin: 10px 0; }
    .report-title { font-size: 13pt; font-weight: 800; color: #111; margin-bottom: 2px; }
    .report-subtitle { font-size: 11pt; font-weight: 700; color: #333; margin-bottom: 10px; }
    .student-info { margin-bottom: 10px; }
    .student-info div { display: flex; gap: 8px; font-size: 10pt; margin-bottom: 2px; }
    .student-info span:first-child { width: 150px; color: #333; }
    .marks-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 10px; }
    .marks-table th { background: #1a3a6b; color: #fff; padding: 6px 10px; text-align: left; font-weight: 700; }
    .marks-table td { border: 1px solid #ccc; padding: 5px 10px; background: #fff; }
    .marks-table tr:nth-child(even) td { background: #eef2f8; }
    .overall-pct { background: #f3c98a; padding: 8px 14px; font-size: 10.5pt; font-weight: 700; display: flex; gap: 10px; margin-bottom: 16px; color: #5a3d00; }
    .chart-wrap { display: flex; height: 200px; margin-bottom: 8px; }
    .chart-ygrid { display: flex; flex-direction: column; justify-content: space-between; font-size: 8pt; color: #666; padding-right: 6px; text-align: right; width: 28px; }
    .chart-bars { flex: 1; display: flex; align-items: flex-end; gap: 10px; border-left: 1px solid #999; border-bottom: 1px solid #999; padding: 0 10px; }
    .bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
    .bar-set { width: 100%; max-width: 70px; height: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }
    .bar-col { flex: 1; max-width: 18px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
    .bar-value { font-size: 7pt; font-weight: 700; margin-bottom: 2px; }
    .bar-fill { width: 100%; }
    .bar-fill.student { background: #16a34a; }
    .bar-fill.highest { background: #2563eb; }
    .bar-fill.average { background: #9333ea; }
    .bar-label { font-size: 8pt; margin-top: 4px; color: #333; }
    .chart-legend { display: flex; gap: 16px; font-size: 8.5pt; color: #333; margin-bottom: 10px; }
    .legend-item { display: flex; align-items: center; }
    .legend-dot { display: inline-block; width: 10px; height: 10px; margin-right: 4px; }
    .legend-dot.student { background: #16a34a; }
    .legend-dot.highest { background: #2563eb; }
    .legend-dot.average { background: #9333ea; }
    .date-row { font-size: 9.5pt; font-weight: 700; border-top: 1px solid #333; padding-top: 6px; margin-bottom: 8px; }
    .indicators-title { font-size: 9.5pt; font-weight: 700; margin-bottom: 4px; }
    .indicators-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    .indicators-table td { border: 1px solid #333; padding: 3px 4px; background: #fff; }
`;

// One complete report-card block (header + marks table + chart + indicators)
// for a single exam. The chart shows Student/Highest/Average per subject —
// avgObtained/maxObtained now come embedded directly on each subject from
// performance/student/school-list, on the same maxMarks scale as the
// student's own obtainedMarks, so all three bars stay proportionally
// comparable even where maxMarks itself looks off for a given record.
const buildSchoolExamBlockHtml = (
  student: PrintStudent,
  exam: PrintSchoolExam,
  logoHtml: string,
): string => {
  const subjects = exam.subjects || [];
  const hasBatchStats = subjects.some((s) => s.avgObtained != null || s.maxObtained != null);

  const rows = subjects
    .map((sub) => {
      const pct = sub.maxMarks ? Math.round((sub.obtainedMarks / sub.maxMarks) * 100) : null;
      return `
      <tr>
        <td>${sub.subjectName || '—'}</td>
        <td class="text-center">${sub.maxMarks ?? '—'}</td>
        <td class="text-center">${sub.obtainedMarks ?? '—'}</td>
        <td class="text-center">${pct != null ? pct : '—'}</td>
        <td class="text-center">${sub.grade || '—'}</td>
      </tr>`;
    })
    .join('');

  const bars = subjects
    .map((sub) => {
      const studentPct = sub.maxMarks ? Math.round((sub.obtainedMarks / sub.maxMarks) * 100) : 0;
      const highestPct = sub.maxObtained != null && sub.maxMarks ? Math.round((sub.maxObtained / sub.maxMarks) * 100) : null;
      const avgPct = sub.avgObtained != null && sub.maxMarks ? Math.round((sub.avgObtained / sub.maxMarks) * 100) : null;
      const clamp = (v: number) => Math.max(0, Math.min(100, v));
      const studentBar = `
          <div class="bar-col">
            <div class="bar-value">${studentPct || 0}</div>
            <div class="bar-fill student" style="height:${clamp(studentPct)}%;"></div>
          </div>`;
      const highestBar = highestPct != null
        ? `
          <div class="bar-col">
            <div class="bar-value">${highestPct}</div>
            <div class="bar-fill highest" style="height:${clamp(highestPct)}%;"></div>
          </div>`
        : '';
      const avgBar = avgPct != null
        ? `
          <div class="bar-col">
            <div class="bar-value">${avgPct}</div>
            <div class="bar-fill average" style="height:${clamp(avgPct)}%;"></div>
          </div>`
        : '';
      return `
      <div class="bar-group">
        <div class="bar-set">${studentBar}${highestBar}${avgBar}</div>
        <div class="bar-label">${subjectAbbrev(sub.subjectName)}</div>
      </div>`;
    })
    .join('');

  const gradeBandRows = `
    <tr>${GRADE_BANDS.map((b) => `<td class="text-center">${b.desc}</td>`).join('')}</tr>
    <tr>${GRADE_BANDS.map((b) => `<td class="text-center fw-bold">${b.grade}</td>`).join('')}</tr>`;

  return `
    <div class="exam-block">
      <table class="school-header-table">
        <tr>
          <td class="logo-cell">${logoHtml}</td>
          <td class="school-info">
            <h2>${SCHOOL_NAME}</h2>
            <p class="affiliation">${SCHOOL_AFFILIATION}</p>
            <p class="addr">${SCHOOL_ADDRESS}</p>
            <p class="contact">${SCHOOL_PHONE} | ${SCHOOL_WEBSITE}</p>
          </td>
        </tr>
      </table>
      <hr/>
      <div class="report-title">SCHOLASTIC PERFORMANCE</div>
      <div class="report-subtitle">${exam.examName || 'Exam'}${student.academicYear ? ' (Academic Session ' + student.academicYear + ')' : ''}</div>

      <div class="student-info">
        <div><span>Name of the Student</span><span>:</span><strong>${student.studentName || '—'}</strong></div>
        <div><span>ID No</span><span>:</span><strong>${student.admissionNo || '—'}</strong></div>
        <div><span>Class &amp; Section</span><span>:</span><strong>${toRoman(student.classNo)}${student.section ? '-' + student.section : ''}</strong></div>
      </div>

      <table class="marks-table">
        <thead>
          <tr>
            <th>Subjects</th>
            <th class="text-center">Max Mark</th>
            <th class="text-center">${exam.examName || 'Marks'}</th>
            <th class="text-center">Percentage</th>
            <th class="text-center">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" style="text-align:center;color:#888;">No subject data</td></tr>'}
        </tbody>
      </table>

      <div class="overall-pct">
        <span>Overall Percentage</span><span>:</span>
        <strong>${exam.percentage != null ? exam.percentage.toFixed(1) : '—'}</strong>
      </div>

      <div class="chart-wrap">
        <div class="chart-ygrid">
          ${[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((v) => `<span>${v}</span>`).join('')}
        </div>
        <div class="chart-bars">${bars}</div>
      </div>
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-dot student"></span>Student Score</span>
        ${hasBatchStats ? '<span class="legend-item"><span class="legend-dot highest"></span>Highest Score</span>' : ''}
        ${hasBatchStats ? '<span class="legend-item"><span class="legend-dot average"></span>Average score</span>' : ''}
      </div>

      <div class="date-row">Date : ${exam.examDate ? formatDateDMY(exam.examDate) : '—'}</div>

      <div class="indicators-title">DESCRIPTIVE INDICATORS (SCHOLASTIC)</div>
      <table class="indicators-table">
        <tbody>${gradeBandRows}</tbody>
      </table>
    </div>`;
};

export const buildSchoolPrintHtml = async (
  student: PrintStudent,
  schoolExams: PrintSchoolExam[],
): Promise<string> => {
  const logo = await getSchoolLogoBase64();
  const logoHtml = logo
    ? `<img src="${logo}" alt="Suguna PIP School" style="height:70px;width:70px;object-fit:contain;" />`
    : '';
  const examBlocksHtml = schoolExams
    .map((exam) => buildSchoolExamBlockHtml(student, exam, logoHtml))
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>School Performance — ${student.studentName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #111; padding: 20px 30px; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .text-center { text-align: center !important; }
        .fw-bold { font-weight: 700; }
        ${SCHOOL_BLOCK_CSS}
        @media print {
          body { padding: 8px 15px; }
          .page { page-break-after: always; }
          @page { margin: 10mm 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        ${examBlocksHtml || '<p style="text-align:center;color:#888;padding:20px;">No school exam data available.</p>'}
      </div>
    </body>
    </html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// OPEN PRINT WINDOW
// ─────────────────────────────────────────────────────────────────────────────
export const openPrintWindow = (html: string): void => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => win.print(), 300);
  };
};

export const buildCPTPageHtml = async (
  student: PrintStudent,
  mockExams: PrintMockExam[],
  batchStatsMap: Map<string, SectionStats[]>,
  highestTotalMap?: Map<string, number>,
): Promise<string> => {
  const logo = await getLogoBase64();
  const logoHtml = logo
    ? `<img src="${logo}" alt="Z7i" style="height:60px;max-width:200px;object-fit:contain;" />`
    : `<h2>Z7i INSTITUTE</h2><p>JEE | NEET | Foundation</p>`;
  const examBlocksHtml = mockExams
    .map((exam: any) => buildCPTExamBlockHtml(student, exam, batchStatsMap, highestTotalMap))
    .join('');

  return `
    <div class="page">
      <div class="logo-header">
        ${logoHtml}
       <p style="margin-top:4px;font-size:10pt;color:#555;">JEE | NEET | Foundation</p>
      </div>
      ${examBlocksHtml}
    </div>`;
};

export const buildSchoolPageHtml = async (
  student: PrintStudent,
  schoolExams: PrintSchoolExam[],
): Promise<string> => {
  const logo = await getSchoolLogoBase64();
  const logoHtml = logo
    ? `<img src="${logo}" alt="Suguna PIP School" style="height:70px;width:70px;object-fit:contain;" />`
    : '';
  const examBlocksHtml = schoolExams
    .map((exam: any) => buildSchoolExamBlockHtml(student, exam, logoHtml))
    .join('');

  return `<div class="page">${examBlocksHtml}</div>`;
};

// export const wrapAllPages = (
//   pages: string[],
//   type: 'cpt' | 'school',
// ): string => {
//   const cptStyles = `
//     .logo-header { text-align:center; margin-bottom:16px; }
//     .logo-header h2 { font-size:20pt; font-weight:800; }
//     .logo-header p { font-size:10pt; color:#555; }
//     .student-table { width:100%; border-collapse:collapse; margin-bottom:20px; border:1px solid #ccc; }
//     .student-table th { background:#1a3a6b; color:#fff; text-align:center; padding:6px 10px; }
//     .student-table td { padding:5px 10px; border:1px solid #ccc; }
//     .student-table td:first-child { font-weight:600; width:160px; background:#f8f9fa; }
//     .exam-header { background:#1a56db; color:#fff; padding:6px 12px; font-size:10pt; font-weight:700; margin-bottom:0; }
//     .marks-table { width:100%; border-collapse:collapse; font-size:10pt; }
//     .marks-table th { background:#e8f0fe; border:1px solid #ccc; padding:5px 8px; font-weight:700; font-style:italic; }
//     .marks-table td { border:1px solid #ccc; padding:5px 8px; }
//     .total-row { display:flex; justify-content:space-between; padding:5px 10px; background:#f0f4ff; border:1px solid #ccc; border-top:none; font-size:10.5pt; }
//     .exam-block { margin-bottom:18px; page-break-inside: avoid; break-inside: avoid; }
//     .logo-header { text-align:center; margin-bottom:16px; }
//     .logo-header img { display:block; margin:0 auto; }`;

//   const schoolStyles = `
//     .school-header { text-align:center; margin-bottom:6px; }
//     .school-header h2 { font-size:16pt; font-weight:800; }
//     .school-header hr { border:1px solid #333; margin:6px 0; }
//     .exam-block { margin-bottom:22px; }
//     .school-exam-header { font-size:11pt; font-weight:700; text-decoration:underline; margin-bottom:6px; color:#1a3a6b; }
//     .student-meta { font-size:10pt; margin-bottom:8px; }
//     .marks-table { width:100%; border-collapse:collapse; font-size:10.5pt; margin-bottom:4px; }
//     .marks-table th { border:1px solid #333; padding:5px 10px; font-weight:700; background:#f0f0f0; }
//     .marks-table td { border:1px solid #333; padding:5px 10px; }
//     .marks-table tfoot td { font-weight:700; background:#f8f9fa; }`;

//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <title>${type === 'cpt' ? 'CPT Results' : 'School Performance'}</title>
//       <style>
//         * { box-sizing:border-box; margin:0; padding:0; }
//         body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#111; padding:20px 30px; }
//         .page { page-break-after:always; }
//         .page:last-child { page-break-after:auto; }
//         .text-center { text-align:center !important; }
//         .fw-bold { font-weight:700; }
//         ${type === 'cpt' ? cptStyles : schoolStyles}
//         @media print {
//           body { padding:8px 15px; }
//           .page { page-break-after:always; }
//           @page { margin:10mm 12mm; }
//         }
//       </style>
//     </head>
//     <body>${pages.join('')}</body>
//     </html>`;
// };

export const wrapAllPages = (pages: string[], type: 'cpt' | 'school'): string => {
  const cptStyles = `
    .logo-header { text-align:center; margin-bottom:20px; padding-bottom:10px; border-bottom:2px solid #1a3a6b; }
    .logo-header img { display:block; margin:0 auto; }
    ${CPT_BLOCK_CSS}`;

  const schoolStyles = SCHOOL_BLOCK_CSS;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${type === 'cpt' ? 'CPT Results' : 'School Performance'}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#111; }
        .page { padding:20px 30px; }
        .text-center { text-align:center !important; }
        .fw-bold { font-weight:700; }
        ${type === 'cpt' ? cptStyles : schoolStyles}
      </style>
    </head>
    <body>${pages.join('')}</body>
    </html>`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

export const exportToPdf = async (
  html: string,
  fileName: string = 'performance.pdf',
  pageBackground?: string,
): Promise<void> => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 794px;
    background: white;
    padding: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    color: #111;
    z-index: -1;
  `;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  container.innerHTML = bodyMatch ? bodyMatch[1] : html;
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const styleEl = document.createElement('style');
    styleEl.textContent = styleMatch[1];
    container.prepend(styleEl);
  }
  document.body.appendChild(container);
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const blockGapMm = 6;
    const usableWidth = pdfWidth - margin * 2;
    const usableHeight = pdfHeight - margin * 2;
    const pxToMm = usableWidth / 794;
    const fillPageBackground = () => {
      if (!pageBackground) return;
      const [r, g, b] = hexToRgb(pageBackground);
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
    };
    fillPageBackground();
    let isFirst = true;
    let currentYMm = margin;
    const pageEls = container.querySelectorAll<HTMLElement>('.page');
    const pageList = pageEls.length ? Array.from(pageEls) : [container];

    for (const pageEl of pageList) {
      const imgs = pageEl.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(img =>
        new Promise<void>(resolve => {
          if (img.complete) resolve();
          else { img.onload = () => resolve(); img.onerror = () => resolve(); }
        })
      ));
      // .school-header is now nested inside .exam-block (the school report
      // card redesign), so it must not also be selected standalone here —
      // that would rasterize the header twice (once alone, once as part of
      // its parent .exam-block).
      const blocks = pageEl.querySelectorAll<HTMLElement>(
        '.logo-header,.student-table, .exam-block'
      );
      const blockList = blocks.length ? Array.from(blocks) : [pageEl];
      for (const block of blockList) {
        block.style.pageBreakInside = 'avoid';
        block.style.breakInside = 'avoid';
        const canvas = await html2canvas(block, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794,
          logging: false
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const blockHeightMm = (canvas.height / 2) * pxToMm;
        if (!isFirst && currentYMm + blockHeightMm > pdfHeight - margin) {
          pdf.addPage();
          fillPageBackground();
          currentYMm = margin;
        }
        if (isFirst) {
          isFirst = false;
        }
        if (blockHeightMm > usableHeight) {
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const sliceHeightPx = Math.floor(usableHeight / pxToMm) * 2;
          let yPosPx = 0;
          while (yPosPx < canvasHeight) {
            const remainPx = canvasHeight - yPosPx;
            const currentSlicePx = Math.min(sliceHeightPx, remainPx);
            const currentSliceMm = (currentSlicePx / 2) * pxToMm;
            if (currentYMm + currentSliceMm > pdfHeight - margin && yPosPx > 0) {
              pdf.addPage();
              fillPageBackground();
              currentYMm = margin;
            }
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvasWidth;
            sliceCanvas.height = currentSlicePx;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, 0, yPosPx, canvasWidth, currentSlicePx, 0, 0, canvasWidth, currentSlicePx);
            }
            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
            pdf.addImage(sliceData, 'JPEG', margin, currentYMm, usableWidth, currentSliceMm);
            currentYMm += currentSliceMm;
            yPosPx += currentSlicePx;
          }
          currentYMm += blockGapMm;
        } else {
          pdf.addImage(imgData, 'JPEG', margin, currentYMm, usableWidth, blockHeightMm);
          currentYMm += blockHeightMm + blockGapMm;
        }
      }
      if (pageList.indexOf(pageEl) < pageList.length - 1) {
        pdf.addPage();
        fillPageBackground();
        currentYMm = margin;
        isFirst = false;
      }
    }
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
};

// export const exportToPdf = async (
//   html: string,
//   fileName: string = 'performance.pdf'
// ): Promise<void> => {
//   const container = document.createElement('div');
//   container.style.cssText = `
//     position: fixed;
//     top: -9999px;
//     left: -9999px;
//     width: 794px;
//     background: white;
//     padding: 20px 30px;
//     font-family: 'Segoe UI', Arial, sans-serif;
//     font-size: 11pt;
//     color: #111;
//     z-index: -1;
//   `;
//   const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
//   container.innerHTML = bodyMatch ? bodyMatch[1] : html;
//   const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
//   if (styleMatch) {
//     const styleEl = document.createElement('style');
//     styleEl.textContent = styleMatch[1];
//     container.prepend(styleEl);
//   }
//   document.body.appendChild(container);
//   try {
//     const pdf = new jsPDF('p', 'mm', 'a4');
//     const pageWidth = 794;
//     const a4HeightPx = 1123;
//     const pdfWidth = 210;
//     const pdfHeight = 297;
//     const margin = 10;
//     const pages = container.querySelectorAll<HTMLElement>('.page');
//     const pageList: HTMLElement[] = pages.length
//       ? Array.from(pages)
//       : [container];
//     let isFirst = true;
//     for (const page of pageList) {
//       page.style.pageBreakAfter = 'auto';
//       const canvas = await html2canvas(page, {
//         scale: 2,
//         useCORS: true,
//         allowTaint: true,
//         backgroundColor: '#ffffff',
//         width: pageWidth,
//         windowWidth: pageWidth
//       });
//       const imgData = canvas.toDataURL('image/jpeg', 0.95);
//       const canvasWidth = canvas.width;
//       const canvasHeight = canvas.height;
//       const ratio = (pdfWidth - margin * 2) / canvasWidth;
//       const imgHeightMm = canvasHeight * ratio;
//       const usableHeight = pdfHeight - margin * 2;
//       let yOffset = 0;
//       let remainingHeight = imgHeightMm;
//       while (remainingHeight > 0) {
//         if (!isFirst) pdf.addPage();
//         isFirst = false;
//         const sliceHeightMm = Math.min(remainingHeight, usableHeight);
//         const sliceHeightPx = sliceHeightMm / ratio;
//         const sliceCanvas = document.createElement('canvas');
//         sliceCanvas.width = canvasWidth;
//         sliceCanvas.height = Math.min(sliceHeightPx, canvasHeight - yOffset / ratio);
//         const ctx = sliceCanvas.getContext('2d');
//         if (ctx) {
//           ctx.drawImage(
//             canvas,
//             0, yOffset / ratio,
//             canvasWidth, sliceCanvas.height,
//             0, 0,
//             canvasWidth, sliceCanvas.height
//           );
//         }
//         const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
//         pdf.addImage(
//           sliceData,
//           'JPEG',
//           margin,
//           margin,
//           pdfWidth - margin * 2,
//           sliceHeightMm
//         );
//         yOffset += sliceHeightMm;
//         remainingHeight -= sliceHeightMm;
//       }
//     }
//     pdf.save(fileName);
//   } finally {
//     document.body.removeChild(container);
//   }
// };
