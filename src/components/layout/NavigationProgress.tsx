import { useNavigation } from 'react-router';
import { useTranslation } from 'react-i18next';

export function NavigationProgress() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  if (navigation.state !== 'loading') return null;
  return (
    <div
      role="progressbar"
      aria-label={t('navigationLoading')}
      className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-accent-tint"
    >
      <div className="h-full w-1/3 animate-[pp-progress_1.1s_ease-in-out_infinite] bg-accent" />
    </div>
  );
}
