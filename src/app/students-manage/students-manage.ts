import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ApisService } from './../apis-service';
import { Component, OnInit, signal, computed } from '@angular/core';
import jsPDF from 'jspdf';
import * as arabicReshaper from 'arabic-reshaper';
 //@ts-ignore
import bidi from 'bidi-js';
import autoTable from 'jspdf-autotable';
interface Student {
  STUDENT_ID: number;
  NAME: string;
  PHONE: string;
  GRADE_ID: string;   
}
interface StudentReportGroup {
  GROUP_ID: number;
  GROUP_NAME: string;
  AVG_RATING: number;
  RATINGS_COUNT: number;
  NOTES: string;
}

interface AttendanceSummary {
  PRESENT_COUNT: number;
  ABSENT_COUNT: number;
  LATE_COUNT: number;
}

interface StudentReport {
  studentId: number;
  overallRating: number;
  groups: StudentReportGroup[];
  attendance?: AttendanceSummary;  
}

@Component({
  selector: 'app-students-manage',
  imports: [FormsModule],
  templateUrl: './students-manage.html',
  styleUrl: './students-manage.css',
})
export class StudentsManage {
 searchText = signal('');
  loading = signal(true);
students = signal<Student[]>([]);
grades = signal<{GRADE_ID: string, GRADE_NAME: string}[]>([]);
studentSearch = signal('');                 
filterGradeId = signal<string | null>(null); 



  editingStudentId = signal<number | null>(null);

  newStudent = signal<Student>({
    STUDENT_ID: 0,
    NAME: '',
    PHONE: '',
    GRADE_ID: ''
  });
  filteredStudents = computed(() => {
    const search = this.studentSearch().toLowerCase().trim();
    const gradeFilter = this.filterGradeId();
  
    return this.students().filter(s => {
      const matchesName = (s.NAME ?? '').toLowerCase().includes(search);
      const matchesGrade = gradeFilter ? s.GRADE_ID === gradeFilter : true;
      return matchesName && matchesGrade;
    });
  });
  
  getGradeName(gradeId: string): string {
    const g = this.grades().find(x => x.GRADE_ID === gradeId);
    return g ? g.GRADE_NAME : '—';
  }
  
  fetchGrades() {
    this.api.getGrades().subscribe({
      next: (data: any[]) => {
        this.grades.set(
          data.map(g => ({
            GRADE_ID: g.GRADE_ID.toString(), 
            GRADE_NAME: g.NAME
          }))
        );
      },
      error: err => console.error('خطأ في جلب الصفوف', err)
    });
  }
  

  
  

  constructor(private api: ApisService) {
    this.fetchStudents();
    this.fetchGrades();  

  }

  fetchStudents() {
    this.loading.set(true);

    this.api.getStudents().subscribe({
      next: (data: any[]) => {
        this.students.set(
          data.map(item => ({
            STUDENT_ID: item.STUDENT_ID,
            NAME: item.NAME,
            PHONE: item.PHONE,
            GRADE_ID: item.GRADE_ID.toString()
          }))
        );
        this.loading.set(false);
        console.log(data)
      },
      error: err => {
        console.error('خطأ في جلب الطلاب', err);
        this.loading.set(false);
      }
    });
  }

  addStudent() {
    const tempId = Date.now();  
    this.newStudent.set({
      STUDENT_ID: tempId,
      NAME: '',
      PHONE: '',
      GRADE_ID: ''
    });
    this.editingStudentId.set(tempId);
    this.students.update(list => [this.newStudent(), ...list]);
  }

  editStudent(student: Student) {
    this.editingStudentId.set(student.STUDENT_ID);
    this.newStudent.set({ ...student });
  }

  saveStudent() {
    const data = this.newStudent();
    const id = this.editingStudentId();
    this.loading.set(true);

    const exists = this.students().some(t => t.STUDENT_ID === id && t !== data);

    if (exists) {
      this.api.updateStudent(id!, data).subscribe({
        next: () => {
          this.students.update(list => list.map(s => s.STUDENT_ID === id ? data : s));
          this.finishAction();
        },
        error: () => this.handleError()
      });
    }
   
    else {
      this.api.addStudent(data).subscribe({
        next: (saved: any) => {
          const newStudent: Student = {
            STUDENT_ID: saved.STUDENT_ID,
            NAME: saved.NAME,
            PHONE: saved.PHONE,
            GRADE_ID: saved.GRADE_ID
          };
    
          this.students.update(list =>
            list.map(s => s.STUDENT_ID === id ? newStudent : s)
          );
    
          this.finishAction();
        },
        error: () => this.handleError()
      });
    }
    
  }

  deleteStudent(student: Student) {
    if (confirm(`هل أنت متأكد من حذف الطالب ${student.NAME}؟`)) {
      this.loading.set(true);
      this.api.deleteStudent(student.STUDENT_ID).subscribe({
        next: () => {
          this.students.update(list => list.filter(s => s.STUDENT_ID !== student.STUDENT_ID));
          this.loading.set(false);
        },
        error: () => {
          alert('فشل الحذف');
          this.loading.set(false);
        }
      });
    }
  }

  finishAction() {
    this.editingStudentId.set(null);
    this.loading.set(false);
  }

  handleError() {
    alert('حدث خطأ ما');
    this.loading.set(false);
  }

  cancelAdd() {
    const id = this.editingStudentId();
    const isTemp = this.newStudent().STUDENT_ID.toString().length > 12;
    if (isTemp) {
      this.students.update(list => list.filter(s => s.STUDENT_ID !== id));
    }
    this.editingStudentId.set(null);
  }

  showReport = signal(false);
  selectedStudent = signal<Student | null>(null);
  studentReport = signal<StudentReport | null>(null);
  
  openStudentReport(student: Student) {
    this.selectedStudent.set(student);
    this.showReport.set(true);
    this.studentReport.set(null);
  
    forkJoin({
      report: this.api.getStudentReport(student.STUDENT_ID),
      attendance: this.api.getStudentAttendanceSummary(student.STUDENT_ID)
    }).subscribe(({ report, attendance }) => {
      this.studentReport.set({
        ...report,
        attendance
      });
    });
  }
  
  
  closeReport() {
    this.showReport.set(false);
    this.studentReport.set(null);
    this.selectedStudent.set(null);
  }
  private arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  

async generatePdf(report: StudentReport) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;


  const drawPageTemplate = async () => {
    doc.setFillColor(12, 12, 12);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    const watermarkImg = await this.loadLogo();
    if (watermarkImg) {
      const wmWidth = 330;
      const imgProps = doc.getImageProperties(watermarkImg);
      const wmHeight = (imgProps.height * wmWidth) / imgProps.width;

      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
      doc.addImage(
        watermarkImg, 
        'PNG', 
        (pageWidth - wmWidth) / 2, 
        (pageHeight - wmHeight) / 2, 
        wmWidth, 
        wmHeight
      );
      doc.restoreGraphicsState();
    }

    doc.saveGraphicsState();
 
    doc.restoreGraphicsState();
  };

  const fontBase64 = await this.loadFont();
  doc.addFileToVFS('CustomFont.ttf', fontBase64);
  doc.addFont('CustomFont.ttf', 'custom', 'normal');
  doc.setFont('custom');

  await drawPageTemplate();

  let y = 20;

 

doc.setTextColor(255, 193, 7);
doc.setFontSize(24);
doc.text('PHOENIX', pageWidth / 2, y + 10, { align: 'center' });

doc.setFontSize(9);
doc.setTextColor(130, 130, 130);
doc.text('ACADEMY LEARNING SYSTEM', pageWidth / 2, y + 16, { align: 'center' });
  y += 40;



  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  const studentName = '  إسم الطالب / '+ this.selectedStudent()?.NAME ;
  doc.text(studentName, pageWidth - margin - 10, y + 15, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text('تقرير الأداء الأكاديمي لآخر 30 يوم', pageWidth - margin - 10, y + 25, { align: 'right' });

  doc.setDrawColor(255, 193, 7);
  doc.circle(margin + 20, y + 20, 14, 'D');
  doc.setFontSize(16);
  doc.setTextColor(255, 193, 7);
  doc.text(`${report.overallRating}/5`, margin + 20, y + 22, { align: 'center' });

  y += 55;

  const colWidth = (pageWidth - (margin * 2)) / 3;
  const stats = [
    { label: 'حضور', val: report.attendance?.PRESENT_COUNT || 0, color: [76, 175, 80] },
    { label: 'تأخير', val: report.attendance?.LATE_COUNT || 0, color: [255, 193, 7] },
    { label: 'غياب', val: report.attendance?.ABSENT_COUNT || 0, color: [244, 67, 54] }
  ];

  stats.forEach((stat, i) => {
    const xPos = margin + (i * colWidth);
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
    doc.setFillColor(35, 35, 35);
    doc.roundedRect(xPos + 2, y, colWidth - 4, 25, 2, 2, 'F');
    doc.restoreGraphicsState();
    
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text(stat.label, xPos + (colWidth/2), y + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.text(`${stat.val}`, xPos + (colWidth/2), y + 18, { align: 'center' });
  });

  y += 45;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('سجل المجموعات والملاحظات', pageWidth - margin, y, { align: 'right' });
  y += 12;

  for (const group of report.groups) {
    const notes = group.NOTES?.split('\n') || ['لا توجد ملاحظات مسجلة'];
    const cardHeight = 25 + (notes.length * 8);

    if (y + cardHeight > pageHeight - 20) {
      doc.addPage();
      await drawPageTemplate();
      y = 25;
    }

    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.6 })); 
    doc.setFillColor(30, 30, 30);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), cardHeight, 2, 2, 'F');
    doc.restoreGraphicsState();

    doc.setFontSize(13);
    doc.setTextColor(255, 193, 7);
    doc.text(group.GROUP_NAME, pageWidth - margin - 8, y + 10, { align: 'right' });

    const ratingText = group.AVG_RATING.toString() + " "; 
    const ratingInt = Math.round(group.AVG_RATING);
    const stars = '★'.repeat(ratingInt);
    const emptyStars = '☆'.repeat(5 - ratingInt);
    
    let currentX = margin + 8;
    
    doc.setTextColor(255, 193, 7); 
    doc.text(ratingText, currentX, y + 10);
    
    const ratingWidth = doc.getTextWidth(ratingText);
    currentX += ratingWidth;
    
    doc.text(stars, currentX, y + 10);
    
    const starsWidth = doc.getTextWidth(stars);
    currentX += starsWidth;
    
    doc.setTextColor(70, 70, 70); 
    doc.text(emptyStars, currentX, y + 10);

    y += 18;

    doc.setFontSize(10);
    doc.setTextColor(230, 230, 230);
    for (const note of notes) {
      const wrappedNote = doc.splitTextToSize(this.cleanText(note), pageWidth - (margin * 2) - 25);
      doc.text(wrappedNote, pageWidth - margin - 15, y, { align: 'right' });
      
      doc.setFillColor(255, 193, 7);
      doc.circle(pageWidth - margin - 10, y - 1, 0.5, 'F');
      
      y += (wrappedNote.length * 7);
    }
    y += 10; 
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`تم استخراج هذا التقرير آلياً من نظام فينيكس - صفحة ${i} من ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`Phoenix_Report_${studentName}.pdf`);
}

private async loadLogo(): Promise<string | null> {
  try {
    const response = await fetch('home2.png'); 
    const blob = await response.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('خطأ في تحميل الشعار', err);
    return null;
  }
}



private async loadFont(): Promise<string> {
  const response = await fetch('DejaVuSans.ttf'); 
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}
private cleanText(text: string): string {
  return text
    .replace(/[^\u0600-\u06FF0-9\s:\-\/\.]/g, '') 
    .replace(/\u200B/g, '')                      
    .trim();
}

}
