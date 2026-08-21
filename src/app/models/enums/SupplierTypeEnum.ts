export class SupplierTypeEnum {
  public static MANUFACTURER = new SupplierTypeEnum('MANUFACTURER', 'Manufacturer');
  public static SUPPLIER = new SupplierTypeEnum('SUPPLIER', 'Supplier');
  public static SUPPLIER_MANUFACTURER = new SupplierTypeEnum(
    'SUPPLIER_MANUFACTURER',
    'Supplier & Manufacturer',
  );
  public static RESELLER = new SupplierTypeEnum('RESELLER', 'Reseller');

  static enums = [
    SupplierTypeEnum.MANUFACTURER,
    SupplierTypeEnum.SUPPLIER,
    SupplierTypeEnum.SUPPLIER_MANUFACTURER,
    SupplierTypeEnum.RESELLER,
  ];

  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }

  readonly key: string;
  readonly value: string;

  public static getValueByEnumKey(itemEnum: SupplierTypeEnum) {
    return this.enums.filter((itm) => itm.key === itemEnum.key)[0].value;
  }

  public static getKeyByEnumValue(itemEnum: string) {
    return this.enums.filter((itm) => itm.value === itemEnum)[0].key;
  }
}
