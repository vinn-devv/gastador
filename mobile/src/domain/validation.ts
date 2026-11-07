export class ValidationError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super(Object.values(fields)[0] ?? 'Invalid data.');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}
