import { http, HttpResponse } from 'msw';

export const errorHandlers = {
  unauthorized: (url: string) =>
    http.all(url, () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),

  rateLimited: (url: string) =>
    http.all(url, () => HttpResponse.json({ error: 'Too Many Requests' }, { status: 429 })),

  serverError: (url: string) =>
    http.all(url, () => HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })),

  timeout: (url: string) => http.all(url, () => new Promise(() => {})),

  invalidJson: (url: string) =>
    http.all(
      url,
      () => new HttpResponse('not-json{{{', { headers: { 'Content-Type': 'application/json' } }),
    ),
};
