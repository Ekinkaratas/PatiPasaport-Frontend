import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { requestHealthAssessment } from '@/api/endpoints/records';
import { isApiError } from '@/api/errors';
import {
  ConditionLikelihood,
  HealthAssessmentStatus,
  HealthRiskLevel,
  LabTrend,
  RecommendationCategory,
  VaccinationDueStatus,
  type HealthAssessment,
} from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ChartIcon, InfoIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, formatDateTime } from '@/lib/format';
import { requestAvailableAt } from './assessmentModel';
import { healthKeys, useHealthAssessment } from './queries';

const RISK_CODES = {
  [HealthRiskLevel.LOW]: 'LOW',
  [HealthRiskLevel.MODERATE]: 'MODERATE',
  [HealthRiskLevel.HIGH]: 'HIGH',
  [HealthRiskLevel.URGENT]: 'URGENT',
} as const;

const RISK_TONES = {
  [HealthRiskLevel.LOW]: 'sage',
  [HealthRiskLevel.MODERATE]: 'brand',
  [HealthRiskLevel.HIGH]: 'coral',
  [HealthRiskLevel.URGENT]: 'coral',
} as const;

const TREND_CODES = {
  [LabTrend.SINGLE]: 'SINGLE',
  [LabTrend.RISING]: 'RISING',
  [LabTrend.FALLING]: 'FALLING',
  [LabTrend.STABLE]: 'STABLE',
} as const;

const TREND_ARROWS = {
  [LabTrend.SINGLE]: '•',
  [LabTrend.RISING]: '↑',
  [LabTrend.FALLING]: '↓',
  [LabTrend.STABLE]: '→',
} as const;

const LIKELIHOOD_CODES = {
  [ConditionLikelihood.LOW]: 'LOW',
  [ConditionLikelihood.MEDIUM]: 'MEDIUM',
  [ConditionLikelihood.HIGH]: 'HIGH',
} as const;

const CATEGORY_CODES = {
  [RecommendationCategory.NUTRITION]: 'NUTRITION',
  [RecommendationCategory.CARE]: 'CARE',
  [RecommendationCategory.FOLLOW_UP_TEST]: 'FOLLOW_UP_TEST',
  [RecommendationCategory.VET_VISIT]: 'VET_VISIT',
  [RecommendationCategory.VACCINATION]: 'VACCINATION',
} as const;

const DUE_CODES = {
  [VaccinationDueStatus.OVERDUE]: 'OVERDUE',
  [VaccinationDueStatus.DUE_SOON]: 'DUE_SOON',
} as const;

function has<K extends PropertyKey>(map: Record<K, unknown>, key: unknown) {
  return Object.prototype.hasOwnProperty.call(map, key as PropertyKey);
}

/** Verilen ana kadar `true`; o an gelince bileşeni yeniden çizer. */
function useWaitUntil(at: number | null): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, at - Date.now()) + 250,
    );
    return () => window.clearTimeout(timer);
  }, [at]);
  return at !== null && now < at;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="font-extrabold text-fg">{title}</h4>
      {children}
    </section>
  );
}

function AssessmentResult({
  assessment,
  confidence,
  generatedAt,
}: {
  assessment: HealthAssessment;
  confidence: number;
  generatedAt: string;
}) {
  const { t, i18n } = useTranslation('health');
  const percent = new Intl.NumberFormat(
    i18n.language === 'tr' ? 'tr-TR' : 'en-GB',
    { style: 'percent', maximumFractionDigits: 0 },
  ).format(confidence || 0);
  const risk = has(RISK_CODES, assessment.riskLevel)
    ? assessment.riskLevel
    : null;

  return (
    <div className="space-y-5 rounded-xl bg-bg p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="flex min-w-0 items-center gap-2 font-extrabold text-fg">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-tint text-accent-strong">
              <ChartIcon className="size-4" />
            </span>
            <span className="min-w-0 wrap-break-word">
              {t('assessment.resultTitle')}
            </span>
          </h3>
          {risk !== null && (
            <Badge
              tone={RISK_TONES[risk]}
              className={
                risk === HealthRiskLevel.URGENT
                  ? 'ring-1 ring-current'
                  : undefined
              }
            >
              {t('assessment.riskLabel', {
                value: t(`assessment.risk.${RISK_CODES[risk]}`),
              })}
            </Badge>
          )}
        </div>
        <Badge className="tabular-nums">
          {t('assessment.confidence', { value: percent })}
        </Badge>
      </div>

      {assessment.summary && (
        <p className="whitespace-pre-line wrap-break-word text-fg">
          {assessment.summary}
        </p>
      )}

      {assessment.findings.length > 0 && (
        <Section title={t('assessment.sections.findings')}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {assessment.findings.map((finding, index) => {
              const trend = has(TREND_CODES, finding.trend)
                ? finding.trend
                : null;
              return (
                <li
                  key={`${index}-${finding.testName}`}
                  className="min-w-0 rounded-xl bg-surface p-4 ring-1 ring-line"
                >
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold wrap-break-word text-fg">
                      {finding.testName}
                    </span>
                    {trend !== null && (
                      <Badge>
                        <span aria-hidden="true">{TREND_ARROWS[trend]}</span>
                        {t(`assessment.trend.${TREND_CODES[trend]}`)}
                      </Badge>
                    )}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line wrap-break-word text-fg">
                    {finding.interpretation}
                  </p>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {assessment.possibleConditions.length > 0 && (
        <Section title={t('assessment.sections.conditions')}>
          <ul className="space-y-3">
            {assessment.possibleConditions.map((condition, index) => (
              <li
                key={`${index}-${condition.name}`}
                className="min-w-0 rounded-xl bg-surface p-4 ring-1 ring-line"
              >
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold wrap-break-word text-fg">
                    {condition.name}
                  </span>
                  {has(LIKELIHOOD_CODES, condition.likelihood) && (
                    <Badge>
                      {t(
                        `assessment.likelihood.${LIKELIHOOD_CODES[condition.likelihood]}`,
                      )}
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-sm whitespace-pre-line wrap-break-word text-fg">
                  {condition.explanation}
                </p>
                {condition.evidence.length > 0 && (
                  <p className="mt-2 text-sm wrap-break-word text-fg-muted">
                    {t('assessment.evidence', {
                      tests: condition.evidence.join(', '),
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {assessment.recommendations.length > 0 && (
        <Section title={t('assessment.sections.recommendations')}>
          <ul className="space-y-2 text-sm">
            {assessment.recommendations.map((item, index) => (
              <li key={index} className="min-w-0 wrap-break-word text-fg">
                {has(CATEGORY_CODES, item.category) && (
                  <span className="font-bold">
                    {t(`assessment.category.${CATEGORY_CODES[item.category]}`)}
                    {': '}
                  </span>
                )}
                <span className="whitespace-pre-line">{item.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {assessment.vaccinationReminders.length > 0 && (
        <Section title={t('assessment.sections.vaccinations')}>
          <ul className="space-y-2 text-sm">
            {assessment.vaccinationReminders.map((item, index) => (
              <li
                key={`${index}-${item.vaccineName}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fg"
              >
                <span className="font-bold wrap-break-word">
                  {item.vaccineName}
                </span>
                {item.nextDueAt && (
                  <span className="text-fg-muted">
                    {t('assessment.dueDate', {
                      date: formatDate(item.nextDueAt, i18n.language, {
                        dateStyle: 'medium',
                      }),
                    })}
                  </span>
                )}
                {has(DUE_CODES, item.status) && (
                  <Badge
                    tone={
                      item.status === VaccinationDueStatus.OVERDUE
                        ? 'coral'
                        : 'brand'
                    }
                  >
                    {t(`assessment.due.${DUE_CODES[item.status]}`)}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {assessment.questionsForVet.length > 0 && (
        <Section title={t('assessment.sections.questions')}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-fg">
            {assessment.questionsForVet.map((question, index) => (
              <li key={index} className="wrap-break-word">
                {question}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {generatedAt && (
        <p className="border-t border-line pt-3 text-sm text-fg-muted">
          {t('assessment.generatedAt', {
            date: formatDateTime(generatedAt, i18n.language),
          })}
        </p>
      )}
    </div>
  );
}

export function HealthAssessmentPanel({ petId }: { petId: string }) {
  const { t, i18n } = useTranslation('health');
  const queryClient = useQueryClient();
  const latest = useHealthAssessment(petId);
  const [asking, setAsking] = useState(false);
  const mutation = useMutation({
    mutationFn: () => requestHealthAssessment(petId),
    onSuccess: (data) => {
      queryClient.setQueryData(healthKeys.assessment(petId), data);
    },
  });

  const notRequested =
    latest.isError && isApiError(latest.error) && latest.error.status === 404;
  const data = latest.data;
  const availableAt = notRequested ? 0 : requestAvailableAt(data);
  const waiting = useWaitUntil(availableAt);

  if (latest.isPending) return <LoadingBlock />;
  if (latest.isError && !notRequested) {
    return <ErrorAlert error={latest.error} />;
  }

  const pending = data?.status === HealthAssessmentStatus.PENDING;
  const showButton = availableAt !== null && !(pending && waiting);
  const notice = notRequested
    ? t('assessment.lead')
    : pending
      ? t('assessment.pendingLong')
      : data?.status === HealthAssessmentStatus.FAILED
        ? t('assessment.failed')
        : data?.isStale
          ? t('assessment.stale')
          : null;

  return (
    <div className="space-y-4">
      {pending && waiting && (
        <p
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl bg-bg px-4 py-3 text-sm text-fg-muted"
        >
          <Spinner className="shrink-0" />
          <span>{t('assessment.pending')}</span>
        </p>
      )}

      {showButton && (
        <div className="flex flex-col gap-3 rounded-xl bg-bg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex min-w-0 items-start gap-3 text-sm text-fg">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-tint text-accent-strong">
              <ChartIcon className="size-4" />
            </span>
            <span className="min-w-0 self-center wrap-break-word">
              {notice}
              {waiting && availableAt !== null && (
                <span className="mt-1 block text-fg-muted">
                  {t('assessment.availableAt', {
                    time: formatDate(
                      new Date(availableAt).toISOString(),
                      i18n.language,
                      { timeStyle: 'short' },
                    ),
                  })}
                </span>
              )}
            </span>
          </p>
          <Button
            variant={notRequested ? 'primary' : 'secondary'}
            size="sm"
            className="shrink-0 self-start sm:self-auto"
            disabled={waiting}
            loading={mutation.isPending}
            onClick={() => setAsking(true)}
          >
            {notRequested ? t('assessment.create') : t('assessment.refresh')}
          </Button>
        </div>
      )}

      {mutation.isError && <ErrorAlert error={mutation.error} />}

      {data?.status === HealthAssessmentStatus.READY && data.assessment && (
        <AssessmentResult
          assessment={data.assessment}
          confidence={data.confidence}
          generatedAt={data.generatedAt}
        />
      )}

      <p className="flex items-start gap-2 text-sm text-fg-muted">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <span>{t('assessment.disclaimer')}</span>
      </p>

      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title={t('assessment.consentTitle')}
        className="max-w-lg"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setAsking(false)}>
              {t('assessment.consentCancel')}
            </Button>
            <Button
              onClick={() => {
                setAsking(false);
                mutation.mutate();
              }}
            >
              {t('assessment.consentConfirm')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 px-6 py-5 text-fg">
          <p className="flex items-start gap-3">
            <InfoIcon className="mt-1 size-5 shrink-0 text-fg-muted" />
            <span>{t('assessment.disclaimer')}</span>
          </p>
          <p className="text-sm text-fg-muted">{t('assessment.consentData')}</p>
        </div>
      </Modal>
    </div>
  );
}
