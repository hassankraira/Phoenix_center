import { FormsModule } from '@angular/forms';
import { Component, signal, computed, OnInit, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { finalize, forkJoin } from 'rxjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

import { ApisService } from './../apis-service';
import { currentUser } from './../signals/user.signal';

/* ================= Types ================= */

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

interface Student {
  id: number;
  name: string;
  status: AttendanceStatus;
}

interface Session {
  schedule_id: number;
  start: string;
  end: string;
  group: string;
  room: string;
  day: string;
  students: Student[];
}


@Component({
  selector: 'app-teacher-page',
  standalone: true,
  imports:[FormsModule,RouterLink],
  templateUrl: './teacher-page.html',
  styleUrl: './teacher-page.css',
})
export class TeacherPage implements OnInit {


  constructor(private router: Router,private api: ApisService,private title: Title) {
    effect(() => {
      const user = this.user();
      if (user) {
        this.title.setTitle(`لوحة التحكم - ${user.firstName}`);
      }
    });
  }
  user = currentUser;
  loading = signal(false);
  loading2 = signal(false);

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
  
    const file = input.files[0];
  
    try {
      this.loading.set(true);
  
      const res = await this.api.uploadImageToCloudinary(file);
      const imageUrl = res.secure_url;
  
      // تحديث الـ signal
      const updatedUser = {
        ...this.user()!,
        image: imageUrl
      };
  
      this.user.set(updatedUser);
  
      // حفظ في localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.api.changeTeacherImage ({
        TEACHER_ID: this.user()!.teacherId,
        IMAGE_URL: imageUrl
      }).subscribe();
      
      // (اختياري) إرسالها للباك اند
      // this.api.updateTeacherImage(updatedUser.teacherId, imageUrl).subscribe();
  
    } catch (err) {
      console.error(err);
      alert('فشل رفع الصورة');
    } finally {
      this.loading.set(false);
    }
  }
  
  selectedDate = signal<Date>(new Date());

  formattedDate = computed(() =>
    dayjs(this.selectedDate())
      .locale('ar')
      .format('dddd • DD MMMM YYYY')
  );

  selectedDayLabel = computed(() =>
    dayjs(this.selectedDate())
      .locale('ar')
      .format('dddd • DD MMMM YYYY')
  );

  selectedDayName = computed(() =>
    dayjs(this.selectedDate())
      .locale('ar')
      .format('dddd')
  );

  /* ================= Sessions ================= */

  sessions = signal<Session[]>([]);
  activeSession = signal<Session | null>(null);

  /* ================= Notes (SESSION BASED) ================= */

  sessionNotes = signal<any[]>([]);
  noteText = signal('');

  /* ================= Students Count ================= */

  studentsTotal = signal(0);

  /* ================= Lifecycle ================= */

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user.set(JSON.parse(storedUser));
    }

    this.loadStudentsTotal();
    this.loadSchedule();
    this.loadDaySummary();
  }

  /* ================= Auth ================= */

  logout() {
    localStorage.removeItem('user');
    currentUser.set(null);
    this.router.navigateByUrl('/Login');
  }

  /* ================= Navigation Days ================= */

  nextDay() {
    this.selectedDate.set(dayjs(this.selectedDate()).add(1, 'day').toDate());
    this.loadDaySummary();
    this.activeSession.set(null);
  }

  previousDay() {
    this.selectedDate.set(dayjs(this.selectedDate()).subtract(1, 'day').toDate());
    this.loadDaySummary();
    this.activeSession.set(null);
  }

  goToToday() {
    this.selectedDate.set(new Date());
    this.loadDaySummary();
    this.activeSession.set(null);
  }

  /* ================= Computed ================= */

  todaySessions = computed(() => {
    const dayName = this.normalizeDay(this.selectedDayName());
    return this.sessions().filter(
      s => this.normalizeDay(s.day) === dayName
    );
  });

  todaySessionsCount = computed(() => this.todaySessions().length);

  GroupsCount = computed(() => {
    const groups = this.sessions().map(s => s.group);
    return new Set(groups).size;
  });

  todayPresent = computed(() =>
  this.todaySessions().reduce(
    (acc, s) => acc + s.students.filter(st => st.status === 'present' || st.status === 'late').length,
    0
  )
);

todayAbsents = computed(() =>
  this.todaySessions().reduce(
    (acc, s) => acc + s.students.filter(st => st.status === 'absent').length,
    0
  )
);
// Signal جديد للملخص
daySummary = signal({ present: 0, absent: 0 });

// دالة لجلب الملخص من السيرفر
loadDaySummary() {
  const dateStr = dayjs(this.selectedDate()).format('YYYY-MM-DD');
  this.api.getTeacherDaySummary(this.user()!.teacherId, dateStr).subscribe({
    next: (res: any) => {
      // افترضنا أن السيرفر يعيد { presentCount, absentCount }
      this.daySummary.set({
        present: res.presentCount || 0,
        absent: res.absentCount || 0
      });
    }
  });
}

// استدعِ هذه الدالة داخل ngOnInit وفي دالات nextDay و previousDay و goToToday

  /* ================= Load Data ================= */

  loadStudentsTotal() {
    this.api.getStudentCountForTeacher(this.user()!.teacherId)
      .subscribe({
        next: rows => this.studentsTotal.set(rows[0][0] || 0),
        error: err => console.error(err)
      });
  }

  loadSchedule() {
    this.loading.set(true);

    this.api.getScheduleForTeacher(this.user()!.teacherId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: rows => {
          const mapped = this.mapSchedule(rows);
          this.sessions.set(mapped);
          this.OpenNearestSession();
        },
        error: err => console.error(err)
      });
  }

  /* ================= Mapping ================= */

  mapSchedule(rows: any[]): Session[] {
    return rows.map(r => ({
      schedule_id: r[0],
      group: r[1],
      room: r[2],
      day: this.normalizeDay(r[3]),
      start: r[4],
      end: r[5],
      students: []
    }));
  }

  normalizeDay(day: string): string {
    if (!day) return '';
    return day
      .trim()
      .replace(/[إأآ]/g, 'ا')
      .replace(/ة/g, 'ه');
  }

  /* ================= Auto Open Nearest Session ================= */

  OpenNearestSession() {
    const today = this.todaySessions();
    if (!today.length) return;
  
    const now = dayjs();
  
    const nearest = today.reduce((prev, curr) => {
      const prevDiff = Math.abs(dayjs(prev.start, 'HH:mm').diff(now));
      const currDiff = Math.abs(dayjs(curr.start, 'HH:mm').diff(now));
      return currDiff < prevDiff ? curr : prev;
    });
  
    this.openSession(nearest);
  }
  

  /* ================= Open Session ================= */

  openSession(session: Session) {
    this.loading2.set(true);
    // 1. نحصل على التاريخ المختار في الواجهة بتنسيق نصي للمقارنة
    const selectedDateStr = dayjs(this.selectedDate()).format('YYYY-MM-DD');
  
    forkJoin({
      students: this.api.getStudentsForTeacherPage(session.schedule_id),
      attendance: this.api.getAttendance(session.schedule_id, selectedDateStr),
      notes: this.api.getSessionNotes(session.schedule_id)
    })
    .pipe(finalize(() => this.loading2.set(false)))
    .subscribe({
      next: res => {
        // معالجة الحضور
        const attendanceMap = new Map(res.attendance.map((a: any) => [a.STUDENT_ID, a.STATUS]));
        const students: Student[] = res.students.map((s: any) => ({
          id: s[0],
          name: s[1],
          status: attendanceMap.get(s[0]) || null
        }));
  
        // 2. معالجة التقييمات (النجوم) - التعديل هنا:
        const initialRatings: { [key: number]: number } = {};
        
        res.notes.forEach((note: any) => {
          // شرط هام جداً: لا نأخذ التقييم إلا إذا كان تاريخ الملاحظة يطابق التاريخ المختار حالياً
          if (note.NOTE_DATE === selectedDateStr) { 
            if (note.RATING !== undefined && note.RATING !== null) {
              initialRatings[note.STUDENT_ID] = note.RATING;
            }
          }
        });
        
        // الآن tempRatings ستحتوي فقط على تقييمات "هذا اليوم المحدد"
        this.tempRatings.set(initialRatings);
  
        // تحديث الملاحظات النصية (نصفيها أيضاً حسب التاريخ لكي لا تظهر ملاحظات قديمة)
        const filteredNotes = res.notes.filter((n: any) => 
          n.NOTE_DATE === selectedDateStr && 
          n.NOTE_TEXT !== 'تقييم سريع'
        );
  
        this.activeSession.set({ ...session, students });
        this.sessionNotes.set(filteredNotes);
      }
    });
  }
  /* ================= Attendance ================= */

  markAttendance(studentId: number, status: AttendanceStatus) {
    if (this.isSessionLocked()) return; // حماية برمجية
    const session = this.activeSession();
    if (!session || !status) return;
  
    // 1. تحديد الحالة القديمة للطالب قبل التحديث
    const student = session.students.find(s => s.id === studentId);
    const oldStatus = student?.status;
  
    // 2. تحديث الواجهة فوراً (قائمة الطلاب)
    this.updateLocalStatus(studentId, status);
  
    // 3. تحديث العداد العلوي (daySummary) فوراً وبشكل ذكي
    this.daySummary.update(current => {
      let newPresent = current.present;
      let newAbsent = current.absent;
  
      // خصم الحالة القديمة من العدادات
      if (oldStatus === 'present' || oldStatus === 'late') newPresent--;
      if (oldStatus === 'absent') newAbsent--;
  
      // إضافة الحالة الجديدة للعدادات
      if (status === 'present' || status === 'late') newPresent++;
      if (status === 'absent') newAbsent++;
  
      return { 
        present: Math.max(0, newPresent), 
        absent: Math.max(0, newAbsent) 
      };
    });
  
    // 4. الحفظ في قاعدة البيانات في الخلفية
    this.api.postAttendance({
      scheduleId: session.schedule_id,
      studentId,
      status,
      attendanceDate: dayjs(this.selectedDate()).format('YYYY-MM-DD')
    }).subscribe({
      error: err => {
        console.error(err);
        // في حالة الخطأ النادر، نعيد تحميل البيانات الحقيقية من السيرفر للتصحيح
        this.loadDaySummary();
        alert("حدث خطأ أثناء حفظ التحضير");
      }
    });
  }

  private updateLocalStatus(studentId: number, status: AttendanceStatus) {
    const session = this.activeSession();
    if (!session) return;

    const updated: Session = {
      ...session,
      students: session.students.map(s =>
        s.id === studentId ? { ...s, status } : s
      )
    };

    this.activeSession.set(updated);

    this.sessions.update(list =>
      list.map(s =>
        s.schedule_id === updated.schedule_id ? updated : s
      )
    );
  }
 
  /* ================= Notes ================= */
  studentId =signal(0)
  // Signal لتخزين التقييمات الحالية لكل طالب
tempRatings = signal<{ [key: number]: number }>({});

// دالة تحديث التقييم فقط (عند الضغط على النجوم بجانب الاسم)
// Signal لتخزين التقييمات الحالية لكل طالب في الحصة المفتوحة

// 1. دالة تحديث التقييم (عند الضغط على النجوم بجانب الاسم)
updateStudentRating(studentId: number, rating: number) {

  if (this.isSessionLocked()) return; // حماية برمجية
  // تحديث الـ Signal بطريقة Immutable لضمان استجابة الواجهة
  this.tempRatings.update(prev => ({
    ...prev,
    [studentId]: rating
  }));

  const session = this.activeSession();
  if (!session) return;

  // إرسال التحديث للسيرفر
  this.api.addStudentNote(studentId, {
    scheduleId: session.schedule_id,
    note: "تقييم سريع", 
    rating: rating,
    noteDate: dayjs(this.selectedDate()).format('YYYY-MM-DD')
  }).subscribe({
    next: () => {
      // اختياري: تحديث قائمة الملاحظات إذا كنت تريد أن يظهر التحديث في الأسفل أيضاً
      // this.loadSessionNotes(session.schedule_id);
    },
    error: (err) => {
      console.error("فشل التحديث", err);
      // استعادة الحالة القديمة في حال الفشل (اختياري)
    }
  });
}
// 2. دالة حفظ الملاحظة النصية (من القسم السفلي)
saveNote() {
  const sId = Number(this.studentId());
  const text = this.noteText();
  
  // نأخذ التقييم المختار حالياً لهذا الطالب من الـ Signal، وإذا لم يوجد نعتبره 5
  const currentRating = this.tempRatings()[sId] || 5;

  if (!sId || !text) return;

  // إضافة الملاحظة للعرض الفوري في القائمة السفلية (قبل رد السيرفر)
  const selectedStudent = this.activeSession()?.students.find(s => s.id == sId);
  const tempNote = {
    STUDENT_NAME: selectedStudent?.name,
    NOTE_TEXT: text,
    NOTE_DATE: dayjs(this.selectedDate()).format('YYYY-MM-DD')
    // لاحظ: لم نضف RATING هنا لأننا اتفقنا على عدم عرضه في قسم الملاحظات
  };

  this.sessionNotes.update(notes => [tempNote, ...notes]);
  this.noteText.set('');

  // إرسال الملاحظة مع التقييم الحالي للسيرفر
  this.api.addStudentNote(sId, {
    scheduleId: this.activeSession()!.schedule_id,
    note: text,
    rating: currentRating,
    noteDate: tempNote.NOTE_DATE
  }).subscribe({
    next: () => {
      console.log("تم حفظ الملاحظة بنجاح");
    },
    error: (err) => {
      console.error("فشل حفظ الملاحظة", err);
      // إزالة الملاحظة المؤقتة من الواجهة
      this.sessionNotes.update(notes => notes.filter(n => n.NOTE_DATE !== tempNote.NOTE_DATE || n.STUDENT_NAME !== tempNote.STUDENT_NAME));
      alert("فشل حفظ الملاحظة على السيرفر!");
    }
  });
  
}


isSessionLocked(): boolean {
  const selectedDate = dayjs(this.selectedDate()).startOf('day');
  const today = dayjs().startOf('day');

  // 1. إذا كان التاريخ المختار بعد تاريخ اليوم -> مقفل تماماً
  if (selectedDate.isAfter(today)) {
    return true;
  }

  // 2. إذا كان التاريخ هو اليوم، نتحقق من وقت الحصة
  if (selectedDate.isSame(today)) {
    const session = this.activeSession();
    if (session && session.start) {
      // نفترض أن start_time يأتي بتنسيق "HH:mm" (مثلاً 14:30)
      const [hours, minutes] = session.start.split(':');
      const sessionStartTime = dayjs().set('hour', parseInt(hours)).set('minute', parseInt(minutes));
      
      // إذا كان الوقت الحالي قبل وقت بداية الحصة -> مقفل
      if (dayjs().isBefore(sessionStartTime)) {
        return true;
      }
    }
  }

  return false;
}
}
