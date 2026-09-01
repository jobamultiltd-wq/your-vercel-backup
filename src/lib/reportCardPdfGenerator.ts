import { jsPDF } from 'jspdf';

export interface ReportCardSubject {
  subject: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  position?: string | undefined;
  highest?: number | undefined;
  lowest?: number | undefined;
  average?: number | undefined;
  remark?: string | undefined;

}

export interface ReportCardData {
  studentName: string;
  gender: string;
  admissionId: string;
  age: number | string;
  classLevel: string;
  specializedTrack?: string;
  term: string;
  session: string;
  resumptionDate: string;
  studentsInClass: number;
  classTeacherName: string;
  totalDaysInTerm: number;
  daysPresent: number;
  daysAbsent: number;
  classPosition: string;
  totalScore: number;
  totalObtainable: number;
  averageScore: number;
  overallGrade: string;
  subjects: ReportCardSubject[];
  affectiveSkills: { [key: string]: number };
  psychomotorSkills: { [key: string]: number };
  classTeacherRemarks: string;
  principalRemarks: string;
  infoToParents: string;
}

export function buildOfficialReportCardPDF(data: ReportCardData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;

  // 1. Outer Double Border (Government Document Standard)
  doc.setDrawColor(20, 40, 70); // Deep navy
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.2);
  doc.rect(margin + 1, margin + 1, contentWidth - 2, pageHeight - margin * 2 - 2);

  // 1b. Diagonal Watermark (security mark referenced in the footer note)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(243, 246, 250); // very light blue-grey
  doc.text('JOBA INTERNATIONAL ACADEMY', pageWidth / 2, 110, {
    align: 'center',
    angle: -45,
  });
  doc.text('JOBA INTERNATIONAL ACADEMY', pageWidth / 2, 210, {
    align: 'center',
    angle: -45,
  });


  // 2. School Letterhead Header
  // Top left school crest circle
  const crestX = margin + 4;
  const crestY = margin + 4;
  doc.setFillColor(11, 25, 44); // Midnight navy
  doc.circle(crestX + 11, crestY + 11, 10, 'F');
  doc.setFillColor(217, 119, 6); // Gold inner
  doc.circle(crestX + 11, crestY + 11, 8.5, 'F');
  doc.setFillColor(11, 25, 44);
  doc.circle(crestX + 11, crestY + 11, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('JIA', crestX + 11, crestY + 12.5, { align: 'center' });

  // Center: School Name and details
  doc.setTextColor(11, 25, 44);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('JOBA INTERNATIONAL ACADEMY', pageWidth / 2, margin + 7, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 100, 0); // Dark gold
  doc.text('Motto: Virtute et Devotione (By Virtue and Devotion)', pageWidth / 2, margin + 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(70, 80, 95);
  doc.text('B74 Araromi Street (Small London), behind Lifesupport Diagnostic Centre, Ilesa, Osun State', pageWidth / 2, margin + 14.5, { align: 'center' });
  doc.text('TEL: 0705 065 6140   •   EMAIL: admission@jobamultiltd.com', pageWidth / 2, margin + 18, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 25, 44);
  doc.text('« STUDENT\'S ACADEMIC REPORT CARD »', pageWidth / 2, margin + 22.5, { align: 'center' });

  // Right: Class Position Box
  const badgeX = pageWidth - margin - 22;
  const badgeY = margin + 3.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(20, 40, 70);
  doc.setLineWidth(0.4);
  doc.rect(badgeX, badgeY, 18, 19, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 110, 125);
  doc.text('POSITION', badgeX + 9, badgeY + 4, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(11, 25, 44);
  doc.text(data.classPosition || '—', badgeX + 9, badgeY + 11, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(180, 100, 0);
  doc.text(data.studentsInClass > 0 ? `OF ${data.studentsInClass}` : '—', badgeX + 9, badgeY + 15.5, { align: 'center' });

  // 3. Horizontal Separator
  let currentY = margin + 25;
  doc.setDrawColor(20, 40, 70);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 4. Student Name Banner
  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 25, 44);
  doc.text(data.studentName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

  currentY += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(60, 70, 85);
  doc.text(
    `Gender: ${data.gender}   |   Admission Number: ${data.admissionId}   |   Age: ${data.age || '13'}   |   Class: ${data.classLevel}${data.specializedTrack ? ' (' + data.specializedTrack + ')' : ''}`,
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );

  // 5. Term & Session Meta Table Box
  currentY += 2;
  const metaBoxY = currentY;
  const metaBoxHeight = 11;
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(180, 195, 215);
  doc.setLineWidth(0.3);
  doc.rect(margin + 2, metaBoxY, contentWidth - 4, metaBoxHeight, 'FD');

  const col1X = margin + 4;
  const col2X = margin + 68;
  const col3X = margin + 132;

  doc.setFontSize(6.5);
  doc.setTextColor(40, 50, 65);

  // Row 1
  doc.setFont('helvetica', 'bold'); doc.text('Term:', col1X, metaBoxY + 3.2);
  doc.setFont('helvetica', 'normal'); doc.text(data.term || '1st Term', col1X + 10, metaBoxY + 3.2);

  doc.setFont('helvetica', 'bold'); doc.text('Class:', col2X, metaBoxY + 3.2);
  doc.setFont('helvetica', 'normal'); doc.text(data.classLevel || 'JSS 1', col2X + 10, metaBoxY + 3.2);

  doc.setFont('helvetica', 'bold'); doc.text('Total Days In Term:', col3X, metaBoxY + 3.2);
  doc.setFont('helvetica', 'normal'); doc.text(String(data.totalDaysInTerm || 102), col3X + 27, metaBoxY + 3.2);

  // Row 2
  doc.setFont('helvetica', 'bold'); doc.text('Session:', col1X, metaBoxY + 6.8);
  doc.setFont('helvetica', 'normal'); doc.text(data.session || '2026/2027', col1X + 13, metaBoxY + 6.8);

  doc.setFont('helvetica', 'bold'); doc.text('Students in Class:', col2X, metaBoxY + 6.8);
  doc.setFont('helvetica', 'normal'); doc.text(String(data.studentsInClass || 35), col2X + 26, metaBoxY + 6.8);

  doc.setFont('helvetica', 'bold'); doc.text('Total Days Present:', col3X, metaBoxY + 6.8);
  doc.setFont('helvetica', 'normal'); doc.text(String(data.daysPresent || 98), col3X + 27, metaBoxY + 6.8);

  // Row 3
  doc.setFont('helvetica', 'bold'); doc.text('Resumption:', col1X, metaBoxY + 10.2);
  doc.setFont('helvetica', 'normal'); doc.text(data.resumptionDate || '11th Jan 2027', col1X + 18, metaBoxY + 10.2);

  doc.setFont('helvetica', 'bold'); doc.text('Class Teacher:', col2X, metaBoxY + 10.2);
  doc.setFont('helvetica', 'normal'); doc.text(data.classTeacherName || 'Mr. Emmanuel Olatunji', col2X + 20, metaBoxY + 10.2);

  doc.setFont('helvetica', 'bold'); doc.text('Total Days Absent:', col3X, metaBoxY + 10.2);
  doc.setFont('helvetica', 'normal'); doc.text(String(data.daysAbsent || 4), col3X + 27, metaBoxY + 10.2);

  currentY = metaBoxY + metaBoxHeight + 2;

  // 6. Watermark In Table Background
  doc.setTextColor(240, 244, 250);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text('JOBA ACADEMY', pageWidth / 2, currentY + 60, { align: 'center', angle: 30 });
  doc.setFontSize(22);
  doc.text('VIRTUTE ET DEVOTIONE', pageWidth / 2, currentY + 80, { align: 'center', angle: 30 });

  // 7. Results Table Layout (Left side table + Right side evaluations)
  const tableX = margin + 2;
  const tableWidth = 142;
  const rightSideX = tableX + tableWidth + 2;
  const rightSideWidth = contentWidth - tableWidth - 6;

  // Table Column Widths (Total: 142mm)
  // Subj(44), CA1(10), CA2(10), Exam(11), Total(11), Grade(10), Pos(11), High(11), Low(11), Avg(13) = 142mm
  const colW = {
    subject: 44,
    ca1: 10,
    ca2: 10,
    exam: 11,
    total: 11,
    grade: 10,
    pos: 11,
    high: 11,
    low: 11,
    avg: 13
  };

  const startTableY = currentY;
  const headerHeight = 14;

  // Draw Table Header Fill
  doc.setFillColor(235, 240, 248);
  doc.setDrawColor(40, 60, 90);
  doc.setLineWidth(0.3);
  doc.rect(tableX, startTableY, tableWidth, headerHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(11, 25, 44);

  // Subject Header
  doc.text('SUBJECTS', tableX + 3, startTableY + 8);

  // Header Sub-Columns (vertical / angled or multiline headers)
  let curColX = tableX + colW.subject;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('1st CA', curColX + 5, startTableY + 5, { align: 'center' });
  doc.text('(20)', curColX + 5, startTableY + 9.5, { align: 'center' });

  curColX += colW.ca1;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('2nd CA', curColX + 5, startTableY + 5, { align: 'center' });
  doc.text('(20)', curColX + 5, startTableY + 9.5, { align: 'center' });

  curColX += colW.ca2;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('EXAM', curColX + 5.5, startTableY + 5, { align: 'center' });
  doc.text('(60)', curColX + 5.5, startTableY + 9.5, { align: 'center' });

  curColX += colW.exam;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('TOTAL', curColX + 5.5, startTableY + 5, { align: 'center' });
  doc.text('(100)', curColX + 5.5, startTableY + 9.5, { align: 'center' });

  curColX += colW.total;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('GRADE', curColX + 5, startTableY + 8, { align: 'center' });

  curColX += colW.grade;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('SUBJ.', curColX + 5.5, startTableY + 5, { align: 'center' });
  doc.text('POS.', curColX + 5.5, startTableY + 9.5, { align: 'center' });

  curColX += colW.pos;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('SUBJ.', curColX + 5.5, startTableY + 5, { align: 'center' });
  doc.text('HIGH', curColX + 5.5, startTableY + 9.5, { align: 'center' });

  curColX += colW.high;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('SUBJ.', curColX + 5.5, startTableY + 5, { align: 'center' });
  doc.text('LOW', curColX + 5.5, startTableY + 9.5, { align: 'center' });

  curColX += colW.low;
  doc.line(curColX, startTableY, curColX, startTableY + headerHeight);
  doc.text('SUBJ.', curColX + 6.5, startTableY + 5, { align: 'center' });
  doc.text('AVG', curColX + 6.5, startTableY + 9.5, { align: 'center' });

  // Rows for Subjects
  let rowY = startTableY + headerHeight;
  const rowHeight = 7.2;

  data.subjects.forEach((sub, i) => {
    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 254);
    }
    doc.rect(tableX, rowY, tableWidth, rowHeight, 'FD');

    // Draw Column Vertical Lines
    let lineX = tableX + colW.subject;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.ca1;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.ca2;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.exam;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.total;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.grade;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.pos;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.high;
    doc.line(lineX, rowY, lineX, rowY + rowHeight); lineX += colW.low;
    doc.line(lineX, rowY, lineX, rowY + rowHeight);

    // Subject Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(15, 23, 42);
    doc.text(sub.subject, tableX + 2, rowY + 4.8);

    // Values
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(30, 41, 59);

    let cellX = tableX + colW.subject;
    doc.text(String(sub.ca1 || 0), cellX + 5, rowY + 4.8, { align: 'center' }); cellX += colW.ca1;
    doc.text(String(sub.ca2 || 0), cellX + 5, rowY + 4.8, { align: 'center' }); cellX += colW.ca2;
    doc.text(String(sub.exam || 0), cellX + 5.5, rowY + 4.8, { align: 'center' }); cellX += colW.exam;

    doc.setFont('helvetica', 'bold');
    doc.text(String(sub.total || 0), cellX + 5.5, rowY + 4.8, { align: 'center' }); cellX += colW.total;
    doc.text(sub.grade || 'A', cellX + 5, rowY + 4.8, { align: 'center' }); cellX += colW.grade;

    doc.setFont('helvetica', 'normal');
    doc.text(sub.position ?? '—', cellX + 5.5, rowY + 4.8, { align: 'center' }); cellX += colW.pos;
    doc.text(sub.highest != null ? String(sub.highest) : '—', cellX + 5.5, rowY + 4.8, { align: 'center' }); cellX += colW.high;
    doc.text(sub.lowest != null ? String(sub.lowest) : '—', cellX + 5.5, rowY + 4.8, { align: 'center' }); cellX += colW.low;
    doc.text(sub.average != null ? String(sub.average) : '—', cellX + 6.5, rowY + 4.8, { align: 'center' });

    rowY += rowHeight;
  });

  // Table Summary Footer Box
  doc.setFillColor(230, 238, 248);
  doc.rect(tableX, rowY, tableWidth, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(11, 25, 44);

  doc.text(`TOTAL SCORE:  ${data.totalScore} / ${data.totalObtainable}`, tableX + 3, rowY + 5.2);
  doc.text(`AVG. SCORE:  ${data.averageScore}%`, tableX + 65, rowY + 5.2);
  doc.text(`GRADE:  ${data.overallGrade}`, tableX + 115, rowY + 5.2);

  // 8. Right Side Evaluation Sidebars
  let sideY = startTableY;

  // A. Affective Skills (Rating 1 - 5)
  doc.setFillColor(240, 245, 252);
  doc.rect(rightSideX, sideY, rightSideWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(11, 25, 44);
  doc.text('AFFECTIVE SKILLS (1 - 5)', rightSideX + rightSideWidth / 2, sideY + 3.2, { align: 'center' });

  sideY += 4.5;
  const defaultAffective = [
    { name: 'PUNCTUALITY', score: data.affectiveSkills?.['punctuality'] || 5 },
    { name: 'POLITENESS', score: data.affectiveSkills?.['politeness'] || 5 },
    { name: 'NEATNESS', score: data.affectiveSkills?.['neatness'] || 5 },
    { name: 'HONESTY', score: data.affectiveSkills?.['honesty'] || 5 },
    { name: 'LEADERSHIP SKILL', score: data.affectiveSkills?.['leadership'] || 4 },
    { name: 'COOPERATION', score: data.affectiveSkills?.['cooperation'] || 5 },
    { name: 'ATTENTIVENESS', score: data.affectiveSkills?.['attentiveness'] || 5 },
    { name: 'PERSEVERANCE', score: data.affectiveSkills?.['perseverance'] || 5 },
    { name: 'ATTITUDE TO WORK', score: data.affectiveSkills?.['attitude_to_work'] || 5 },
  ];

  defaultAffective.forEach((trait) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(rightSideX, sideY, rightSideWidth - 8, 4.8, 'FD');
    doc.rect(rightSideX + rightSideWidth - 8, sideY, 8, 4.8, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(30, 41, 59);
    doc.text(trait.name, rightSideX + 1.5, sideY + 3.4);

    doc.setFont('helvetica', 'bold');
    doc.text(String(trait.score), rightSideX + rightSideWidth - 4, sideY + 3.4, { align: 'center' });
    sideY += 4.8;
  });

  // B. Psychomotor Skills (Rating 1 - 5)
  sideY += 2;
  doc.setFillColor(240, 245, 252);
  doc.rect(rightSideX, sideY, rightSideWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(11, 25, 44);
  doc.text('PSYCHOMOTOR SKILLS (1 - 5)', rightSideX + rightSideWidth / 2, sideY + 3.2, { align: 'center' });

  sideY += 4.5;
  const defaultPsychomotor = [
    { name: 'HANDWRITING', score: data.psychomotorSkills?.['handwriting'] || 4 },
    { name: 'VERBAL FLUENCY', score: data.psychomotorSkills?.['verbal_fluency'] || 5 },
    { name: 'SPORTS & GAMES', score: data.psychomotorSkills?.['sports'] || 4 },
    { name: 'HANDLING TOOLS', score: data.psychomotorSkills?.['handling_tools'] || 5 },
    { name: 'DRAWING & ART', score: data.psychomotorSkills?.['drawing_painting'] || 4 },
  ];

  defaultPsychomotor.forEach((trait) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(rightSideX, sideY, rightSideWidth - 8, 4.8, 'FD');
    doc.rect(rightSideX + rightSideWidth - 8, sideY, 8, 4.8, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(30, 41, 59);
    doc.text(trait.name, rightSideX + 1.5, sideY + 3.4);

    doc.setFont('helvetica', 'bold');
    doc.text(String(trait.score), rightSideX + rightSideWidth - 4, sideY + 3.4, { align: 'center' });
    sideY += 4.8;
  });

  // C. Official Grading System Scale
  sideY += 2;
  doc.setFillColor(240, 245, 252);
  doc.rect(rightSideX, sideY, rightSideWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(11, 25, 44);
  doc.text('GRADING SCALE', rightSideX + rightSideWidth / 2, sideY + 3.2, { align: 'center' });

  sideY += 4.5;
  const gradingScale = [
    { grade: 'A', range: '80 - 100 (Distinction)' },
    { grade: 'B', range: '65 - 79 (Very Good)' },
    { grade: 'C', range: '50 - 64 (Credit)' },
    { grade: 'D', range: '45 - 49 (Pass)' },
    { grade: 'F', range: '0 - 44 (Fail)' },
  ];

  gradingScale.forEach((g) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(rightSideX, sideY, 8, 4.2, 'FD');
    doc.rect(rightSideX + 8, sideY, rightSideWidth - 8, 4.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.4);
    doc.text(g.grade, rightSideX + 4, sideY + 3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(g.range, rightSideX + 9.5, sideY + 3);
    sideY += 4.2;
  });

  // 9. Remarks & Signature / Stamp Section
  currentY = Math.max(rowY + 10, sideY + 2);

  // Remarks Box (Left) & Stamp Box (Right)
  const remarksWidth = contentWidth - 40;
  const stampWidth = 36;
  const remarksHeight = 26;

  // Teacher & Head Remarks
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 195, 215);
  doc.rect(margin + 2, currentY, remarksWidth, remarksHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(11, 25, 44);
  doc.text('CLASS TEACHER REMARKS:', margin + 4, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(data.classTeacherRemarks || 'An exceptional, disciplined, and brilliant student.', margin + 40, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 25, 44);
  doc.text('SCHOOL HEAD REMARKS:', margin + 4, currentY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(data.principalRemarks || '—', margin + 38, currentY + 11.5);

  // Info to parents
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(180, 100, 0);
  doc.text('INFO TO PARENTS:', margin + 4, currentY + 18.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 95);
  doc.text(data.infoToParents || 'We thank God for an awesome term. Next term fees are payable on or before resumption.', margin + 28, currentY + 18.5);

  // Stamp / Signature Box (Right)
  const stampBoxX = margin + remarksWidth + 4;
  doc.setFillColor(250, 252, 255);
  doc.rect(stampBoxX, currentY, stampWidth, remarksHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 110, 125);
  doc.text('SIGNATURE / OFFICIAL STAMP', stampBoxX + stampWidth / 2, currentY + 4.5, { align: 'center' });

  // Official Seal Graphic
  doc.setDrawColor(11, 25, 44);
  doc.setLineWidth(0.4);
  doc.circle(stampBoxX + stampWidth / 2, currentY + 14.5, 6.5);
  doc.setFontSize(3.6);
  doc.setTextColor(11, 25, 44);
  doc.text('JOBA ACADEMY', stampBoxX + stampWidth / 2, currentY + 13.5, { align: 'center' });
  doc.text('OFFICIAL SEAL', stampBoxX + stampWidth / 2, currentY + 16, { align: 'center' });

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 70, 85);
  doc.text('Principal / Directorate', stampBoxX + stampWidth / 2, currentY + 23.5, { align: 'center' });

  // 10. Footer Security Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(130, 140, 155);
  doc.text(
    `Official Academic Report generated by Joba International Academy Portal on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}. Valid with official watermark and school stamp.`,
    pageWidth / 2,
    pageHeight - margin - 2,
    { align: 'center' }
  );

  return doc;
}

export function downloadOfficialReportCardPDF(data: ReportCardData) {
  const doc = buildOfficialReportCardPDF(data);
  const safeId = data.admissionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeTerm = data.term.replace(/\s+/g, '_');
  doc.save(`Academic_Report_Card_${safeId}_${safeTerm}.pdf`);
}
