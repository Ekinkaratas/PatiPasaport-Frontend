import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { TextField, type TextFieldProps } from './TextField';

export function PasswordField(
  props: Omit<TextFieldProps, 'type' | 'trailing'>,
) {
  const { t } = useTranslation('auth');
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('hidePassword') : t('showPassword')}
          aria-pressed={visible}
          className="rounded-lg p-2.5 text-cocoa-500 hover:bg-cream-200 hover:text-cocoa-800"
        >
          {visible ? (
            <EyeOffIcon className="size-5" />
          ) : (
            <EyeIcon className="size-5" />
          )}
        </button>
      }
    />
  );
}
