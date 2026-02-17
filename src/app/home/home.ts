import { Teacher } from './../teacher/teacher';
import { Component, OnInit } from '@angular/core';
import { RouterLinkWithHref } from "@angular/router";

@Component({
  selector: 'app-home',
  imports: [Teacher, RouterLinkWithHref],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home  implements OnInit{
  ngOnInit(): void {
    window.scroll(0,0)

  }

}
