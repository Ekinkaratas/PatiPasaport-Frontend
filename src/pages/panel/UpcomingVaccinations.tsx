import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { listVaccinations } from '@/api/endpoints/records';
import type { Pet } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { SyringeIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { addDays } from '@/lib/consentExpiry';
import { formatDate, todayInBusinessTimeZone } from '@/lib/format';
import { healthKeys } from '../health/queries';

const PER_PET = 8;
const SHOWN = 5;

export function UpcomingVaccinations({ pets }: { pets: Pet[] }) {
  const { t, i18n } = useTranslation('panel');
  const today = todayInBusinessTimeZone();
  const query = { page: 1, pageSize: PER_PET, onlyUpcoming: true };
  const results = useQueries({
    queries: pets.map((pet) => ({
      queryKey: healthKeys.vaccinations(pet.id, query),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listVaccinations(pet.id, query, signal),
    })),
  });
  const loading = results.some((result) => result.isPending);
  const failed = results.some((result) => result.isError);
  const upcoming = results
    .flatMap((result, index) =>
      (result.data?.vaccinations ?? []).map((item) => ({
        ...item,
        pet: pets[index]!,
      })),
    )
    .filter((item) => item.nextDueAt)
    .sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt))
    .slice(0, SHOWN);

  return (
    <section className="space-y-4 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line">
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-fg">
        <SyringeIcon className="size-5 text-fg-muted" />
        {t('overview.upcomingTitle')}
      </h2>
      {loading ? (
        <p className="text-fg-muted">{t('overview.upcomingLoading')}</p>
      ) : upcoming.length === 0 ? (
        <p className="text-fg-muted">
          {failed ? t('overview.upcomingError') : t('overview.upcomingEmpty')}
        </p>
      ) : (
        <ul>
          {upcoming.map((item) => {
            const soon = item.nextDueAt <= addDays(today, 30);
            return (
              <li
                key={item.id}
                className="relative grid grid-cols-[0.625rem_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-line py-3 last:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2.5 rounded-full',
                    soon ? 'bg-accent light:bg-accent-fg' : 'bg-ok',
                  )}
                />
                <span className="min-w-0">
                  <Link
                    to={`/panel/pets/${item.pet.id}`}
                    className="font-extrabold wrap-break-word text-fg underline-offset-4 after:absolute after:inset-0 hover:underline"
                  >
                    {item.pet.name}
                  </Link>
                  <span className="block text-sm wrap-break-word text-fg-muted">
                    {item.vaccineName}
                  </span>
                  <span className="block text-sm text-fg-muted">
                    {formatDate(item.nextDueAt, i18n.language, {
                      dateStyle: 'medium',
                    })}
                  </span>
                </span>
                {soon && (
                  <Badge tone="brand">{t('overview.upcomingSoon')}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
