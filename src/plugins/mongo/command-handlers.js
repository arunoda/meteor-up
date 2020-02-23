import chalk from 'chalk';
import debug from 'debug';
import nodemiral from 'nodemiral';

const log = debug('mup:module:mongo');

export function logs(api) {
  log('exec => mup mongo logs');

  const args = api.getArgs();
  const sessions = api.getSessions(['mongo']);

  // remove mongo from args sent to docker
  args.shift();

  return api.getDockerLogs('mongodb', sessions, args);
}

export function setup(api) {
  log('exec => mup mongo setup');

  if (!api.getConfig().mongo) {
    // could happen when running "mup mongo setup"
    console.log(
      'Not setting up built-in mongodb since there is no mongo config'
    );

    return;
  }

  const mongoSessions = api.getSessions(['mongo']);
  const meteorSessions = api.getSessions(['app']);

  if (meteorSessions.length !== 1) {
    console.log(
      'To use mup built-in mongodb setup, you should have only one meteor app server. To have more app servers, use an external mongodb setup'
    );

    return;
  } else if (mongoSessions[0]._host !== meteorSessions[0]._host) {
    console.log(
      'To use mup built-in mongodb setup, you should have both meteor app and mongodb on the same server'
    );

    return;
  }

  const list = nodemiral.taskList('Setup Mongo');

  list.executeScript('Setup Environment', {
    script: api.resolvePath(__dirname, 'assets/mongo-setup.sh')
  });

  list.copy('Copying mongodb.conf', {
    src: api.resolvePath(__dirname, 'assets/mongodb.conf'),
    dest: '/opt/mongodb/mongodb.conf'
  });

  const sessions = api.getSessions(['mongo']);

  return api.runTaskList(list, sessions, { verbose: api.verbose });
}

export function start(api) {
  log('exec => mup mongo start');

  const mongoSessions = api.getSessions(['mongo']);
  const meteorSessions = api.getSessions(['app']);
  const config = api.getConfig().mongo;

  if (
    meteorSessions.length !== 1 ||
    mongoSessions[0]._host !== meteorSessions[0]._host
  ) {
    log('Skipping mongodb start. Incompatible config');

    return;
  }

  const list = nodemiral.taskList('Start Mongo');

  list.executeScript('Start Mongo', {
    script: api.resolvePath(__dirname, 'assets/mongo-start.sh'),
    vars: {
      mongoVersion: config.version || '3.4.1',
      mongoDbDir: config.dbDir || '/var/lib/mongodb'
    }
  });

  const sessions = api.getSessions(['mongo']);

  return api.runTaskList(list, sessions, { verbose: api.verbose });
}

export function stop(api) {
  log('exec => mup mongo stop');
  const list = nodemiral.taskList('Stop Mongo');

  list.executeScript('stop mongo', {
    script: api.resolvePath(__dirname, 'assets/mongo-stop.sh')
  });

  const sessions = api.getSessions(['mongo']);

  return api.runTaskList(list, sessions, { verbose: api.verbose });
}

export async function status(api) {
  const config = api.getConfig();

  if (!config.mongo) {
    return;
  }
  const mongoServer = Object.keys(config.mongo.servers)[0];
  const server = config.servers[mongoServer];

  const { output: dockerStatus } = await api.runSSHCommand(
    server,
    'docker inspect mongodb --format "{{json .}}"'
  );
  const mongoCommand = '"JSON.stringify(db.runCommand({serverStatus: 1, metrics: 0, wiredTiger: 1}))"';
  let {
    output: mongoStatus
  } = await api.runSSHCommand(
    server,
    `docker exec mongodb mongo --eval ${mongoCommand} --quiet`
  );

  try {
    mongoStatus = JSON.parse(mongoStatus);
  } catch (e) {
    console.log(chalk.red('\n=> Mongo Status'));
    console.log(chalk.red(' - Stopped'));

    return;
  }

  const mongoVersion = mongoStatus.version;
  const connections = mongoStatus.connections.current;
  const storageEngine = mongoStatus.storageEngine.name;

  let containerStatus;
  let statusColor = 'green';
  let createdTime;
  let restartCount = 0;
  let restartCountColor = 'green';
  let overallColor = 'green';

  if (dockerStatus.trim() === '') {
    containerStatus = 'Not started';
    statusColor = 'red';
  } else {
    const info = JSON.parse(dockerStatus);
    containerStatus = info.State.Status;

    if (info.State.Restarting) {
      statusColor = 'yellow';
    } else if (info.State.Running !== true) {
      statusColor = 'red';
    }

    const hour = 1000 * 60 * 60;
    createdTime = info.Created;
    const upTime = new Date(info.State.FinishedAt).getTime() -
     new Date(info.Created).getTime();
    restartCount = info.RestartCount;

    if (restartCount > 0 && upTime / hour <= restartCount) {
      restartCountColor = 'red';
    } else if (restartCount > 1) {
      restartCountColor = 'yellow';
    }
  }

  if (
    statusColor === 'green' &&
    restartCountColor === 'green'
  ) {
    overallColor = 'green';
  } else {
    console.log('status', statusColor === 'green');
    console.log('restart', restartCountColor === 'green');
    overallColor = 'red';
  }

  console.log(chalk[overallColor]('\n=> Mongo Status'));
  console.log(chalk[statusColor](`  ${containerStatus} on server ${server.host}`));
  console.log(chalk[restartCountColor](`  Restarted ${restartCount} times`));
  console.log(`  Running since ${createdTime}`);
  console.log(`  Version: ${mongoVersion}`);
  console.log(`  Connections: ${connections}`);
  console.log(`  Storage Engine: ${storageEngine}`);
}
