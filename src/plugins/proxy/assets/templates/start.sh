#!/bin/bash

APPNAME=<%= appName %>
APP_PATH=/opt/$APPNAME
NGINX_PROXY_VERSION="1.0.0"
LETSENCRYPT_COMPANION_VERSION="v1.13.1"

# Shared settings
source $APP_PATH/config/shared-config.sh
: ${HTTP_PORT:=80}
: ${HTTPS_PORT:=443}
: ${CLIENT_UPLOAD_LIMIT="10M"}

ENV_FILE=$APP_PATH/config/env.list
ENV_FILE_LETSENCRYPT=$APP_PATH/config/env_letsencrypt.list

<% include ../proxy-stop.sh %>

# We don't need to fail the deployment because of a docker hub downtime
set +e
sudo docker pull jrcs/letsencrypt-nginx-proxy-companion:$LETSENCRYPT_COMPANION_VERSION
sudo docker pull zodern/nginx-proxy:$NGINX_PROXY_VERSION
set -e
echo "Pulled zodern/nginx-proxy and jrcs/letsencrypt-nginx-proxy-companion"

# This updates nginx for all vhosts
NGINX_CONFIG="client_max_body_size $CLIENT_UPLOAD_LIMIT;";
NGINX_CONFIG_PATH="/opt/$APPNAME/config/nginx-default.conf"

# Only add client_max_body_size if it doesn't already exist
# The value should only change when `mup proxy reconfig-shared` is run
# That also resets the config, allowing this line to be added again with the new value
# If the user's custom config already has this option, or a comment
# containing this option, then the config will not be modified
if ! grep -q "client_max_body_size" "$NGINX_CONFIG_PATH"; then
  echo $NGINX_CONFIG >> /opt/$APPNAME/config/nginx-default.conf
fi

TEMPLATE_PATH=/opt/$APPNAME/config/nginx.tmpl
SHARED_TEMPLATE=/opt/$APPNAME/config/nginx-shared.tmpl
if [ -e $SHARED_TEMPLATE ]; then
  TEMPLATE_PATH=$SHARED_TEMPLATE
fi

sudo docker run \
  -d \
  -p $HTTP_PORT:80 \
  -p $HTTPS_PORT:443 \
  --name $APPNAME \
  --env-file=$ENV_FILE \
  --restart=always \
  --log-opt max-size=100m \
  --log-opt max-file=7 \
  --network bridge \
  -v $TEMPLATE_PATH:/app/nginx.tmpl:ro \
  -v /opt/$APPNAME/mounted-certs:/etc/nginx/certs \
  -v /opt/$APPNAME/config/vhost.d:/etc/nginx/vhost.d \
  -v /opt/$APPNAME/config/html:/usr/share/nginx/html \
  -v /opt/$APPNAME/config/htpasswd:/etc/nginx/htpasswd  \
  -v /opt/$APPNAME/config/nginx-default.conf:/etc/nginx/conf.d/my_proxy.conf:ro \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  -v /opt/$APPNAME/upstream:/etc/nginx/upstream \
  zodern/nginx-proxy:$NGINX_PROXY_VERSION
echo "Ran nginx-proxy as $APPNAME"

sleep 2s

if docker network inspect mup-proxy ; then
  docker network connect mup-proxy $APPNAME
fi

sudo docker run \
  -d \
  --name $APPNAME-letsencrypt \
  --env-file=$ENV_FILE_LETSENCRYPT \
  --restart=always \
  --volumes-from $APPNAME \
  --log-opt max-size=100m \
  --log-opt max-file=3 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  jrcs/letsencrypt-nginx-proxy-companion:$LETSENCRYPT_COMPANION_VERSION
echo "Ran jrcs/letsencrypt-nginx-proxy-companion"

<% if (swarmEnabled) { %>
  docker rm -f $APPNAME-swarm-upstream || true
  docker pull zodern/nginx-proxy-swarm-upstream
  docker run \
    -d \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --network mup-proxy \
    --volumes-from $APPNAME \
    --name $APPNAME-swarm-upstream \
    --env NGINX_PROXY_CONTAINER="$APPNAME" \
    zodern/nginx-proxy-swarm-upstream

  echo "Ran zodern/nginx-proxy-swarm-upstream"
<% } %>
