/** Error HTTP con código estructurado para distinguir autorización y fallos de red. */
export class ApiHttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
  }
}
