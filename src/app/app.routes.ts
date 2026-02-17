import { ViewTeacher } from './view-teacher/view-teacher';
import { Forbidden } from './pages/forbidden/forbidden';
import { ChangePassword } from './change-password/change-password';
import { currentUser } from './signals/user.signal';
import { StudentFinance } from './student-finance/student-finance';
import { SchedulesComponent } from './schedules-component/schedules-component';
import { Classrooms } from './classrooms/classrooms';
import { GroupsMange } from './groups-mange/groups-mange';
import { StudentsManage } from './students-manage/students-manage';
import { TeacherMange } from './teacher-mange/teacher-mange';
import { TeacherPage } from './teacher-page/teacher-page';
import { roleGuard } from './role.guard';
import { authGuard } from './auth.guard';
import { Admin } from './admin/admin';
import { Login } from './login/login';
import { Contactus } from './contactus/contactus';
import { About } from './about/about';
import { Teacher } from './teacher/teacher';
import { Home } from './home/home';
import { Routes } from '@angular/router';
export const routes: Routes = [
{ path: '', redirectTo: 'Home', pathMatch: 'full' },

  {
    path: 'Home',
    component: Home,
    title: 'الصفحة الرئيسية ',
    data: { animation: 'HomePage' }
  },
  {
    path: 'Teachers',
    component: Teacher,
    title: 'المدرسين',
  },
  {
    path: 'About Phoenix',
    component: About,
    title: 'من نحن ',
  },
  {
    path: 'Contact',
    component: Contactus,
    title: 'تواصل معنا',
  },
  {
    path: 'Login',
    component: Login,
    title: 'تسجيل الدخول',
  },
  {
    path: 'admin-dashboard',
    component: Admin,
    canActivate: [authGuard, roleGuard('admin')],
    children: [
      { path: '', redirectTo: 'teachers', pathMatch: 'full' },
      { path: 'teachers', component: TeacherMange},
      { path: 'students', component: StudentsManage},
      { path: 'groups', component: GroupsMange},
      { path: 'classrooms', component: Classrooms},
      { path: 'schedules', component: SchedulesComponent},
      {path: 'student finance', component:StudentFinance}
    ]
  },

  {
    path: 'teacher-dashboard',
    component: TeacherPage,
    canActivate: [authGuard, roleGuard('teacher')]
  },
  {
    path:'Change Password',
    component:ChangePassword,
    canActivate:[authGuard]
  },
  {
    path:'403',
    component:Forbidden
  },
  {
    path:'Teachers/:id',
    component:ViewTeacher,
  }
];
