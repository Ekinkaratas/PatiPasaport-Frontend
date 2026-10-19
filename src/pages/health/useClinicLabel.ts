import { useTranslation } from 'react-i18next';
import { useClinicNames } from './queries';

export function useClinicLabel(clinicIds: string[], ownClinicId?: string) {
  const { t } = useTranslation('health');
  const names = useClinicNames(clinicIds);
  return (clinicId: string) => {
    if (ownClinicId && clinicId === ownClinicId) return t('yourClinic');
    const name = names[clinicId];
    if (name === undefined) return '…';
    return name ?? t('unknownClinic');
  };
}
