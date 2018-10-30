import {
  findKey,
  isEqual,
  partial
} from 'lodash';
import debug from 'debug';
import nodemiral from 'nodemiral';

const log = debug('mup:docker:swarm');

export function findNodeId(nodeIDs, serverName) {
  return findKey(nodeIDs, partial(isEqual, serverName));
}

export function initSwarm(manager, host, api) {
  const list = nodemiral.taskList('Setting Up Docker Swarm');
  const sessions = api.getSessionsForServers([manager]);

  list.executeScript('Creating Manager', {
    script: api.resolvePath(__dirname, 'assets/init-swarm.sh'),
    vars: {
      host
    }
  });

  return api.runTaskList(list, sessions, { verbose: api.getVerbose() });
}

export function promoteNodes(manager, nodeIds, api) {
  const list = nodemiral.taskList('Promoting Nodes to Managers');
  const sessions = api.getSessionsForServers([manager]);

  log('promoting nodes:', nodeIds);
  list.executeScript('Promoting Nodes', {
    script: api.resolvePath(__dirname, 'assets/swarm-promote.sh'),
    vars: {
      nodeIds
    }
  });

  return api.runTaskList(list, sessions, { verbose: api.getVerbose() });
}

export function demoteManagers(manager, nodeIds, api) {
  const list = nodemiral.taskList('Demoting Swarm Managers');
  const sessions = api.getSessionsForServers([manager]);

  log('demoting nodes:', nodeIds, manager);

  list.executeScript('Demoting Managers', {
    script: api.resolvePath(__dirname, 'assets/swarm-demote.sh'),
    vars: {
      nodeIds
    }
  });

  return api.runTaskList(list, sessions, { verbose: api.getVerbose() });
}

export function joinNodes(servers, token, managerIP, api) {
  const list = nodemiral.taskList('Add Swarm Nodes');
  const sessions = api.getSessionsForServers(servers);

  list.executeScript('Joining node', {
    script: api.resolvePath(__dirname, 'assets/swarm-join.sh'),
    vars: {
      token,
      managerIP
    }
  });

  return api.runTaskList(list, sessions, { verbose: api.getVerbose() });
}

export function diffLabels(currentLabels, desiredLabels) {
  const toRemove = [];
  const toAdd = [];

  // check for labels to add or update
  Object.keys(desiredLabels).forEach(server => {
    for (const [label, value] of Object.entries(desiredLabels[server])) {
      if (!currentLabels[server] || currentLabels[server][label] !== value) {
        toAdd.push({ server, label, value });
      }
    }
  });

  // check for labels no longer used
  Object.keys(currentLabels).forEach(server => {
    for (const [label] of Object.entries(currentLabels[server])) {
      if (!desiredLabels[server] || !(label in desiredLabels[server])) {
        toRemove.push({ server, label });
      }
    }
  });

  return { toRemove, toAdd };
}

export function updateLabels(api, manager, toAdd, toRemove) {
  const list = nodemiral.taskList('Update Swarm Labels');
  const session = api.getSessionsForServers([manager]);

  log(`Adding labels ${JSON.stringify(toAdd)}`);

  list.executeScript('Update Labels', {
    script: api.resolvePath(__dirname, 'assets/swarm-labels.sh'),
    vars: {
      toAdd,
      toRemove
    }
  });

  return api.runTaskList(list, session, { verbose: api.getVerbose() });
}
