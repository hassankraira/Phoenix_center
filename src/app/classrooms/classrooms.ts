import { ApisService } from './../apis-service';
import { Component, signal } from '@angular/core';
interface Rooms{
  Id:number
  Name:string
  Capacity:number
  Is_Active:number,
  Is_Occupied:number,
  Note:string
}
@Component({
  selector: 'app-classrooms',
  imports: [],
  templateUrl: './classrooms.html',
  styleUrl: './classrooms.css',
})

export class Classrooms {
  rooms = signal<Rooms[]>([]);
  loading = signal(true);
constructor(private api:ApisService){
  this.fetchRooms()
}
fetchRooms() {
  this.loading.set(true);
  this.api.getRooms().subscribe({
    next: (data: any[]) => {
      this.rooms.set(
        data.map(item => ({
          Id: item[0],
          Name: item[1],
          Capacity: item[2],
          Note: item[3],
          Is_Active: item[4],   // تأكد أن الاستعلام يرجع IS_ACTIVE هنا
          Is_Occupied: item[5]  // النتيجة الناتجة من الـ CASE في الاستعلام
        }))
      );
     console.log(this.rooms())
      this.loading.set(false);
    },
  error: (err) => {
    console.error('خطأ في جلب القاعات:', err);
    this.loading.set(false);
  }
});

}

}
