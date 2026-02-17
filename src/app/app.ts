import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Footer } from "./footer/footer";
import { currentUser } from './signals/user.signal'; // تأكد من المسار الصحيح
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit{
  constructor(  private router: Router){}
  user =currentUser
  currentRoute:string=""
  ngOnInit(): void {
      this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd ) {
        this.currentRoute = event.urlAfterRedirects;
        console.log('Current route:', this.currentRoute);
      }


    });
    const storedUser = localStorage.getItem('user');
    if (storedUser && !this.user()) {
       this.user.set(JSON.parse(storedUser));
       
    }


  }


  goToDashboard() {
    const user = this.user();
    if (!user) return; // إذا لم يكن هناك مستخدم

    let redirectUrl = '/login'; // افتراضي

    if (user.Role === 'admin') {
      redirectUrl = '/admin-dashboard';
    } else if (user.Role === 'teacher') {
      redirectUrl = '/teacher-dashboard';
    }

    this.router.navigateByUrl(redirectUrl);
  }

  protected readonly title = signal('phoenix');
  isMenuOpen = false;
  active: string = 'home';

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
 
}
