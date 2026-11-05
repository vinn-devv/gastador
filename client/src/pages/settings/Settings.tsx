import {
  ChevronRight,
  DatabaseBackup,
  FolderTree,
  Info,
  KeyRound,
  PiggyBank,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBilling } from "../../app/BillingProvider";
import { useData } from "../../app/DataProvider";
import { ScreenSkeleton, Tag } from "../../components/ui/Bits";
import { TextField } from "../../components/ui/Fields";
import { Page, PageHeader, Section } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { updateSettings } from "../../data/repo";
import { APP_VERSION } from "../../data/backup";

function Row({
  to,
  icon: Icon,
  title,
  detail,
  badge,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  detail?: string;
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="settings-row flex min-h-[68px] items-center gap-3 py-2.5"
      >
        <span className="flex h-10 w-8 shrink-0 items-center justify-center text-primary">
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          {detail && (
            <span className="block truncate text-sm text-muted">{detail}</span>
          )}
        </span>
        {badge}
        <ChevronRight
          size={20}
          strokeWidth={1.75}
          className="shrink-0 text-muted"
          aria-hidden
        />
      </Link>
    </li>
  );
}

export default function Settings() {
  const { world } = useData();
  const billing = useBilling();
  const toast = useToast();
  const [name, setName] = useState("");
  useEffect(() => {
    if (world) setName(world.settings.displayName);
  }, [world]);
  if (!world) return <ScreenSkeleton />;
  const dirty = name.trim() !== world.settings.displayName;
  const unlockBadge = billing.prototypeMode ? (
    <Tag tone="good">₱99 Prototype Active</Tag>
  ) : billing.unlocked ? (
    <Tag tone="good">Unlocked</Tag>
  ) : (
    <Tag tone="info">₱99 Plan</Tag>
  );

  return (
    <>
      <PageHeader title="Settings" subtitle="Make Gastador work the way you do." />
      <Page className="max-w-5xl md:mx-0">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-14">
        <div>
        <Section title="Profile">
          <div className="border-y border-line py-4">
            <TextField
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="given-name"
              fieldClassName="!mb-3"
              hint="Only used for the greeting on this device."
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!dirty}
              onClick={() =>
                updateSettings({ displayName: name.trim() }).then(() =>
                  toast("Saved."),
                )
              }
            >
              Save name
            </button>
          </div>
        </Section>

        <Section title="Your money">
          <ul className="divide-y divide-line border-y border-line">
            <Row
              to="/settings/allowance"
              icon={Wallet}
              title="Allowance and cycles"
              detail={`${world.cycles.length} cycle${world.cycles.length === 1 ? "" : "s"}`}
            />
            <Row
              to="/settings/categories"
              icon={FolderTree}
              title="Categories"
              detail={`${world.categories.filter((c) => !c.archivedAt).length} active`}
            />
            <Row
              to="/settings/savings"
              icon={PiggyBank}
              title="Savings goals"
              detail="Kept separate from spending"
            />
          </ul>
        </Section>
        </div>
        <div>
        <Section title="App">
          <ul className="divide-y divide-line border-y border-line">
            <Row
              to="/settings/preferences"
              icon={SlidersHorizontal}
              title="Preferences and alerts"
              detail="Theme, budget method, in-app alerts"
            />
            <Row
              to="/settings/backup"
              icon={DatabaseBackup}
              title="Backup and restore"
              detail="Save a copy of your data, or bring it back"
            />
            <Row
              to="/settings/unlock"
              icon={KeyRound}
              title="₱99 Plan & Prototype"
              detail="Explore premium features & prototype controls"
              badge={unlockBadge}
            />
            <Row
              to="/settings/privacy"
              icon={ShieldCheck}
              title="Privacy and your data"
              detail="What stays on this phone"
            />
            <Row
              to="/settings/about"
              icon={Info}
              title="About Gastador"
              detail={`Version ${APP_VERSION}`}
            />
          </ul>
        </Section>
        </div>
        </div>
      </Page>
    </>
  );
}
