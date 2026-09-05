export class AuthorityEnum {
  public static SUPER_ADMIN = new AuthorityEnum('SUPER_ADMIN', 'Super admin');
  public static ADMIN = new AuthorityEnum('ADMIN', 'Admin');
  public static DEVELOPER = new AuthorityEnum('DEVELOPER', 'Developer');
  public static USER = new AuthorityEnum('USER', 'User');

  static enums = [
    AuthorityEnum.SUPER_ADMIN,
    AuthorityEnum.ADMIN,
    AuthorityEnum.DEVELOPER,
    AuthorityEnum.USER,
  ];

  static enums2 = [
    AuthorityEnum.ADMIN,
    AuthorityEnum.USER,
  ];

  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }

  readonly key: string;
  readonly value: string;

  public static getValueByKey(key?: string | null): string {
    if (!key) {
      return '';
    }
    return this.enums.find((item) => item.key === key)?.value ?? key;
  }
}
