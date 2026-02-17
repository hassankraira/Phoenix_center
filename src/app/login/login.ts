import { Router, RouterLink } from '@angular/router';
import { ApisService } from './../apis-service';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { currentUser } from '../signals/user.signal';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  constructor(private apis:ApisService,private router:Router){}
  loading = signal(false);
  isUserLogin=false;
  showErrorPopup=signal(false)
  user={
    Username:"",
    password:""
  }
  loginError = signal<string | null>(null);

  ngOnInit(): void {
    window.scroll(0,0)

  }
  
  logIN() {
    this.loginError.set(null);
    this.showErrorPopup.set(false);
    this.loading.set(true);

    this.apis.loginUser(this.user).subscribe({
      next: (res: any) => {
        console.log('Login successful', JSON.stringify(res));
  
        const user = res.user;
        localStorage.setItem('user', JSON.stringify(user));
        
        currentUser.set(user); 
        this.isUserLogin = true;
  
        let redirectUrl = '/login';
  
        if (user.Role === 'admin') {
          redirectUrl = '/admin-dashboard';
        } else if (user.Role === 'teacher') {
          redirectUrl = '/teacher-dashboard';
        }
  
        this.router.navigateByUrl(redirectUrl);
        this.loading.set(false);

      },
  
      error: (err: any) => {
        this.loginError.set(err.error?.error || 'بيانات الدخول غير صحيحة');
        this.showErrorPopup.set(true);
        this.loading.set(false);

  
        setTimeout(() => this.showErrorPopup.set(false), 3000);
      }
    });
  }
  
  
  hidePassword: boolean = true;

  togglePassword(): void {
    this.hidePassword = !this.hidePassword;
  }
}



