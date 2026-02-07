export type LogLevel
  = | 'clear'
    | 'log'
    | 'error'
    | 'warn'
    | 'group'
    | 'groupCollapsed'
    | 'groupEnd'
    | 'assert'
    | 'count'
    | 'countReset'
    | 'debug'
    | 'dir'
    | 'info'
    | 'table'
    | 'time'
    | 'timeEnd'
    | 'timeLog'

export interface LogPayload {
  logLevel: LogLevel
  data?: any[]
}
