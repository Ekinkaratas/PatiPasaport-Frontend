import { useTranslation } from 'react-i18next';
import { TextField, type TextFieldProps } from '@/components/form/TextField';

export function PriceField(
  props: Omit<TextFieldProps, 'type' | 'inputMode' | 'trailing'>,
) {
  const { i18n } = useTranslation();
  return (
    <TextField
      type="text"
      inputMode="decimal"
      autoComplete="off"
      maxLength={11}
      placeholder={i18n.language === 'tr' ? '0,00' : '0.00'}
      trailing={
        <span aria-hidden="true" className="pr-3 font-bold text-cocoa-500">
          ₺
        </span>
      }
      {...props}
    />
  );
}
