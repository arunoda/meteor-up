import * as _commands from './commands';
import _validator from './validate';

export const description = 'Commands to manage MongoDB';
export const commands = _commands;
export const validate = {
  mongo: _validator
};

export function prepareConfig(config) {
  if (!config.app || !config.mongo) {
    return config;
  }

  config.app.env = config.app.env || {};
  config.app.env.MONGO_URL = `mongodb://mongodb:27017/${config.app.name.split('.').join('')}`;

  if (!config.app.docker) {
    config.app.docker = {};
  }

  if (!config.app.docker.args) {
    config.app.docker.args = [];
  }

  config.app.docker.args.push('--link=mongodb:mongodb');

  return config;
}

export const hooks = {
  'post.default.setup'(api) {
    const config = api.getConfig();
    if (config.mongo) {
      return api.runCommand('mongo.setup').then(() => api.runCommand('mongo.start'));
    }
  },
  'post.default.status'(api) {
    const config = api.getConfig();
    if (config.mongo) {
      return api.runCommand('mongo.status');
    }
  }
};
