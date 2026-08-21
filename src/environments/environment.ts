import { AppEnvironment } from './environment.model';
import { environment as devEnvironment } from './environment.dev';

/**
 * Default environment used by the app.
 * Replaced at build time with qa/prod via angular.json fileReplacements.
 */
export const environment: AppEnvironment = devEnvironment;
