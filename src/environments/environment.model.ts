export interface AppEnvironment {
  production: boolean;
  name: 'dev' | 'qa' | 'prod';
  appUrl: string;
}
