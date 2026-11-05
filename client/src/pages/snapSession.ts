import type { FormPrefill } from '../components/ExpenseForm';

interface Session {
  prefill: FormPrefill;
  imageUrl: string;
  rawText: string;
  quality: 'good' | 'fair' | 'poor' | 'failed';
}

let session: Session | null = null;
let sharedFile: File | null = null;

export function setSnapSession(next: Session | null): void {
  if (session?.imageUrl && session.imageUrl !== next?.imageUrl) URL.revokeObjectURL(session.imageUrl);
  session = next;
}

export const getSnapSession = (): Session | null => session;
export const setSharedFile = (f: File | null): void => {
  sharedFile = f;
};
export const takeSharedFile = (): File | null => {
  const f = sharedFile;
  sharedFile = null;
  return f;
};
