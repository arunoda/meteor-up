import {
  escapeEnvQuotes,
  getImagePrefix,
  getNodeVersion,
  runCommand
} from './utils';
import fs from 'fs';

export function prepareBundleSupported(dockerConfig) {
  const supportedImages = ['abernix/meteord', 'zodern/meteor'];

  if ('prepareBundle' in dockerConfig) {
    return dockerConfig.prepareBundle;
  }

  return supportedImages.find(
    supportedImage => dockerConfig.image.indexOf(supportedImage) === 0
  ) || false;
}

export function createDockerFile(appConfig) {
  const {
    env,
    docker: {
      useBuildKit,
      image
    } = {}
  } = appConfig;
  const escapedEnv = escapeEnvQuotes(env);

  const syntax = useBuildKit ? '# syntax=docker/dockerfile:1-experimental' : '';
  const args = Object.entries(escapedEnv).map(([key, value]) => `ARG ${key}="${value}"`).join('\n');
  const copy = useBuildKit ?
    'RUN --mount=type=bind,target=/tmp/__mup-bundle tar -xzf /tmp/__mup-bundle/bundle.tar.gz -C /built_app --strip-components=1' :
    'COPY ./ /built_app';

  return `
    ${syntax}
    FROM ${image}
    RUN mkdir /built_app || true
    ${args}
    # TODO: build instructions
    ${copy}
    RUN cd /built_app/programs/server && \
      npm install --unsafe-perm
  `.trim();
}

export async function prepareBundleLocally(
  buildLocation, api
) {
  const {
    app: appConfig,
    privateDockerRegistry
  } = api.getConfig();
  const startTime = new Date();

  if (!appConfig.docker.useBuildKit) {
    const error = new Error('useBuildKit must be enabled when using prepareBundleLocally');
    error.solution = 'Set app.docker.useBuildKit to true in your config.';
    throw error;
  }

  const bundlePath = api.resolvePath(buildLocation, 'bundle.tar.gz');
  const nodeVersion = await getNodeVersion(bundlePath);
  const image = `${getImagePrefix(privateDockerRegistry)}${appConfig.name}`;
  const dockerFile = createDockerFile(appConfig);
  const dockerIgnoreContent = `
  *
  !bundle.tar.gz
  `;

  console.log('=> Writing Dockerfile');
  fs.writeFileSync(api.resolvePath(buildLocation, 'Dockerfile'), dockerFile);
  fs.writeFileSync(api.resolvePath(buildLocation, 'dockerignore'), dockerIgnoreContent);

  console.log('');
  console.log('=> Updating base image');
  await runCommand('docker', ['login', '--password-stdin', '--username', privateDockerRegistry.username, privateDockerRegistry.host], { stdin: privateDockerRegistry.password });
  await runCommand('docker', ['pull', appConfig.docker.image]);

  console.log('');
  console.log('=> Build image');

  if (appConfig.docker.useBuildKit) {
    process.env.DOCKER_BUILDKIT = '1';
  }

  await runCommand('docker', [
    'build',
    '-t', `${image}:build`,
    '.',
    '--build-arg', `NODE_VERSION=${nodeVersion}`
  ], { cwd: buildLocation });

  console.log('');
  console.log('=> Updating tags');

  // Pull latest image so we can tag is as previous
  // TODO: use docker registry api instead
  await runCommand('docker', ['pull', `${image}:latest`]);
  await runCommand('docker', [
    'tag',
    `${image}:latest`,
    `${image}:previous`
  ]);
  await runCommand('docker', [
    'tag',
    `${image}:build`,
    `${image}:latest`
  ]);
  await runCommand('docker', [
    'push',
    `${image}:previous`
  ]);
  await runCommand('docker', [
    'push',
    `${image}:latest`
  ]);

  const endTime = new Date();
  const durationText = `in ${endTime.getTime() - startTime.getTime()}ms`;

  console.log('=> Finished preparing bundle', durationText);
}
