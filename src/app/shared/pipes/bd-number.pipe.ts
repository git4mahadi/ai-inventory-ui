import { Pipe, PipeTransform } from '@angular/core';
import { formatToBdNumberingSystem } from '../../core/utils/bd-number.util';

@Pipe({
  name: 'bdNumber',
  standalone: false,
})
export class BdNumberPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    maxFractionDigits = 2,
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const number = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(number)) {
      return String(value);
    }

    return formatToBdNumberingSystem(number, maxFractionDigits);
  }
}
