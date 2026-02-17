import { FormsModule } from '@angular/forms';
import { ApisService } from './../apis-service';
import { Component, computed, signal } from '@angular/core';
interface Teacher {
  TEACHER_ID: number;
  FIRST_NAME: string;
  LAST_NAME: string;
  PHONE_NUMBER: string;
  GENDER: string;
  IMAGE: string;
  SUBJECT: string;
  GOLDEN: string;
  youtubeUrl:string;
}
@Component({
  selector: 'app-teacher-mange',
  imports: [FormsModule],
  templateUrl: './teacher-mange.html',
  styleUrl: './teacher-mange.css',
})
export class TeacherMange {
  searchText = signal('');
  teachers = signal<Teacher[]>([]);
  loading = signal(true);
  filteredTeachers = computed(() => {
    const query = this.searchText().toLowerCase().trim();
    
    return this.teachers().filter(t => {
      const firstName = t.FIRST_NAME.toLowerCase();
      const lastName = t.LAST_NAME.toLowerCase();
      const fullName = `${firstName} ${lastName}`;
  
      return firstName.includes(query) || 
             lastName.includes(query) || 
             fullName.includes(query);
    });
  });
  constructor(private api: ApisService) {
    this.fetchTeachers();
  }

  fetchTeachers() {
    this.loading.set(true);
    signal(this.api.getTeachers())()
      .subscribe({
        next: (data: any[]) => {
          this.teachers.set(
            data.map(item => ({
              TEACHER_ID: item[0],
              FIRST_NAME: item[1],
              LAST_NAME: item[2],
              PHONE_NUMBER: item[3],
              GENDER: item[4],
              IMAGE: item[5],
              SUBJECT: item[6],
              GOLDEN: item[7],
              youtubeUrl:item[8]
          
            }))
          );
          console.log(this.teachers())
          this.loading.set(false);
        },
        error: (err) => {
          console.error('خطأ في جلب المدرسين:', err);
          this.loading.set(false);
        },
      });
  }
 
  


  isAdding = signal(false);

newTeacher = signal<Teacher>({
  TEACHER_ID: 0,
  FIRST_NAME: '',
  LAST_NAME: '',
  PHONE_NUMBER: '',
  GENDER: 'M',
  IMAGE: '',
  SUBJECT: '',
  GOLDEN: 'N',
  youtubeUrl:''

});
addTeacher() {
  const tempId = Date.now(); // ID مؤقت للكارد

  this.newTeacher.set({
    TEACHER_ID: tempId,
    FIRST_NAME: '',
    LAST_NAME: '',
    PHONE_NUMBER: '',
    GENDER: 'M',
    IMAGE: '',
    SUBJECT: '',
    GOLDEN: 'N',
    youtubeUrl:''
  });

  this.editingTeacherId.set(tempId);

  // نضيف كارد مؤقتة في أول الليست
  this.teachers.update(list => [
    this.newTeacher(),
    ...list
  ]);
}

// متغير لمعرفة المدرس الذي يتم تعديله حالياً
editingTeacherId = signal<number | null>(null);

editTeacher(teacher: Teacher) {
  this.isAdding.set(false); // نغلق واجهة الإضافة العلوية إذا كانت مفتوحة
  this.editingTeacherId.set(teacher.TEACHER_ID); // نحدد السطر المطلوب تعديله
  this.newTeacher.set({ ...teacher }); // ننسخ البيانات للحقول
}

deleteTeacher(teacher: Teacher) {
  if (confirm(`هل أنت متأكد من حذف المدرس ${teacher.FIRST_NAME}؟`)) {
    this.loading.set(true);
    this.api.deleteTeacher(teacher.TEACHER_ID).subscribe({
      next: () => {
        this.teachers.update(list => list.filter(t => t.TEACHER_ID !== teacher.TEACHER_ID));
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        alert('فشل الحذف');
        this.loading.set(false);
      }
    });
  }
  window.scrollTo(0,0)

}
openWhatsApp(link: string) {
  window.open(link, '_blank');
}
isTempId(id: number): boolean {
  return id.toString().length > 10; // Date.now()
}

// تعديل دالة الحفظ لتشمل التعديل والإضافة
async saveTeacher() {
  this.loading.set(true);

  let data = { ...this.newTeacher() };
  const id = this.editingTeacherId();

  // إضافة +20
  if (data.PHONE_NUMBER && !data.PHONE_NUMBER.startsWith('+20')) {
    data.PHONE_NUMBER = '+20' + data.PHONE_NUMBER.replace(/^0+/, '');
  }

  try {
    // 📸 رفع الصورة فقط عند الحفظ
    if (this.selectedFile) {
      const res: any = await this.api.uploadImageToCloudinary(this.selectedFile);
      data.IMAGE = res.secure_url;
    }

    // ➕ إضافة
    if (this.isTempId(id!)) {
      const saved = await this.api.addTeacher(data).toPromise();

      this.teachers.update(list => [
        {
          TEACHER_ID: saved.TEACHER_ID,
          FIRST_NAME: saved.FIRST_NAME,
          LAST_NAME: saved.LAST_NAME,
          PHONE_NUMBER: saved.PHONE_NUMBER,
          GENDER: saved.GENDER,
          IMAGE: saved.IMAGE,
          SUBJECT: saved.SUBJECT,
          GOLDEN: saved.GOLDEN,
          youtubeUrl: saved.YOUTUBE_URL // <- مهم جداً لتحديث رابط اليوتيوب
        },
        ...list.filter(t => t.TEACHER_ID !== id) // إزالة الكارد المؤقت القديم
      ]);
      

      if (saved.PHONE_NUMBER && saved.USERNAME) {
        const waLink = this.generateWhatsAppLink(
          saved.PHONE_NUMBER,
          saved.USERNAME,
          '123456'
        );
        this.openWhatsApp(waLink);
      }
    }

    // ✏️ تعديل
    else {
      await this.api.updateTeacher(id!, data).toPromise();

      this.teachers.update(list =>
        list.map(t => t.TEACHER_ID === id ? data : t)
      );
    }

    this.finishAction();

  } catch (err) {
    console.error(err);
    this.handleError();
  } finally {
    this.selectedFile = null;
    this.imagePreview = null;
  }
}


generateWhatsAppLink(phone: string, username: string, password: string): string {
  const text = `
مرحبًا 👋
تم إنشاء حسابك في منصة Phoenix التعليمية ✅

اسم المستخدم: ${username}
كلمة المرور: ${password}

رابط الدخول:
https://hassankraira.github.io/Phoenix_center/Login
⚠️ يرجى تغيير كلمة المرور بعد أول تسجيل دخول
`;

  return `http://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
  
    if (file.size > 1024 * 1024) {
      alert('يجب ألا تتجاوز الصورة 1 ميغابايت');
      return;
    }
  
    this.selectedFile = file;
  
    // preview فقط
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
  

finishAction() {
  this.isAdding.set(false);
  this.editingTeacherId.set(null);
  this.loading.set(false);
  window.scrollTo(0,0)
}

handleError() {
  alert('حدث خطأ ما');
  this.loading.set(false); 
  window.scrollTo(0,0)

}

cancelAdd() {
  const id = this.editingTeacherId();

  if (id) {
    // نتحقق هل هذا ID مؤقت أم موجود مسبقًا
    const isTemp = this.newTeacher().TEACHER_ID.toString().length > 12; // افتراض أن الـ ID المؤقت طويل (من Date.now)
    
    if (isTemp) {
      // نحذف العنصر المؤقت فقط
      this.teachers.update(list =>
        list.filter(t => t.TEACHER_ID !== id)
      );
    }
  }

  this.editingTeacherId.set(null);
}



}
