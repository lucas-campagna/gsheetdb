class Sheet {
  constructor(config) {
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
        .then(({ success, message }) => {
          if (!success) {
            throw message;
          }
          return message;
        });
  }
  me() {
    return this.fetch({ action: "me" });
  }
  get(table, query) {
    return this.fetch({ action: "get", table, query });
  }
  set(table, items) {
    return this.fetch({ action: "set", table, items });
  }
  rm(table, ids) {
    return this.fetch({ action: "rm", table, ids });
  }
  new(table, header) {
    return this.fetch({ action: "new", table, header });
  }
}
export default Sheet;
