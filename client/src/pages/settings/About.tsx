import { LogoMark } from '../../components/Logo';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { APP_VERSION } from '../../data/backup';

export default function About() {
  return (
    <>
      <PageHeader title="About Gastador" back="/settings" />
      <Page className="max-w-2xl md:mx-0">
        <div className="card flex items-center gap-4 p-5">
          <LogoMark size={56} />
          <div>
            <p className="text-lg font-semibold">Gastador</p>
            <p className="text-muted">Snap it. Track it. Stretch it.</p>
            <p className="num text-sm text-muted">Version {APP_VERSION}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3 text-muted">
          <p>Gastador helps students make a weekly, biweekly, or monthly allowance last. Daily amounts use Philippine dates and count today and the last day of your cycle.</p>
          <p>Reading receipts is best-effort. It can miss or misread details, so always check before saving.</p>
          <p>Gastador is not connected to GCash or Maya and never asks for their login details.</p>
        </div>
      </Page>
    </>
  );
}
