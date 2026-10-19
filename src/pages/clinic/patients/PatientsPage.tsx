import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { PetSummary } from '@/api/types';
import { RadioGroup } from '@/components/form/RadioGroup';
import { Select } from '@/components/form/Select';
import { TextField } from '@/components/form/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LockIcon, SearchIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { PET_SPECIES } from '@/domain/constants';
import { translateError } from '@/i18n/translateError';
import { pageCountOf } from '@/lib/pagination';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { PetAvatar } from '../../panel/pets/PetAvatar';
import { usePetLabels } from '../../panel/pets/usePetLabels';
import { PATIENTS_PAGE_SIZE, usePatientSearch } from '../queries';
import {
  readSearchParams,
  toSearchQuery,
  validateSearchTerm,
  writeSearchParams,
  type PatientSearchParams,
  type SearchBy,
} from './patientSearch';

function PatientCard({ pet }: { pet: PetSummary }) {
  const labels = usePetLabels();
  const age = labels.age(pet);
  return (
    <Link
      to={`/clinic/patients/${pet.id}`}
      className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-soft ring-1 ring-cream-300/60 transition hover:-translate-y-0.5 hover:ring-brand-300"
    >
      <div className="flex items-center gap-4">
        <PetAvatar species={pet.species} />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-cocoa-900 group-hover:text-brand-700">
            {pet.name}
          </p>
          <p className="truncate text-sm text-cocoa-500">
            {labels.species(pet.species)} · {labels.breed(pet.breed)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{labels.sex(pet.sex)}</Badge>
        {age && <Badge>{age}</Badge>}
      </div>
      {pet.chipNumberMasked && (
        <p className="mt-auto flex items-center gap-1.5 pt-4 font-mono text-sm text-cocoa-500">
          <LockIcon className="size-4" />
          {pet.chipNumberMasked}
        </p>
      )}
    </Link>
  );
}

function SearchForm({
  initial,
  onSearch,
}: {
  initial: PatientSearchParams;
  onSearch: (values: PatientSearchParams) => void;
}) {
  const { t, i18n } = useTranslation('clinic');
  const labels = usePetLabels();
  const [values, setValues] = useState(initial);
  const [termError, setTermError] = useState<string | null>(null);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);

  const update = (next: Partial<PatientSearchParams>) => {
    setValues((current) => ({ ...current, ...next }));
    setTermError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateSearchTerm(values.by, values.q);
    setTermError(error);
    if (error) return;
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    onSearch({ ...values, page: 1 });
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      role="search"
      className="space-y-4 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60"
    >
      <Honeypot {...botGuard.honeypot} />
      {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} />}
      <RadioGroup
        label={t('patients.searchBy')}
        name="by"
        value={values.by}
        onChange={(value) => update({ by: value as SearchBy, q: '' })}
        options={[
          { value: 'name', label: t('patients.byName') },
          { value: 'chip', label: t('patients.byChip') },
        ]}
      />
      <TextField
        label={t('patients.query')}
        name="q"
        autoComplete="off"
        inputMode={values.by === 'chip' ? 'numeric' : 'text'}
        maxLength={values.by === 'chip' ? 21 : 32}
        placeholder={
          values.by === 'chip'
            ? t('patients.chipPlaceholder')
            : t('patients.namePlaceholder')
        }
        value={values.q}
        onChange={(e) => update({ q: e.target.value })}
        error={termError ? translateError(termError, i18n) : null}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t('patients.species')}
          name="species"
          value={values.species}
          onChange={(e) => update({ species: e.target.value })}
          options={[
            { value: '', label: t('patients.allSpecies') },
            ...PET_SPECIES.map((code) => ({
              value: code,
              label: labels.species(code),
            })),
          ]}
        />
        <Select
          label={t('patients.order')}
          name="order"
          value={values.order}
          onChange={(e) =>
            update({ order: e.target.value === 'asc' ? 'asc' : 'desc' })
          }
          options={[
            { value: 'desc', label: t('patients.newest') },
            { value: 'asc', label: t('patients.oldest') },
          ]}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            const cleared: PatientSearchParams = {
              by: 'name',
              q: '',
              species: '',
              order: 'desc',
              page: 1,
            };
            setValues(cleared);
            setTermError(null);
            onSearch(cleared);
          }}
        >
          {t('patients.clear')}
        </Button>
        <Button type="submit">
          <SearchIcon className="size-5" />
          {t('patients.search')}
        </Button>
      </div>
    </form>
  );
}

export function PatientsPage() {
  const { t } = useTranslation('clinic');
  useDocumentTitle(t('patients.pageTitle'));
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readSearchParams(searchParams);
  const search = usePatientSearch(toSearchQuery(params, PATIENTS_PAGE_SIZE));

  const apply = (next: PatientSearchParams) =>
    setSearchParams(writeSearchParams(next));

  const pageCount = search.data
    ? pageCountOf(search.data.total, PATIENTS_PAGE_SIZE)
    : 1;

  return (
    <div className="space-y-6">
      <PageHeader title={t('patients.title')} lead={t('patients.lead')} />
      <SearchForm
        key={searchParams.toString()}
        initial={params}
        onSearch={apply}
      />

      {search.isPending && <LoadingBlock />}
      {search.isError && <ErrorAlert error={search.error} />}
      {search.isSuccess && (
        <>
          <p
            className="text-sm font-semibold text-cocoa-600"
            aria-live="polite"
          >
            {t('patients.results', { count: search.data.total })}
          </p>
          {search.data.total === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-cream-300/60">
              <h2 className="text-lg font-extrabold text-cocoa-900">
                {t('patients.emptyTitle')}
              </h2>
              <p className="mt-2 text-cocoa-600">{t('patients.emptyBody')}</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {search.data.pets.map((pet) => (
                <li key={pet.id}>
                  <PatientCard pet={pet} />
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={params.page}
            pageCount={pageCount}
            busy={search.isFetching}
            onChange={(page) => apply({ ...params, page })}
          />
        </>
      )}
    </div>
  );
}
