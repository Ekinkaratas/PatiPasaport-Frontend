import { useTranslation } from 'react-i18next';
import { PetSex, type Pet } from '@/api/types';
import { ageFromBirthDate } from '@/lib/age';
import { todayInBusinessTimeZone } from '@/lib/format';
import { isPetSpecies } from './petFormModel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

export function usePetLabels() {
  const { i18n } = useTranslation();
  const t = i18n.t.bind(i18n) as unknown as LooseT;

  const species = (code: string) =>
    isPetSpecies(code) ? t(`enums:species.${code}`) : code;

  const breed = (code: string) =>
    i18n.exists(`enums:breed.${code}`) ? t(`enums:breed.${code}`) : code;

  const sex = (value: number) =>
    value === PetSex.MALE || value === PetSex.FEMALE
      ? t(`enums:sex.${value}`)
      : '';

  const age = (pet: Pick<Pet, 'birthDate' | 'isBirthDateEstimated'>) => {
    if (!pet.birthDate) return null;
    const parts = ageFromBirthDate(pet.birthDate, todayInBusinessTimeZone());
    if (!parts) return null;
    let text: string;
    if (parts.years === 0 && parts.months === 0) {
      text = t('pets:age.newborn');
    } else if (parts.years === 0) {
      text = t('pets:age.monthsOld', { count: parts.months });
    } else if (parts.months === 0 || pet.isBirthDateEstimated) {
      text = t('pets:age.years', { count: parts.years });
    } else {
      text = t('pets:age.yearsMonths', {
        years: t('pets:age.years', { count: parts.years }),
        months: t('pets:age.months', { count: parts.months }),
      });
    }
    return pet.isBirthDateEstimated
      ? t('pets:age.approx', { age: text })
      : text;
  };

  return { species, breed, sex, age };
}
