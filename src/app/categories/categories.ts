import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApisService } from '../apis-service';

interface ServiceItem {
  serviceId: number;
  serviceName: string;
  description: string;
  price: number;
  estimatedDuration: number;
  startWork: string;
  endWork: string;
  serviceProviderId: string;
  providerName: string;
  cityName: string;
  categoryName: string;
  imagePath: string;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories implements OnInit {
  services = signal<ServiceItem[]>([]);
  loading = signal(true);
  pageNumber = signal(1);
  pageSize = 9;
  hasMore = signal(false);
  categoryName = signal('');
  categoryId = signal('');

  constructor(
    private route: ActivatedRoute,
    private api: ApisService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') || '';
      this.categoryId.set(id);
      this.pageNumber.set(1);
      this.loadCategory(id);
    });
  }

  loadCategory(id: string) {
    this.loading.set(true);
    this.api.getServicesWithPagination(this.pageNumber(), this.pageSize).subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          const allServices: ServiceItem[] = res.data;
          const cats = [...new Set<string>(allServices.map(s => s.categoryName))].sort();

          let resolvedCategory = id;
          const numId = parseInt(id, 10);
          if (!isNaN(numId) && numId > 0 && numId <= cats.length) {
            resolvedCategory = cats[numId - 1];
          } else if (!cats.includes(id) && cats.length > 0) {
            resolvedCategory = cats[0];
          }

          this.categoryName.set(resolvedCategory);
          const filtered = allServices.filter(s => s.categoryName === resolvedCategory);
          this.services.set(filtered);
          this.hasMore.set(res.data.length >= this.pageSize);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  goToPage(page: number) {
    if (page < 1) return;
    this.pageNumber.set(page);
    this.loadCategory(this.categoryId());
    window.scrollTo(0, 0);
  }
}
