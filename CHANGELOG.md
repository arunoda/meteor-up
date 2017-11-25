## 1.3.6 - Nov 24, 2017
- Fix permission denied errors when deploying to nonroot user (@nickich)
- Make bundle portable (@m-niesluchow)

## 1.3.5 - Nov 3, 2017
- Fix tar errors
- The validation message shown when the `servers` object is missing from the config has been removed since some deployment plugins might not need it
- The config created by `mup init` has the correct docker image for Meteor 1.6
- Add table to docs that shows which docker image to use for each Meteor version

**Plugins**
- The remaining Meteor functionality has been removed from the default plugin, allowing plugins to completely take over deploying and managing the app when `app.type` in the config is set to something besides `meteor`

## 1.3.4 - October 4, 2017
- The exit code for `mup validate` is now 1 when there are validation errors
- Fix changing proxy's clientUploadLimit with `proxy.shared.clientUploadLimit`
- Added a `--scrub` option to `mup validate`, which when used with `--show` shows the config with most of the sensitive information removed
- `mup mongo logs` accepts the same options as `mup logs` and other log commands
- Use npm-shrinkwrap to prevent https://github.com/zodern/meteor-up/issues/757 from happening again
- Hide docker error when trying to roll back and checking if an image exists. It is handled and normal, but could be confused with the reason for the app failing to start

**Plugins and Hooks**
- Building the app (but not archiving it) was moved to a new command `meteor.build`, which is run by `meteor.deploy` and `meteor.push`. This allows plugins or hooks to modify the bundle before it is archived and uploaded to the servers.
- Plugins can export a `scrubConfig(config, utils)` function, which should return the config with all sensitive information removed
- `api.scrubConfig()` was added, which returns the config after modified by any `scrubConfig` functions from plugins
- `api.validateConfig` only shows the errors on the console the first time it is run
- `MODULE_NOT_FOUND` errors are now shown when a plugin fails to load due to being unable to resolve a module

**Docs**
- Color, font, and spacing changes were made to the docs. It should look nicer and be easier to read.
- Fixed grammar and capitalization
- Many example configs in the docs are validated with `mup validate`
- Many example configs show more of the config surrounding the section being documented

## 1.3.3 - September 12, 2017
- Add `mup validate` command, which validates the config. Has `--show` option which shows the config after it has been normalized and modified by plugin's `prepareConfig` functions
- Add `mup proxy logs-le` to view the Let's Encrypt logs
- Fix mup ignoring `app.dockerImage` in the config when using Mongo, the reverse proxy, or Redis
- Fix error encountered during Verifying SSL Certificates after it had failed previously due to a docker container still running
- Give more details when unable to load settings.json

## 1.3.2 - September 8, 2017
- App's env variables are set before `npm install` during Prepare Bundle
- Fix error sometimes encountered when starting app after updating Mup to 1.3
- Periods are removed from the database name when using built-in MongoDB
- Removed validation error `"meteor.name" has a period`
- Fix Prepare Bundle when app name has uppercase letters
- Fix reverse proxy's let's encrypt and force ssl not working when `app.env` is missing
- Fix crash when `app.name` is missing

## 1.3.1 - August 23, 2017
- Add `mup ssh <server>` command
- Exit code when task list fails is now 1 instead of 0
- Fix deploying when server's default shell is zsh @thsowers
- All docker commands are run with `sudo`
- `mup proxy stop` doesn't require the `proxy` object to be in the config
- Add option `app.docker.prepareBundle` to enable or disable prepare bundle

## 1.3.0 - August 22, 2017

**Hooks**

It is now possible to add hooks that run before or after commands. The new `--show-hook-names` option shows all of the available hooks for a cli command while it is running. Hooks can be a command to run locally or on the servers, or a function.

**Plugins**

Plugins are npm packages that can add commands (commands can be run from the mup cli or by other plugins), hooks, and config validators. All of the included cli commands and task lists have been moved to plugins.

**Changes to Deployment and Deployment validation**

*This is currently only enabled for the `abernix/meteord` docker image.*

After the bundle is uploaded to each server, a new task is run called "Prepare bundle". It installs the Meteor npm dependencies, rebuilds native modules, and stores the result in a docker image. This has a few benefits:
- The time in `meteor.deployCheckWaitTime` no longer needs to include the time to install npm dependencies
- When installing dependencies fails, it does not continuously restart until `meteor.deployCheckWaitTime` expires, and running with `--verbose` shows the full logs from `npm install`
- Dependencies are only installed once during each deploy. This means that `mup start`, `mup restart`, and `mup reconfig` are all much faster.

**Improved Support for Multiple Servers**
- `mup restart` restarts only one server at a time
- Add `--servers` option to list which servers to use
- Add support for server specific env variables, which can be configured in `meteor.servers.<server name>.env`

**Config Changes**
- The `meteor` object has been renamed to `app`. The `meteor` object will be supported until Mup 2.0
- You can remove `mongo.port` and `mongo.oplog` from your config since they have never been used

**Docs**
- Remove `meteor.docker.imagePort`, `mongo.port`, and `mongo.oplog` from example configs
- Document `meteor.docker.imagePort`
- Update documentation for `meteor.deployCheckWaitTime`
- Improve mongo, migration, proxy, and troubleshooting docs

**Other Changes**
- The reverse proxy can redirect `http` to `https`, configured with `proxy.ssl.forceSSL`
- `mup setup` updates Docker if it is older than 1.13
- Add `mup proxy reconfig-shared` to update the server after changing `proxy.shared` in the config.
- Remove `meteor.deployCheckWaitTime`, `meteor.docker.imagePort`, and `mongo.port` from default config
- Renamed the `meteor` object in the default config to `app`
- Improve cli help output (commands have a description, command specific options are documented)
- Show link to docs when there are validation errors
- Show validation error when `server.pem` is a path to a public key
- Show validation error when `app.name` has a period
- Improve some of the validation messages
- Fix validating `proxy.shared.clientUploadLimit`
- Mup displays message and exits if the node version is older than v4
- Remove unnecessary stack traces when the app's path is incorrect or `meteor build` fails
- Add `mup meteor restart` command
- Remove `mup mongo dump` command since it did nothing

## 1.2.11 - June 14, 2017
- Deployment verifier shows last 100 lines of the app's log when it fails (it previously was 50 lines)
- Fix `mup setup` restarting docker

## 1.2.10 - June 4, 2017
- Deployment verifier no longer requires the http status code to be 200.

## 1.2.9 - June 3, 2017
- Add shared nginx proxy
    - Is configured with a `proxy` object instead of using `meteor.ssl` and `meteor.nginx`
    - If multiple apps are deployed to a server, routes requests to the correct container
    - Adds `mup proxy` command. For a list of subcommands, run `mup proxy help`
    - Supports using custom certificates. This should be used instead of `meteor.ssl` since the previous image used for custom certificates had a security vulnerability.
    - Also can set up Let's Encrypt
    - Supports configuring the env variables for the nginx and let's encrypt containers.

Big thanks to @shaiamir for his work on the shared proxy.

- `mup stop` also stops nginx proxy and let's encrypt containers
- App inside container's port is set to `docker.imagePort`. The app is still accessible on `env.PORT`.
- Will build app if cached build is not found and `--cached-build` flag is set
- Fix some bugs with verifying deployment
- Add support for `zodern:mup-helpers` package. Since version 1.2.7, verifying deployment fails if the app's `/` route's http code is other than 200, or if it does not redirect on the server to a page that does have that http code. Adding `zodern:mup-helpers` allows meteor up to successfully validate the deployment.

## 1.2.7 - May 5, 2017
- Fix verifying deployment when using ssl autogenerate
- Add default host to nginx-proxy to redirect unknown hosts to the app when accessed over http
- Remove `force-ssl` warning and add a note about redirects to the Troubleshooting guide in the readme
- Fix example config in readme @meteorplus
- Fix setting `HTTPS_METHOD` for nginx-proxy. It will no longer redirect http to https
- Validator warns when using ssl autogenerate and setting `env.PORT`.

## 1.2.6 - March 29, 2017
- Fix `force-ssl` warning appearing when ssl is setup correctly

## 1.2.5 - March 22, 2017
- Support changing docker exposed port @abernix
- New `mup docker restart` command
- New `mup docker ps` command. It accepts all arguments that `docker ps` accepts
- Old ssh key and bundle are deleted before uploading new ones
- Setting up Mongo and Meteor are no longer in parallel
- `--verbose` flag also shows output from scripts run on the server
- MongoDB is safely shutdown for `Start Mongo` and `Stop Mongo` task lists
- Reduced number of dependencies installed
- Better error message on meteor build spawn error
- Setup tasks are consistently capitalized
- Clearer validator message for `ROOT_URL`
- Add warning message when using `force-ssl` without ssl setup
- Validate `meteor.ssl.upload` @markreid

## 1.2.4 - March 13, 2017
- Add tips to default config, and comment what needs to be changed
- `mup init` and `mup setup` suggests what to do next
- Startup script is updated during `mup reconfig`
- Default build path is consistent between deploys for each app
- Add `--cached-build` flag to `mup deploy` which uses the build from the previous deploy
- Configure additional docker networks, ip binding, and verification port @giordanocardillo
- Add `--verbose` flag to show output from `meteor build`
- Handles promise rejections
- Fix docker not always disconnecting containers from networks @joaolboing
- Fix stderr sometimes in wrong place in logs
- Fix some lines in logs would be missing the host name
- Fix validating buildLocation
- Fix path to temp folder on Windows

## 1.2.3 - March 4, 2017
- Default config uses meteor.docker object instead of dockerImage @maxmatthews
- Docker args from config are no longer escaped @maxmathews
- Add buildLocation for validator @stubbegianni
- Improved messages from validator
- Fix nginx-proxy not starting on server restart
- Fix documentation on changing port @maxmathews

## 1.2.2 - Feb 11, 2017
- Configure nginx max client upload size, and increase default to `10M` (@shadowcodex)
- Displays better message if it can not find the meteor app
- Displays message if can not find pem for server
- Improve validating server's `host` in config
- Validator checks for `http://` or `https://` in `ROOT_URL`
- Update documentation on using `mup` on Windows

## 1.2.1 - Feb 8, 2017
- All paths support "~"
- Add `server` and `allowIncompatibleUpdates` to build config (@alvelig)
- Allow `mobile-settings` build option to use `settings.json` file (@alvelig)
- Add `mup --version` command
- Fix validating env `variables` and `imageFrontendServer`

## 1.2.0 - Feb 7, 2017
- Support Meteor 1.4 by default (@ffxsam)
- Change mongo version
- Validates `mup.js` and displays problems found in it
- Update message is clearer and more colorful
- `uploadProgressBar` is part of default `mup.js`
- Add trailing commas to mup.js (@ffxsam)
- Improve message when settings.json is not found or is invalid
- Loads and parses settings.json before building the app
- Improve message when given unknown command
- Fix switching from auto-generated ssl certificates to upload certificates
- Fix `Error: Cannot find module 'ssh2'`
- Fix `mup logs` when using custom configuration or settings files

## 1.1.2 - Feb 4, 2017
- Fixed `mup setup` when using let's encrypt

## 1.1.1 - Feb 4, 2017
- Fixed some files had windows line endings

## 1.1 - Feb 4, 2017
- Add let's encrypt support (@mbabauer)
- Fix typo (@timbrandin)
- Help is shown for `mup` and `mup help`
- Improved help text