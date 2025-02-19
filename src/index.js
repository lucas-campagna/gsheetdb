export class Sheet {
    constructor(config){
        if (!config.deploymentId){
            throw 'No DeploymentId provided';
        }
        this.fetch = body =>
            fetch(
                `https://script.google.com/macros/s/${config.deploymentId}/exec`,
                {
                    method: 'POST',
                    body: JSON.stringify(body)
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
};