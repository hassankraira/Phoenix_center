import { Router } from '@angular/router';
import { routes } from './../app.routes';
import { ApisService } from './../apis-service';
import { Component, OnInit, ChangeDetectorRef, Input, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-teacher',
  standalone: true,
  templateUrl: './teacher.html',
})
export class Teacher implements OnInit {

  @Input() limit?: string; 
  @ViewChild('slider') slider!: ElementRef<HTMLDivElement>;

  teachers: any[] = [];
  displayedTeachers: any[] = [];
  loading = true;

  constructor(
    public api: ApisService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    window.scroll(0,0);
  
    this.api.getTeachers().subscribe({
      next: (data: any[]) => {
        this.teachers = data
          .map(item => ({
            id: item[0],
            firstName: item[1],
            lastName: item[2],
            phoneNumber: item[3],
            gender: item[4],
            img: item[5],
            subject: item[6],
            golden: item[7],
            password: item[8],
            role: item[9],
            username: item[10]
          }))
          .sort((a, b) => {
            if (a.golden === 'Y' && b.golden !== 'Y') return -1;
            if (a.golden !== 'Y' && b.golden === 'Y') return 1;
            return 0;
          });
    
        this.displayedTeachers = this.limit
          ? this.teachers.filter(t => t.golden === 'Y')
          : this.teachers;
    
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error loading teachers', err);
      }
    });
  }    
  openTeacher(id: number) {
    this.router.navigate(['/Teachers', id]);
  }

  // تعديل السكرول ليعتمد على عرض الحاوية (Scroll by container width)
  scrollLeft() {
    const step = this.slider.nativeElement.clientWidth;
    this.slider.nativeElement.scrollBy({
      left: -step,
      behavior: 'smooth'
    });
  }

  scrollRight() {
    const step = this.slider.nativeElement.clientWidth;
    this.slider.nativeElement.scrollBy({
      left: step,
      behavior: 'smooth'
    });
  }
}
