import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { EmployeeList } from './pages/employee-list/employee-list';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: Login },
	{ path: 'signup', component: Signup },
	{ path: 'employees', component: EmployeeList, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'login' },
];
