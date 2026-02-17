import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { currentUser } from './../signals/user.signal';
import { Component, OnInit, effect } from '@angular/core';
import { signal } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-admin',
  imports: [RouterLink,RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin  implements OnInit{
  isMenuOpen = signal(false);

  constructor(private router: Router,private title:Title) {
    effect(() => {
      const user = currentUser();
      if (user) {
        this.title.setTitle(`لوحة التحكم - ${user.firstName}`);
      }
    });
  }
  user =currentUser
  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if(storedUser) {
      this.user.set(JSON.parse(storedUser));
      console.log(this.user())
    }
     
  


    // داخل الكلاس
}
  logout() {
    localStorage.removeItem('user'); // مسح بيانات المستخدم
    currentUser.set(null);            // إعادة تعيين الـ Signal
    this.router.navigateByUrl('/Login'); // توجيه المستخدم
  }

}
