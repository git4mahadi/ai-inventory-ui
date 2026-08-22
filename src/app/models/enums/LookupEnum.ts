export class LookupEnum {
  public static EXPENSE_HEAD = new LookupEnum('EXPENSE_HEAD', 'Expense Head');
  public static BANK = new LookupEnum('BANK', 'Category');

  static enums = [LookupEnum.EXPENSE_HEAD, LookupEnum.BANK];

  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }

  readonly key: string;
  readonly value: string;

  public static getValueByEnumKey(itemEnum: LookupEnum) {
    return this.enums.filter((itm) => itm.key === itemEnum.key)[0].value;
  }

  public static getKeyByEnumValue(itemEnum: string) {
    return this.enums.filter((itm) => itm.value === itemEnum)[0].key;
  }
}
