declare module "oracledb" {
  const OUT_FORMAT_OBJECT: number;
  function initOracleClient(opts?: any): void;
  function getConnection(config: any): Promise<any>;
  export { OUT_FORMAT_OBJECT, initOracleClient, getConnection };
  export default { OUT_FORMAT_OBJECT, initOracleClient, getConnection };
}
