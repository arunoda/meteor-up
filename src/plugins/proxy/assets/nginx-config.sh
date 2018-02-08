cd /opt/<%= proxyName %>/config/vhost.d
<% domains.forEach(function (domain) { %>
  <% if (hasServerConfig) { %>
cat <<CONFIG_EOT > <%= domain %>
client_max_body_size <%= clientUploadLimit %>;
<%- serverConfig %>
CONFIG_EOT
  <% } else { %>
    rm <%= domain %> || true
  <% } %>

  <% if (hasLocationConfig) { %>
cat <<CONFIG_EOT > <%= domain %>_location
<%- locationConfig %>
CONFIG_EOT
  <% } else { %>
    rm <%= domain%>_location || true
  <% } %>
<% }) %>
