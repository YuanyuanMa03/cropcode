/** Compatibility boundary for local diagnostics after removing the remote analytics SDK. */
export default {
  setConfig(_key: string, _value: unknown): void {},
  sendCustom(_payload: unknown): void {},
  sendEvent(_event: unknown, ..._rest: unknown[]): void {},
  getConfig(): { env: string } {
    return { env: "local" };
  },
};
