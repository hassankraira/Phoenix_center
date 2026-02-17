import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import emailjs from '@emailjs/browser'; // 1. استيراد المكتبة

@Component({
  selector: 'app-contactus',
  standalone: true, // تأكد أنه standalone إذا كنت تستخدم Angular 17+
  imports: [ReactiveFormsModule,FormsModule],
  templateUrl: './contactus.html',
  styleUrl: './contactus.css',
})
export class Contactus implements OnInit {
  contactForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.contactForm = this.fb.group({
      name: ['', Validators.required], // إجباري
      phone: ['', Validators.required], // إجباري
      email: [''], // اختياري (حذفنا Validators.email و required)
      message: [''] // اختياري
    });
  }
// تأكد من وضع الـ Key الحقيقي هنا
 async onSubmit() {
  console.log("حالة النموذج:", this.contactForm.valid);
  
  if (this.contactForm.valid) {
    try {
      const templateParams = {
        name: this.contactForm.value.name,
        phone: this.contactForm.value.phone,
        // إذا كان الإيميل فارغاً سيرسل "لا يوجد"
        email: this.contactForm.value.email || 'لا يوجد بريد', 
        message: this.contactForm.value.message || 'رسالة فارغة',
      };

      const result = await emailjs.send(
        'service_p4vte4e',  
        'template_t20dsyf',  
        templateParams,
        'o-4hcnUVEcwWGwjwU'
      );

      alert('تم إرسال بياناتك بنجاح!');
      this.contactForm.reset();
    } catch (error) {
      console.error('EmailJS Error:', error);
      alert('حدث خطأ أثناء الإرسال');
    }
  } else {
    alert('يرجى كتابة الاسم ورقم الهاتف على الأقل');
  }
}
}