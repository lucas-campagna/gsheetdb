export class Sheet {
    constructor(config){
        if (!config.deploymentId){
            throw 'No DeploymentId provided';
        }
        const { token, username, password, deploymentId } = config;
        const auth = token
            ? { token }
            : (
                username && password
                ? { username, password }
                : null
            );
        if (!auth) {
            throw `You tried to auth with username and password but you do not provided either username or passoword`;
        }
        this.fetch = body =>
            fetch(
                `https://script.google.com/macros/s/${deploymentId}/exec`,
                {
                    method: 'POST',
                    body: JSON.stringify({ ...body, ...auth })
                }
            )
            .then(p => p.json())
            .then(({success, message}) => {
                if (!success) {
                    throw message;
                }
                return message
            });
    };
    tables() {
        return this.fetch({ action: 'tables' });
    }
    get(table, query) {
        return this.fetch({ action: 'get', table, query });
    };
    set(table, items) {
        return this.fetch({ action: 'set', table, items });
    };
    rm(table, ids) {
        return this.fetch({ action: 'rm', table, ids });
    };
    new(table, header) {
        return this.fetch({ action: 'new', table, header });
    }
};