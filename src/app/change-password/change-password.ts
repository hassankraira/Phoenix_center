import { FormsModule } from '@angular/forms';
import { ApisService } from './../apis-service';
import { currentUser } from './../signals/user.signal';
import { Component, signal } from '@angular/core';
import { Location } from '@angular/common';
@Component({
  selector: 'app-change-password',
  imports: [FormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePassword {
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  loading = signal(false);
  message = signal('');
  success = signal(false);
  currentUser=currentUser
constructor(private api:ApisService,private location: Location ) {}

goBack() {
  this.location.back();
}
async savePassword() {
  const newPwd = this.newPassword();
  const currentPwd = this.currentPassword();
  const confirmPwd = this.confirmPassword();

  if (!currentPwd || !newPwd || !confirmPwd) {
    this.message.set('يرجى ملء جميع الحقول المطلوبة');
    this.success.set(false);
    return;
  }

  const strongPasswordRegx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!strongPasswordRegx.test(newPwd)) {
    this.message.set('كلمة المرور ضعيفة! يجب أن تحتوي على 8 أحرف على الأقل، تشمل أحرفاً كبيرة وصغيرة وأرقاماً ورموزاً مثل (@$!%*?&)');
    this.success.set(false);
    return;
  }

  const commonPasswords = ['12345678', 'password123', 'admin123', 'welcome123'];
  if (commonPasswords.includes(newPwd.toLowerCase())) {
    this.message.set('كلمة المرور هذه شائعة جداً وسهلة التخمين، اختر شيئاً أكثر تميزاً');
    this.success.set(false);
    return;
  }

  if (newPwd !== confirmPwd) {
    this.message.set('كلمة المرور الجديدة وغير متطابقة مع حقل التأكيد');
    this.success.set(false);
    return;
  }

  if (newPwd === currentPwd) {
    this.message.set('لا يمكن أن تكون كلمة المرور الجديدة هي نفسها القديمة');
    this.success.set(false);
    return;
  }

  this.loading.set(true);
  this.message.set('جاري حفظ التغييرات...');

  try {
    const res: any = await this.api.changePassword({
      USER_ID: this.currentUser().id, 
      CURRENT_PASSWORD: currentPwd,
      NEW_PASSWORD: newPwd
    }).toPromise();

    this.message.set('تم تحديث كلمة المرور بنجاح ✅');
    this.success.set(true);

    this.goBack()
    
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');

  } catch (err: any) {
    this.success.set(false);
    const errorMsg = err.error?.error || 'حدث خطأ أثناء الاتصال بالسيرفر، حاول مرة أخرى';
    this.message.set(errorMsg);
  } finally {
    this.loading.set(false);
  }
}
  hidePassword: boolean = true;

  togglePassword(): void {
    this.hidePassword = !this.hidePassword;
  }
  hidePassword2: boolean = true;

  togglePassword2(): void {
    this.hidePassword2 = !this.hidePassword2;
  }
}
