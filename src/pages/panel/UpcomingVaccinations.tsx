import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { listVaccinations } from '@/api/endpoints/records';
import type { Pet } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { SyringeIcon } from '@/components/ui/icons';
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
    <section className="space-y-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60">
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-cocoa-900">
        <SyringeIcon className="size-5 text-cocoa-500" />
        {t('overview.upcomingTitle')}
      </h2>
      {loading ? (
        <p className="text-cocoa-500">{t('overview.upcomingLoading')}</p>
      ) : upcoming.length === 0 ? (
        <p className="text-cocoa-600">
          {failed ? t('overview.upcomingError') : t('overview.upcomingEmpty')}
        </p>
      ) : (
        <ul className="divide-y divide-cream-200">
          {upcoming.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <span className="min-w-0">
                <Link
                  to={`/panel/pets/${item.pet.id}`}
                  className="font-extrabold text-cocoa-900 hover:text-brand-700"
                >
                  {item.pet.name}
                </Link>
                <span className="block text-sm text-cocoa-600">
                  {item.vaccineName}
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-cocoa-700">
                {formatDate(item.nextDueAt, i18n.language, {
                  dateStyle: 'medium',
                })}
                {item.nextDueAt <= addDays(today, 30) && (
                  <Badge tone="brand">{t('overview.upcomingSoon')}</Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
