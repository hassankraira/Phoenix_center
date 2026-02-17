import emailjs from '@emailjs/browser'; // 1. استيراد المكتبة
import { ApisService } from './../apis-service';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, signal, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Teacher {
  TEACHER_ID: number;
  name: string;
  subject: string;
  phone: string;
  img: string;
  youtubeUrl: string;
}

@Component({
  selector: 'app-view-teacher',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './view-teacher.html',
  styleUrl: './view-teacher.css',
})
export class ViewTeacher implements OnInit {
  teacher = signal<Teacher | null>(null);
  safeVideoUrl = signal<SafeResourceUrl | null>(null);
  isLoading = signal<boolean>(true); // متغير حالة التحميل

  student = signal({
    name: '',
    phone: '',
    grade: '',
    notes: ''
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApisService,
    private sanitizer: DomSanitizer,

  ) {}

  ngOnInit() {
    this.loadTeacher();

    window.scroll(0, 0);
      }

  // دالة تحويل الرابط العادي إلى Embed
  private getEmbedUrl(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  }

  loadTeacher() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true); // تفعيل التحميل عند البدء

    this.api.getTeacherById(+id).subscribe({
      next: (data: any) => {
        const t: Teacher = {
          TEACHER_ID: data.TEACHER_ID,
          name: `${data.FIRST_NAME || ''} ${data.LAST_NAME || ''}`.trim(),
          subject: data.SUBJECT,
          phone: data.PHONE_NUMBER,
          img: data.IMAGE,
          youtubeUrl: data.YOUTUBE_URL
        };

        this.teacher.set(t);

        if (t.youtubeUrl) {
          const embedUrl = this.getEmbedUrl(t.youtubeUrl);
          this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
        }
        
        this.isLoading.set(false); // إيقاف التحميل بعد استلام البيانات
      },
      error: (err) => {
        console.error('Error fetching teacher:', err);
        this.isLoading.set(false); // إيقاف التحميل حتى في حالة الخطأ
      }
    });
  }



// تأكد من وضع الـ Key الحقيقي هنا
async onSubmit() {

  if (!this.student().name || !this.student().phone) {
    alert('يرجى كتابة الاسم ورقم الهاتف');
    return;
  }

  try {
    const templateParams = {
      name: this.student().name,
      phone: this.student().phone,
      email: 'لا يوجد بريد',
      teacher: this.teacher()?.name || 'غير محدد',
      grade: this.student().grade || 'غير محدد',
      note: this.student().notes || 'لا توجد ملاحظات'
    };

    await emailjs.send(
      'service_p4vte4e',
      'template_h71ao6c',
      templateParams,
      'o-4hcnUVEcwWGwjwU'
    );

    alert('تم إرسال بياناتك بنجاح!');
    
    this.student.set({
      name: '',
      phone: '',
      grade: '',
      notes: ''
    });

  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء الإرسال');
  }
}
}