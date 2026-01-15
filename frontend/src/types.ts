import { main } from '../wailsjs/go/models';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type AuthType = 'none' | 'basic' | 'bearer' | 'oauth2';

export type HttpRequest = main.HttpRequest;
export type HttpResponse = main.HttpResponse;
export type HistoryRecord = main.HistoryRecord;
export type KeyValue = main.KeyValue;
export type RequestBody = main.RequestBody;
export type Project = main.Project;
export type Token = main.Token;
export type Environment = main.Environment;
export type Auth = main.Auth;
export type Scripts = main.Scripts;
export type ScriptResult = main.ScriptResult;
export type TestResult = main.TestResult;

export interface Tab {
  id: string;
  title: string;
  request: HttpRequest;
  response?: HttpResponse;
  error?: string;
}
