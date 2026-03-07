import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

@Component({
  selector: 'app-employee-list',
  imports: [],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeList {
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);

  readonly employees = signal<Employee[]>([
    {
      id: '1',
      firstName: 'Breno',
      lastName: 'Mafra',
      email: 'breno@example.com',
    },
    {
      id: '2',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  ]);

  logout(): void {
    this.sessionService.clearToken();
    this.router.navigate(['/login']);
  }
}
