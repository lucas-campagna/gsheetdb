type SheetProps = {
  deploymentId: string,
  token?: string,
  username?: string,
  password?: string,
};

type SheetGetType = Promise<ItemType[]>;
type SheetSetType = Promise<null>;
type SheetRmType = Promise<null>;
type SheetNewType = Promise<null>;
type SheetMeTypes = Promise<{
  id: IdType,
  token?: string | number,
  username?: string | number,
  password?: string | number,
  permission: string,
  read: string,
  write: string,
  delete: string,
}>;
type IdType = string | number;
type ItemType = {
  id: IdType
  [key: string]: any
};

class Sheet {
  fetch(body: any): Promise<any>{return new Promise(r => r(null))};
  constructor(config: SheetProps) {
    if (!config.deploymentId) {
      throw "No DeploymentId provided";
    }
    const { token, username, password, deploymentId } = config;
    const auth = token ? { token } : { username, password };
    this.fetch = (body) =>
      fetch(`https://script.google.com/macros/s/${deploymentId}/exec`, {
        method: "POST",
        body: JSON.stringify({ ...body, ...auth }),
      })
        .then((p) => p.json())
        .then(({ success, message }: {success: boolean, message: any}) => {
          if (!success) {
            throw message;
          }
          return message;
        });
  }
  me(): SheetMeTypes {
    return this.fetch({ action: "me" });
  }
  get(table: string | undefined, query: any | undefined): SheetGetType {
    return this.fetch({ action: "get", table, query });
  }
  set(table: string, items: ItemType[]): SheetSetType {
    return this.fetch({ action: "set", table, items });
  }
  rm(table: string, ids: IdType[]): SheetRmType {
    return this.fetch({ action: "rm", table, ids });
  }
  new(table: string, header: string[]): SheetNewType {
    return this.fetch({ action: "new", table, header });
  }
}
export default Sheet;
