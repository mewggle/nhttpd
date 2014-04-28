var opt = opt = require('optimist')
  .options('v', {
    alias: 'vhost',
    describe: 'path to vhost settings',
    default: "vhost"
  })
  .options('p', {
    alias: 'port',
    describe: 'server port',
    default: 3000
  });

var http = require('http'),
  https = require('https'),
  httpProxy = require('http-proxy'),
  statics = require('node-static'),
  argv = opt.argv,
  fs = require('fs');

var config = {
  port: 3000
};

if (isNaN(parseInt(argv.port))) {
  console.log('Unable to parse argv.port: %s. Use default: %d', argv.port, config.port);
} else {
  config.port = parseInt(argv.port)
};

if (fs.lstatSync(argv.vhost).isDirectory()) {
  var cfg = fs.readdirSync(argv.vhost);
  var vhost = cfg.vhost = {};
  for (var i = cfg.length - 1; i >= 0; i--) {
    if (cfg[i].substring(cfg[i].length - 5).toLowerCase() !== ".json") {
      continue;
    }
    try {
      var path = argv.vhost + "/" + cfg[i],
        x = JSON.parse(fs.readFileSync(path, 'utf8'));
      if (vhost[x.host] !== undefined) {
        console.warn('Same `host` in duplicate vhost config. Dropped:', path);
      } else if (x.path === undefined || !fs.lstatSync(x.path).isDirectory()) {
        console.warn('`path` is not specified or not a directory:', x.path);
      } else {
        vhost[x.host] = x;
      }
    } catch (e) {
      // TODO: show error;
    }
  }
} else {
  console.error('Given a wrong vhost param: %s (not a directory)', argv.dir);
  process.exit(1);
}
// init
for (var x in vhost) {
  vhost[x].staticServer = new statics.Server(vhost[x].path);
  if (config.defaultHost === undefined || vhost[x].isDefault === true) {
    config.defaultHost = x;
  }
}

var proxy = httpProxy.createProxyServer({});

var server = http.createServer(function(req, res) {
  var u = require('url').parse(req.url),
    host = req.headers.host,
    cfg = vhost[host],
    isProxy = false,
    pathname = u.pathname;
  if (host.indexOf(":") > -1) {
    host = host.substring(0, host.indexOf(":"));
    cfg = vhost[host];
  }
  if (cfg === undefined) {
    console.error('Cannot found vhost: %s, use default host: %s', host, config.defaultHost);
    cfg = vhost[config.defaultHost]
  }
  for (var p in cfg.proxy) {
    if (pathname.indexOf(p) === 0) {
      isProxy = true;
      proxy.web(req, res, {
        target: cfg.proxy[p]
      });
      break;
    }
  }
  if (!isProxy) {
    cfg.staticServer.serve(req, res, function(e, res) {
      if (e && (e.status === 404)) { // If the file wasn't found
        cfg.staticServer.serveFile('/index.html', 200, {}, request, response);
      }
    });
  }
})

proxy.on('error', function(err, req, res) {
  if (err) {
    console.log(err)
  }
});

console.log("Server running: http://localhost:" + config.port);
server.listen(config.port);