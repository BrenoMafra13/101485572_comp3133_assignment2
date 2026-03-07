import { Injectable } from '@angular/core';
import { computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly tokenStorageKey = 'session_token';
  private readonly token = signal<string | null>(this.readToken());
  readonly isAuthenticated = computed(() => this.token() !== null);

  setToken(value: string): void {
    this.token.set(value);
    localStorage.setItem(this.tokenStorageKey, value);
  }

  clearToken(): void {
    this.token.set(null);
    localStorage.removeItem(this.tokenStorageKey);
  }

  getToken(): string | null {
    return this.token();
  }

  private readToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }
}
