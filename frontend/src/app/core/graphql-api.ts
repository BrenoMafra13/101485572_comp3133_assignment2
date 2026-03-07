import { Injectable, inject } from '@angular/core';
import { SessionService } from './session';

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

@Injectable({
  providedIn: 'root',
})
export class GraphqlApiService {
  private readonly sessionService = inject(SessionService);
  private readonly graphqlUrl = 'http://localhost:5001/graphql';

  async request<T>(query: string, variables: Record<string, unknown> = {}, withAuth = false): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (withAuth) {
      const token = this.sessionService.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error('Request failed')
    }

    const payload = (await response.json()) as GraphqlResponse<T>;

    if (payload.errors && payload.errors.length > 0) {
      throw new Error(payload.errors[0].message || 'GraphQL error')
    }

    if (!payload.data) {
      throw new Error('No data returned')
    }

    return payload.data;
  }
}
