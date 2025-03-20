import requests
import json

class Sheet:
    def __init__(self, config):
        if not config.get('deploymentId'):
            raise ValueError("No DeploymentId provided")

        self.deploymentId = config['deploymentId']
        self.auth = {'token': config['token']} if 'token' in config else {'username': config['username'], 'password': config['password']}

    def _fetch(self, body):
        url = f"https://script.google.com/macros/s/{self.deploymentId}/exec"
        payload = {**body, **self.auth}

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
            data = response.json()

            if not data.get('success'):
                raise ValueError(data.get('message', "Unknown error from Google Script"))

            return data.get('message')

        except requests.exceptions.RequestException as e:
            raise ValueError(f"Error during request: {e}")
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON response from Google Script")

    def tables(self):
        return self._fetch({'action': 'tables'})

    def get(self, table, query):
        return self._fetch({'action': 'get', 'table': table, 'query': query})

    def set(self, table, items):
        return self._fetch({'action': 'set', 'table': table, 'items': items})

    def rm(self, table, ids):
        return self._fetch({'action': 'rm', 'table': table, 'ids': ids})

    def new(self, table, header):
        return self._fetch({'action': 'new', 'table': table, 'header': header})