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
}

export interface PrintMockExam {
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

// ─────────────────────────────────────────────────────────────────────────────
// CPT PRINT HTML
// ─────────────────────────────────────────────────────────────────────────────
export const buildCPTPrintHtml = async (
  student: PrintStudent,
  mockExams: PrintMockExam[],
  batchStatsMap: Map<string, SectionStats[]>,
): Promise<string> => {
  const logo = await getLogoBase64();
  const logoHtml = logo
    ? `<img src="${logo}" alt="Z7i" style="height:60px;max-width:200px;object-fit:contain;" />`
    : `<h2>Z7i INSTITUTE</h2><p>JEE | NEET | Foundation</p>`;
  const examTablesHtml = mockExams
    .map((exam) => {
      const stats = batchStatsMap.get(exam.examName) || [];
      const statsMap = new Map(stats.map((s) => [s.sectionId, s]));
      const rows = exam.sectionResults
        .map((sec, i) => {
          const stat = statsMap.get(sec.sectionId);
          const avg = stat ? stat.avgObtained.toFixed(2) : '—';
          const highest = stat ? stat.maxObtained : '—';
          return `
        <tr>
          <td>${i + 1}</td>
          <td>${sec.subjectName || sec.sectionId || '—'}</td>
          <td class="text-center">${avg}</td>
          <td class="text-center">${highest}</td>
          <td class="text-center">
            <a style="color:#1a56db;font-weight:bold;">${sec.obtainedMarks}</a>
            <br/><span style="color:#6b7280;font-size:10px;">${sec.totalMarks}</span>
          </td>
        </tr>`;
        })
        .join('');
      const examDate = exam.syncedAt ? formatDate(exam.syncedAt) : '';
      return `
      <div class="exam-block">
        <div class="exam-header">${exam.examName?.toUpperCase() || 'EXAM'} ${examDate ? '— ' + examDate : ''}</div>
        <table class="marks-table">
          <thead>
            <tr>
              <th style="width:40px;">S.NO</th>
              <th>TOPIC & DATE</th>
              <th class="text-center">AVERAGE MARK</th>
              <th class="text-center">HIGHEST MARK</th>
              <th class="text-center">MARKS OBTAINED BY STUDENT</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="total-row">
          <span><strong>TOTAL MARKS ${exam.obtainedMarks ?? 0}</strong></span>
          <span>Overall Rank <strong>${exam.rank ?? '—'}</strong></span>
        </div>
      </div>`;
    })
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

        /* Header */
        .logo-header { text-align: center; margin-bottom: 16px; }
        .logo-header h2 { font-size: 20pt; font-weight: 800; letter-spacing: 1px; }
        .logo-header p { font-size: 10pt; color: #555; }

        /* Student details table */
        .student-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ccc; }
        .student-table th { background: #1a3a6b; color: #fff; text-align: center; padding: 6px 10px; font-size: 11pt; letter-spacing: 1px; }
        .student-table td { padding: 5px 10px; border: 1px solid #ccc; font-size: 10.5pt; }
        .student-table td:first-child { font-weight: 600; width: 160px; background: #f8f9fa; }

        /* Exam block */
        exam-block { margin-bottom:18px; page-break-inside: avoid; break-inside: avoid; }
        .exam-header {
          background: #1a56db;
          color: #fff;
          padding: 6px 12px;
          font-size: 10pt;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 0;
        }

        /* Marks table */
        .marks-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        .marks-table th {
          background: #e8f0fe;
          border: 1px solid #ccc;
          padding: 5px 8px;
          font-weight: 700;
          font-style: italic;
          text-align: left;
        }
        .marks-table td { border: 1px solid #ccc; padding: 5px 8px; }
        .text-center { text-align: center !important; }

        .logo-header { text-align:center; margin-bottom:16px; }
        
        .logo-header img { display:block; margin:0 auto; }

        /* Total row */
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 10px;
          background: #f0f4ff;
          border: 1px solid #ccc;
          border-top: none;
          font-size: 10.5pt;
        }

        @media print {
          body { padding: 8px 15px; }
          .page { page-break-after: always; }
          @page { margin: 10mm 12mm; }
        }
          
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Logo/Header -->
        <div class="logo-header">
          <img src="/assets/z7i_logo.png" 
       alt="Z7i Institute" 
       style="height:60px; max-width:200px; object-fit:contain;" 
       crossorigin="anonymous" />
          <p>JEE | NEET | Foundation</p>
        </div>

        <!-- Student Details -->
        <table class="student-table">
          <thead>
            <tr><th colspan="2">STUDENT DETAILS</th></tr>
          </thead>
          <tbody>
            <tr><td>Name</td><td>${student.studentName || '—'}</td></tr>
            <tr><td>Class</td><td>${student.classNo ? 'Class ' + student.classNo : '—'}</td></tr>
            <tr><td>ID No</td><td>${student.admissionNo || '—'}</td></tr>
            <tr><td>Enrollment Number</td><td>${student.admissionNo || '—'}</td></tr>
            <tr><td>Program</td><td>${student.programName || '—'}</td></tr>
          </tbody>
        </table>

        <!-- Exam Tables -->
        ${examTablesHtml || '<p style="text-align:center;color:#888;padding:20px;">No mock exam data available.</p>'}

      </div>
    </body>
    </html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL PRINT HTML
// ─────────────────────────────────────────────────────────────────────────────
export const buildSchoolPrintHtml = (
  student: PrintStudent,
  schoolExams: PrintSchoolExam[],
): string => {
  const examBlocksHtml = schoolExams
    .map((exam) => {
      const subjectRows = exam.subjects
        .map(
          (sub) => `
      <tr>
        <td>${sub.subjectName || '—'}</td>
        <td class="text-center fw-bold">${sub.obtainedMarks ?? '—'}</td>
        <td class="text-center">${sub.grade || '—'}</td>
      </tr>`,
        )
        .join('');

      return `
      <div class="exam-block">
        <div class="school-exam-header">
          SCHOLASTIC PERFORMANCE — ${(exam.examName || 'EXAM').toUpperCase()}
          ${exam.examDate ? ' (' + formatDate(exam.examDate) + ')' : ''}
        </div>
        <div class="student-meta">
          Name of Student: <strong>${student.studentName}</strong>
          &nbsp;&nbsp; ID No: <strong>${student.admissionNo}</strong>
          &nbsp;&nbsp; Class: <strong>${student.classNo ? 'Class ' + student.classNo : '—'}</strong>
        </div>
        <table class="marks-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th class="text-center">Marks Obtained</th>
              <th class="text-center">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows || '<tr><td colspan="3" style="text-align:center;color:#888;">No subject data</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td style="font-weight:700;">Total Marks</td>
              <td class="text-center fw-bold">${exam.obtainedMarks ?? '—'}</td>
              <td class="text-center">${exam.percentage != null ? exam.percentage.toFixed(1) + '%' : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    })
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

        .school-header { text-align: center; margin-bottom: 6px; }
        .school-header h2 { font-size: 16pt; font-weight: 800; }
        .school-header p { font-size: 10pt; color: #444; }
        .school-header hr { border: 1px solid #333; margin: 6px 0; }

        .exam-block { margin-bottom: 22px; }
        .school-exam-header {
          font-size: 11pt;
          font-weight: 700;
          text-decoration: underline;
          margin-bottom: 6px;
          color: #1a3a6b;
        }
        .student-meta {
          font-size: 10pt;
          margin-bottom: 8px;
          color: #333;
        }

        .marks-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 4px; }
        .marks-table th {
          border: 1px solid #333;
          padding: 5px 10px;
          font-weight: 700;
          background: #f0f0f0;
          text-align: left;
        }
        .marks-table td { border: 1px solid #333; padding: 5px 10px; }
        .marks-table tfoot td { font-weight: 700; background: #f8f9fa; }
        .text-center { text-align: center !important; }
        .fw-bold { font-weight: 700; }

        @media print {
          body { padding: 8px 15px; }
          .page { page-break-after: always; }
          @page { margin: 10mm 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="page">

        <!-- School Header -->
        <div class="school-header">
          <h2>SUGUNA PIP SCHOOL</h2>
          <p>(A CBSE affiliated Sr. Sec. School)</p>
          <hr/>
        </div>

        <!-- Exam Blocks -->
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
): Promise<string> => {
  const logo = await getLogoBase64();
  const logoHtml = logo
    ? `<img src="${logo}" alt="Z7i" style="height:60px;max-width:200px;object-fit:contain;" />`
    : `<h2>Z7i INSTITUTE</h2><p>JEE | NEET | Foundation</p>`;
  const examTablesHtml = mockExams
    .map((exam: any) => {
      const stats = batchStatsMap.get(exam.examId) || [];
      const statsMap = new Map(stats.map((s) => [s.sectionId, s]));
      const rows = (exam.sectionResults || [])
        .map((sec: any, i: number) => {
          const stat = statsMap.get(sec.sectionId);
          return `
        <tr>
          <td>${i + 1}</td>
          <td>${sec.subjectName || sec.sectionId || '—'}</td>
          <td class="text-center">${stat ? stat.avgObtained.toFixed(2) : '—'}</td>
          <td class="text-center">${stat ? stat.maxObtained : '—'}</td>
          <td class="text-center">
            <a style="color:#1a56db;font-weight:bold;">${sec.obtainedMarks}</a>
            <br/><span style="color:#6b7280;font-size:10px;">${sec.totalMarks}</span>
          </td>
        </tr>`;
        })
        .join('');
      return `
      <div class="exam-block">
        <div class="exam-header">${(exam.examName || 'EXAM').toUpperCase()}</div>
        <table class="marks-table">
          <thead>
            <tr>
              <th style="width:40px;">S.NO</th>
              <th>TOPIC & DATE</th>
              <th class="text-center">AVERAGE MARK</th>
              <th class="text-center">HIGHEST MARK</th>
              <th class="text-center">MARKS OBTAINED BY STUDENT</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total-row">
          <span><strong>TOTAL MARKS ${exam.obtainedMarks ?? 0}</strong></span>
          <span>Overall Rank <strong>${exam.rank ?? '—'}</strong></span>
        </div>
      </div>`;
    })
    .join('');

  return `
    <div class="page">
      <div class="logo-header">
        ${logoHtml}
       <p  style="margin-top:4px;font-size:10pt;color:#555;">JEE | NEET | Foundation</p>
      </div>
      <table class="student-table">
        <thead><tr><th colspan="2">STUDENT DETAILS</th></tr></thead>
        <tbody>
          <tr><td>Name</td><td>${student.studentName}</td></tr>
          <tr><td>Class</td><td>${student.classNo ? 'Class ' + student.classNo : '—'}</td></tr>
          <tr><td>ID No</td><td>${student.admissionNo}</td></tr>
          <tr><td>Program</td><td>${student.programName}</td></tr>
        </tbody>
      </table>
      ${examTablesHtml}
    </div>`;
};

export const buildSchoolPageHtml = async (
  student: PrintStudent,
  schoolExams: PrintSchoolExam[],
): Promise<string> => {
    const logo = await getSchoolLogoBase64();
  const logoHtml = logo
    ? `<img src="${logo}" alt="Suguna PIP School" style="height:80px;max-width:220px;object-fit:contain;" />`
    : `<h2>SUGUNA PIP SCHOOL</h2>`;
  const examBlocksHtml = schoolExams
    .map((exam: any) => {
      const rows = (exam.subjects || [])
        .map(
          (sub: any) => `
      <tr>
        <td>${sub.subjectName || '—'}</td>
        <td class="text-center fw-bold">${sub.obtainedMarks ?? '—'}</td>
        <td class="text-center">${sub.grade || '—'}</td>
      </tr>`,
        )
        .join('');
      return `
      <div class="exam-block">
        <div class="school-exam-header">
          SCHOLASTIC PERFORMANCE — ${(exam.examName || 'EXAM').toUpperCase()}
          ${exam.examDate ? ' (' + formatDate(exam.examDate) + ')' : ''}
        </div>
        <div class="student-meta">
          Name: <strong>${student.studentName}</strong>
          &nbsp; ID: <strong>${student.admissionNo}</strong>
          &nbsp; Class: <strong>${student.classNo ? 'Class ' + student.classNo : '—'}</strong>
        </div>
        <table class="marks-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th class="text-center">Marks Obtained</th>
              <th class="text-center">Grade</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td style="font-weight:700;">Total</td>
              <td class="text-center fw-bold">${exam.obtainedMarks ?? '—'}</td>
              <td class="text-center">${exam.percentage != null ? exam.percentage.toFixed(1) + '%' : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    })
    .join('');

  return `
    <div class="page">
      <div class="school-header">
        ${logoHtml}
        <p>(A CBSE affiliated Sr. Sec. School)</p>
        <hr/>
      </div>
      ${examBlocksHtml}
    </div>`;
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
    .student-table { width:100%; border-collapse:collapse; margin-bottom:24px; border:1px solid #ccc; }
    .student-table th { background:#1a3a6b; color:#fff; text-align:center; padding:8px 10px; font-size:12pt; letter-spacing:1px; }
    .student-table td { padding:6px 10px; border:1px solid #ccc; font-size:10.5pt; }
    .student-table td:first-child { font-weight:600; width:160px; background:#f8f9fa; }
    .exam-block { margin-bottom:20px; page-break-inside:avoid; break-inside:avoid; }
    .exam-header { background:#1a56db; color:#fff; padding:7px 12px; font-size:10pt; font-weight:700; margin-bottom:0; }
    .marks-table { width:100%; border-collapse:collapse; font-size:10pt; }
    .marks-table th { background:#e8f0fe; border:1px solid #ccc; padding:6px 8px; font-weight:700; font-style:italic; text-align:left; }
    .marks-table td { border:1px solid #ccc; padding:6px 8px; }
    .total-row { display:flex; justify-content:space-between; padding:6px 10px; background:#f0f4ff; border:1px solid #ccc; border-top:none; font-size:10.5pt; margin-bottom:4px; }`;

  const schoolStyles = `
    .school-header { text-align:center; margin-bottom:16px; padding-bottom:10px; }
    .school-header img { display:block; margin:0 auto; }
    .school-header hr { border:1px solid #333; margin:10px 0 0 0; }
    .exam-block { margin-bottom:24px; page-break-inside:avoid; break-inside:avoid; }
    .school-exam-header { font-size:11pt; font-weight:700; text-decoration:underline; margin-bottom:8px; color:#1a3a6b; }
    .student-meta { font-size:10pt; margin-bottom:8px; color:#333; }
    .marks-table { width:100%; border-collapse:collapse; font-size:10.5pt; margin-bottom:4px; }
    .marks-table th { border:1px solid #333; padding:6px 10px; font-weight:700; background:#f0f0f0; text-align:left; }
    .marks-table td { border:1px solid #333; padding:6px 10px; }
    .marks-table tfoot td { font-weight:700; background:#f8f9fa; }`;

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

export const exportToPdf = async (
  html: string,
  fileName: string = 'performance.pdf'
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
    const usableWidth = pdfWidth - margin * 2;
    const usableHeight = pdfHeight - margin * 2;
    const pxToMm = usableWidth / 794;
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
      const blocks = pageEl.querySelectorAll<HTMLElement>(
        '.logo-header,.student-table, .school-header, .exam-block'
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
        } else {
          pdf.addImage(imgData, 'JPEG', margin, currentYMm, usableWidth, blockHeightMm);
          currentYMm += blockHeightMm;
        }
      }
      if (pageList.indexOf(pageEl) < pageList.length - 1) {
        pdf.addPage();
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
