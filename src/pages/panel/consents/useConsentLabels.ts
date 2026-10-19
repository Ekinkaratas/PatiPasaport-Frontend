import { useTranslation } from 'react-i18next';
import { ConsentStatus } from '@/api/types';
import { CONSENT_SCOPES, type ConsentScope } from '@/domain/constants';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

export function isConsentScope(value: string): value is ConsentScope {
  return (CONSENT_SCOPES as readonly string[]).includes(value);
}

export function useConsentLabels() {
  const { i18n } = useTranslation();
  const t = i18n.t.bind(i18n) as unknown as LooseT;

  const scopeLabel = (scope: string) =>
    isConsentScope(scope) ? t(`enums:consentScope.${scope}.label`) : scope;

  const scopeDescription = (scope: string) =>
    isConsentScope(scope) ? t(`enums:consentScope.${scope}.description`) : '';

  const status = (value: number) =>
    value >= ConsentStatus.ACTIVE && value <= ConsentStatus.NOT_FOUND
      ? t(`enums:consentStatus.${value}`)
      : String(value);

  return { scopeLabel, scopeDescription, status };
}
