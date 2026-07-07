import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Subject } from 'rxjs';
interface StudentReportGroup {
  GROUP_ID: number;
  GROUP_NAME: string;
  AVG_RATING: number;
  RATINGS_COUNT: number;
  NOTES: string;
}

interface ChangePasswordPayload {
  USER_ID: number;
  CURRENT_PASSWORD: string;
  NEW_PASSWORD: string;
}
interface StudentReport {
  studentId: number;
  overallRating: number;
  groups: StudentReportGroup[];
}
@Injectable({
  providedIn: 'root',
})
export class ApisService {
  searchStudentByName(name: string) {
    return this.http.get<any[]>(`${this.apiUrl}/students/search`, {
      params: { name }
    });
  }
  constructor(private http: HttpClient) {}
  private apiUrl = "https://phoenix-center.duckdns.org/api"
  getTeachers() {
    return this.http.get<any[]>(`${this.apiUrl}/teachers`);
  }

  loginUser(credentials: { Username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  addTeacher(teacher: any) {
    return this.http.post<any>(`${this.apiUrl}/admin/teachers`, teacher);
  }
  updateTeacher(id: number, teacher: any) {
    return this.http.put(`${this.apiUrl}/admin/teachers/${id}`, teacher);
  }
  deleteTeacher(id: number) {
    return this.http.delete(`${this.apiUrl}/admin/teachers/${id}`);
  }
  getStudents(){
  return this.http.get<any[]>(`${this.apiUrl}/students`)
  }
  addStudent(data:any) { return this.http.post(`${this.apiUrl}/admin/students`, data); }
  updateStudent(id:number, data:any) { return this.http.put(`${this.apiUrl}/admin/students/${id}`, data); }
  deleteStudent(id:number) { return this.http.delete(`${this.apiUrl}/admin/students/${id}`); }
  
  getGroups() { return this.http.get<any[]>(`${this.apiUrl}/admin/groups`); }
  getGrades() { return this.http.get<any[]>(`${this.apiUrl}/Grads`); }
  
  addGroup(data: any) { return this.http.post(`${this.apiUrl}/admin/groups`, data); }
  updateGroup(id: number, data: any) { return this.http.put(`${this.apiUrl}/admin/groups/${id}`, data); }
  deleteGroup(id: number) { return this.http.delete(`${this.apiUrl}/admin/groups/${id}`); }
  getStudentsByGroup(groupId: number) {
    return this.http.get<any[]>(`https://phoenix-center.duckdns.org/api/admin/groups/${groupId}/students`);
  }
  
  getEligibleStudents(groupId: number) {
    return this.http.get<any[]>(`https://phoenix-center.duckdns.org/api/admin/groups/${groupId}/eligible-students`);
  }
  
  addStudentToGroup(groupId: number, studentId: number) {
    return this.http.post(`https://phoenix-center.duckdns.org/api/admin/groups/${groupId}/students`, { studentId });
  }
  
  removeStudentFromGroup(groupId: number, studentId: number) {
    return this.http.delete(`https://phoenix-center.duckdns.org/api/admin/groups/${groupId}/students/${studentId}`);
  }
  getRooms(){
    return this.http.get<any[]>(`${this.apiUrl}/Rooms`)
  }
 getSchedules(){
  return this.http.get<any[]>(`${this.apiUrl}/schedules`)
 }
 saveScheduleChanges(data: any[]): Observable<any> {
  // ترسل البيانات مع _state لكل schedule
  return this.http.post(`${this.apiUrl}/schedules`, data);
}
getStudentFinance(student_id: number, year: number) {
  return this.http.get<any[]>(`${this.apiUrl}/studentfinance`, {
    params: { STUDENT_ID: student_id.toString(), YEAR: year.toString() }
  });
}
updateStudentPayment(
  studentId: number,
  year: number,
  groupId: number,
  month: number,
  amount: number,
  isPaid: number,
  createdAt: string
) {
  return this.http.post(`${this.apiUrl}/studentfinance/update`, {
    studentId,
    year,
    groupId,
    month,
    amountPaid: amount,
    isPaid,
    createdAt
  });
}

getCashReport(
  type: 'daily' | 'monthly' | 'yearly',
  params: {
    year?: number;
    month?: number;
    day?: string; // YYYY-MM-DD
  }
) {
  return this.http.get<any[]>(`${this.apiUrl}/cash-report`, {
    params: {
      type,
      ...(params.year  ? { year: params.year.toString() }  : {}),
      ...(params.month ? { month: params.month.toString() } : {}),
      ...(params.day   ? { day: params.day }                : {}),
    }
  });
}
// apis-service.ts

paymentAdded$ = new Subject<any>();

addPayment(studentId: number, payload: any) {
  return this.http.post('/payments', payload).pipe(
    tap((res: any) => {
      this.paymentAdded$.next(res); // 🔥 إشعار فوري
    })
  );
}

getScheduleForTeacher(teacherId: number) {
  return this.http.get<any[]>(
    `${this.apiUrl}/teacher/schedule`,
    { params: { teacherId } }
  );
}

// 1. حفظ أو تحديث حالة حضور الطالب
postAttendance(attendanceData: { scheduleId: number, studentId: number, status: string, attendanceDate: string }) {
  return this.http.post(`${this.apiUrl}/attendance`, attendanceData);
}

// 2. إضافة ملاحظة جديدة للطالب
// أضفنا studentId كباراميتر أول
addStudentNote(studentId: number, payload: { scheduleId: number, note: string, rating: number, noteDate: string }) {
  return this.http.post(`${this.apiUrl}/student/${studentId}/note`, payload);
}
// 3. جلب تقرير إحصائي لحضور الطالب (لعمل الرسوم البيانية)
getStudentReport(studentId: number) {
  return this.http.get<StudentReport>(
    `${this.apiUrl}/student/${studentId}/report`
  );
}


// 4. جلب عدد الطلاب الكلي للمدرس (التي استخدمتها في ngOnInit)

// 5. جلب طلاب حصة معينة
getStudentsForTeacherPage(scheduleId: number) {
  return this.http.get<any[]>(`${this.apiUrl}/schedule/${scheduleId}/students`);
}
getStudentCountForTeacher(teacherId:number){
  return this.http.get<any[]>(`${this.apiUrl}/teacher/${teacherId}/students`)

}
getAttendance(scheduleId: number, date: string) {
  return this.http.get<any[]>(`${this.apiUrl}/attendance`, {
    params: { scheduleId: scheduleId.toString(), attendanceDate: date }
  });
}


getTeacherDaySummary(teacherId: number, date: string) {
  return this.http.get<any>(`${this.apiUrl}/teacher/${teacherId}/day-summary`, {
    params: { date }
  });
}
getSessionNotes(scheduleId: number): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrl}/schedule/${scheduleId}/notes`
  );
}
getStudentAttendanceSummary(studentId: number) {
  return this.http.get<any>(
    `${this.apiUrl}/student/${studentId}/report/attendance-summary`
  );
}

changePassword(payload: ChangePasswordPayload): Observable<any> {
  return this.http.post(`${this.apiUrl}/change-password`, payload);
}

uploadImageToCloudinary(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'phoenix');

  return fetch(
    'https://api.cloudinary.com/v1_1/djsy6er88/image/upload',
    {
      method: 'POST',
      body: formData
    }
  ).then(res => res.json());
}
changeTeacherImage(data: { TEACHER_ID: number; IMAGE_URL: string }) {
  return this.http.post(`${this.apiUrl}/change-teacher-image`, data);
}
getTeacherById(id: number) {
  return this.http.get(`https://phoenix-center.duckdns.org/api/admin/teachers/${id}`);
}

private servicesApiUrl = "https://aboodhassan-001-site1.jtempurl.com/api"

getServicesWithPagination(pageNumber: number, pageSize: number, ignoreSoftDelete: boolean = false): Observable<any> {
  const token = localStorage.getItem('authToken');
  const headers: any = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return this.http.get(`${this.servicesApiUrl}/Service/GetServicesWithPagination`, {
    params: {
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString(),
      ignoreSoftDelete: ignoreSoftDelete.toString()
    },
    headers
  });
}

getCategoryServices(pageNumber: number, pageSize: number, categoryName: string): Observable<any> {
  const token = localStorage.getItem('authToken');
  const headers: any = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return this.http.get(`${this.servicesApiUrl}/Service/GetServicesWithPagination`, {
    params: {
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString(),
      ignoreSoftDelete: 'false',
      categoryName
    },
    headers
  });
}

}
