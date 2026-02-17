import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApisService } from './../apis-service';

interface Group {
  GROUP_ID: number;
  GROUP_NAME: string;
  GRADE_ID: number;
  TEACHER_ID: number;
  STUDENTS_COUNT?: number;
}

interface Teacher {
  TEACHER_ID: number;
  TEACHER_NAME: string;
  Teacher_subject: string;
}

interface Grade {
  GRADE_ID: number;
  GRADE_NAME: string;
}

interface Student {
  STUDENT_ID: number;
  NAME: string;
  PHONE?: string;
  GRADE_ID: number;
}

@Component({
  selector: 'app-groups-manage',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './groups-mange.html',
})
export class GroupsMange implements OnInit {

  // ====== Main Signals ======
  groups = signal<Group[]>([]);
  teachers = signal<Teacher[]>([]);
  grades = signal<Grade[]>([]);
  loading = signal(false);
  loading2 = signal(false);

  filterGradeId = signal<number | null>(null);
  filterTeacherId = signal<number | null>(null);
  
  searchText = signal('');
  editingGroupId = signal<number | null>(null);

  formGroup = signal<Group>({
    GROUP_ID: 0,
    GROUP_NAME: '',
    GRADE_ID: 0,
    TEACHER_ID: 0,
  });

  constructor(private api: ApisService) {}

  ngOnInit() {
    this.fetchGroups();
    this.fetchTeachers();
    this.fetchGrades();
  }

  // ====== Lookup Helpers ======
  getGradeName(gradeId: number): string {
    const g = this.grades().find(x => x.GRADE_ID === Number(gradeId));
    return g ? g.GRADE_NAME : '—';
  }

  getTeacherName(teacherId: number): string {
    const t = this.teachers().find(x => x.TEACHER_ID === Number(teacherId));
    return t ? t.TEACHER_NAME : '—';
  }

  getTeacherSubject(teacherId: number): string {
    const t = this.teachers().find(x => x.TEACHER_ID === Number(teacherId));
    return t ? t.Teacher_subject : '—';
  }

  // ====== Form Update ======
  updateFormField(field: keyof Group, value: any) {
    this.formGroup.update(g => ({
      ...g,
      [field]: field === 'GRADE_ID' || field === 'TEACHER_ID' ? Number(value) : value
    }));
  }

  // ====== Fetch ======
  fetchGroups() {
    this.loading.set(true);
    this.api.getGroups().subscribe({
      next: (data: any[]) => {
        const mappedGroups = data.map((row: any[]) => ({
          GROUP_ID: Number(row[0]),
          GROUP_NAME: String(row[1] ?? ''),
          GRADE_ID: Number(row[2]),
          TEACHER_ID: Number(row[3]),
          STUDENTS_COUNT: 0 // القيمة الابتدائية
        }));
        
        this.groups.set(mappedGroups);
        this.loading.set(false);
  
        // --- الجزء الجديد: جلب الأعداد الفعلية ---
        mappedGroups.forEach(group => {
          this.api.getStudentsByGroup(group.GROUP_ID).subscribe({
            next: (students: any[]) => {
              this.updateGroupCount(group.GROUP_ID, students.length);
            }
          });
        });
      },
      error: (err) => {
        console.error('خطأ في جلب المجموعات:', err);
        this.loading.set(false);
      }
    });
  }
  
  // دالة مساعدة لتحديث العداد داخل الـ Signal
  updateGroupCount(groupId: number, count: number) {
    this.groups.update(list => 
      list.map(g => g.GROUP_ID === groupId ? { ...g, STUDENTS_COUNT: count } : g)
    );
  }

  fetchTeachers() {
    this.loading.set(true);
    this.api.getTeachers().subscribe({
      next: (data: any[]) => {
        this.teachers.set(
          data.map(t => ({
            TEACHER_ID: Number(t[0]),
            TEACHER_NAME: `${t[1] ?? ''} ${t[2] ?? ''}`.trim(),
            Teacher_subject: String(t[6] ?? ''),
          }))
        );
        this.loading.set(false);
      },
      error: err => {
        console.error('خطأ في جلب المدرسين:', err);
        this.loading.set(false);
      }
    });
  }

  fetchGrades() {
    this.loading.set(true);
    this.api.getGrades().subscribe({
      next: (data: any[]) => {
        this.grades.set(
          data.map(g => ({
            GRADE_ID: Number(g.GRADE_ID),
            GRADE_NAME: String(g.NAME ?? ''),
          }))
        );
        this.loading.set(false);
      },
      error: err => {
        console.error('خطأ في جلب الصفوف:', err);
        this.loading.set(false);
      }
    });
  }

  // ====== Filter Groups ======
  filteredGroups = computed(() => {
    const q = this.searchText().toLowerCase().trim();
  
    return this.groups().filter(g => {
      const matchesText = g.GROUP_NAME.toLowerCase().includes(q);
      const matchesGrade = this.filterGradeId() ? g.GRADE_ID === this.filterGradeId() : true;
      const matchesTeacher = this.filterTeacherId() ? g.TEACHER_ID === this.filterTeacherId() : true;
      return matchesText && matchesGrade && matchesTeacher;
    });
  });
  
  
  // ====== CRUD Groups ======
  addGroup() {
    const tempId = Date.now();
    const newGroup: Group = { GROUP_ID: tempId, GROUP_NAME: '', GRADE_ID: 0, TEACHER_ID: 0 };
    this.groups.update(list => [newGroup, ...list]);
    this.formGroup.set({ ...newGroup });
    this.editingGroupId.set(tempId);
  }

  editGroup(group: Group) {
    this.formGroup.set({ ...group });
    this.editingGroupId.set(group.GROUP_ID);
  }

  saveGroup() {
    const group = this.formGroup();
    const isTemp = group.GROUP_ID.toString().length > 12;

    const payload = {
      NAME: group.GROUP_NAME.trim(),
      gradeId: Number(group.GRADE_ID),
      teacherId: Number(group.TEACHER_ID)
    };

    if (!payload.NAME || !payload.gradeId || !payload.teacherId) {
      alert('البيانات غير مكتملة');
      return;
    }

    this.loading.set(true);

    if (isTemp) {
      this.api.addGroup(payload).subscribe({
        next: (saved: any) => {
          const newGroup: Group = {
            GROUP_ID: Number(saved.GROUP_ID),
            GROUP_NAME: String(saved.NAME ?? payload.NAME),
            GRADE_ID: Number(saved.GRADE_ID ?? payload.gradeId),
            TEACHER_ID: Number(saved.TEACHER_ID ?? payload.teacherId),
          };

          this.groups.update(list =>
            list.map(g => g.GROUP_ID === group.GROUP_ID ? newGroup : g)
          );

          this.finishEdit();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Add group error:', err);
          alert(err.error?.error || 'حدث خطأ أثناء إضافة المجموعة');
          this.loading.set(false);
        }
      });
    } else {
      this.api.updateGroup(group.GROUP_ID, payload).subscribe({
        next: () => {
          this.groups.update(list =>
            list.map(g => g.GROUP_ID === group.GROUP_ID ? { ...group } : g)
            
          );
          this.api.getStudentsByGroup(group.GROUP_ID).subscribe({
            next: (students: Student[]) => {
              this.updateGroupCount(group.GROUP_ID, students.length);
            }
          });
          this.finishEdit();
          this.loading.set(false);


        },
        error: (err) => {
          console.error(err);
          alert(err.error?.error || 'حدث خطأ أثناء تحديث المجموعة');
          this.loading.set(false);
        }
      });
    }
  }

  deleteGroup(group: Group) {
    if (!confirm(`هل تريد حذف المجموعة ${group.GROUP_NAME}؟`)) return;

    this.loading.set(true);
    this.api.deleteGroup(group.GROUP_ID).subscribe({
      next: () => {
        this.groups.update(list => list.filter(g => g.GROUP_ID !== group.GROUP_ID));
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.error || 'فشل الحذف');
        this.loading.set(false);
      }
    });
  }

  cancel() {
    const id = this.editingGroupId();
    const isTemp = id && id.toString().length > 12;

    if (isTemp) this.groups.update(list => list.filter(g => g.GROUP_ID !== id));
    this.finishEdit();
  }

  finishEdit() {
    this.editingGroupId.set(null);
  }

  // ===========================
  //        POPUP Students
  // ===========================

  showStudentsPopup = signal(false);
  currentGroup = signal<Group | null>(null);

  groupStudents = signal<Student[]>([]);
  eligibleStudents = signal<Student[]>([]);

  groupStudentsSearch = signal('');
  eligibleStudentsSearch = signal('');

  filteredGroupStudents = computed(() => {
    const q = this.groupStudentsSearch().toLowerCase().trim();
    return this.groupStudents().filter(s => (s.NAME ?? '').toLowerCase().includes(q));
  });

  filteredEligibleStudents = computed(() => {
    const q = this.eligibleStudentsSearch().toLowerCase().trim();
    return this.eligibleStudents().filter(s => (s.NAME ?? '').toLowerCase().includes(q));
  });

  openStudentsPopupForGroup(group: Group) {
    this.currentGroup.set(group);
    this.showStudentsPopup.set(true);

    this.groupStudentsSearch.set('');
    this.eligibleStudentsSearch.set('');

    this.loadGroupStudents();
    this.loadEligibleStudents();
  }

  closeStudentsPopup() {
    this.showStudentsPopup.set(false);
    this.currentGroup.set(null);
    this.groupStudents.set([]);
    this.eligibleStudents.set([]);
    this.groupStudentsSearch.set('');
    this.eligibleStudentsSearch.set('');
  }

  private loadGroupStudents() {
    const g = this.currentGroup();
    if (!g) return;

    this.api.getStudentsByGroup(g.GROUP_ID).subscribe({
      next: (rows: any[]) => this.groupStudents.set(rows as Student[]),
      error: (err: any) => {
        console.error(err);
        alert('فشل جلب طلاب المجموعة');
      }
    });
  }

  private loadEligibleStudents() {
    this.loading2.set(true)
    const g = this.currentGroup();
    if (!g) return;

    this.api.getEligibleStudents(g.GROUP_ID).subscribe({
      next: (rows: any[]) => {this.eligibleStudents.set(rows as Student[])
        this.loading2.set(false)

      },
      
      error: (err: any) => {
        console.error(err);
        alert('فشل جلب طلاب الصف للإضافة');
        this.loading2.set(false)

      },
      
    }
    
    );

  }
  addStudentToGroup(student: Student) {
    const g = this.currentGroup();
    if (!g) return;
    
    this.loading2.set(true);
  
    this.api.addStudentToGroup(g.GROUP_ID, student.STUDENT_ID).subscribe({
      next: () => {
        // تحديث قائمة الطلاب
        this.groupStudents.update(list => [student, ...list]);
        this.eligibleStudents.update(list => list.filter(s => s.STUDENT_ID !== student.STUDENT_ID));
  
        // تحديث العداد داخل المجموعة
        this.updateGroupCount(g.GROUP_ID, this.groupStudents().length);
  
        this.loading2.set(false);
      },
      error: (err: any) => {
        console.error(err);
        alert(err.error?.error || 'فشل إضافة الطالب');
        this.loading2.set(false);
      }
    });
  }
  
  removeStudentFromGroup(student: Student) {
    const g = this.currentGroup();
    if (!g) return;
  
    if (!confirm(`إزالة الطالب "${student.NAME}" من المجموعة؟`)) return;
  
    this.loading2.set(true);
  
    this.api.removeStudentFromGroup(g.GROUP_ID, student.STUDENT_ID).subscribe({
      next: () => {
        this.groupStudents.update(list => list.filter(s => s.STUDENT_ID !== student.STUDENT_ID));
        this.eligibleStudents.update(list => [student, ...list]);
  
        // تحديث العداد
        this.updateGroupCount(g.GROUP_ID, this.groupStudents().length);
  
        this.loading2.set(false);
      },
      error: (err: any) => {
        console.error(err);
        alert(err.error?.error || 'فشل إزالة الطالب');
        this.loading2.set(false);
      }
    });
  }
  
}
