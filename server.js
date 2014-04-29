var opt = require('optimist')
  .options('h', {
    alias: 'help',
    describe: 'show help'
  })
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

if (opt.argv.help) {
  opt.showHelp();
  process.exit(0);
}

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
  console.log('Initialize profile for hostname `%s`\n', x);
  vhost[x].staticServer = new statics.Server(vhost[x].path, vhost[x].options || {});
  if (config.defaultHost === undefined || (vhost[x].isDefault === true && vhost["*"] === undefined) || x === "*") {
    config.defaultHost = x;
  }
  for (var y in vhost[x].proxy) {
    var o = vhost[x].proxy[y];
    if (typeof o === 'object') {
      if (o.type === 'static') {
        o.staticServer = new statics.Server(o.path, o.options || {});
        console.log('Installed static file route `%s` (%s)', y, o.path);
      } else {
        console.error('Cannot identified proxy.type: `%s` for route `%s`', o.type, y);
      }
    } else if (typeof o === "string") {
      console.log('Installed http/https proxy route `%s` (%s)', y, o);
    }
  }
  console.log('-----------------------------------\n');
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
    // console.error('Cannot found vhost: %s, use default host: %s', host, config.defaultHost);
    cfg = vhost[config.defaultHost]
  }
  console.log('Serving `%s` via profile `%s`', req.url, cfg.host);
  for (var p in cfg.proxy) {
    if (pathname.indexOf(p) === 0) {
      isProxy = true;
      var proxySettings = cfg.proxy[p];
      if (typeof proxySettings === 'string') {
        proxy.web(req, res, {
          target: proxySettings
        });
      } else if (typeof proxySettings === "object") {
        if (proxySettings.type === 'static') {
          req.url = req.url.substring(p.length);
          proxySettings.staticServer.serve(req, res, function(e) {
            if (e) console.log(e);
          });
        }
      }
      break;
    }
  }
  if (!isProxy) {
    cfg.staticServer.serve(req, res, function(e) {
      if (e && (e.status === 404)) { // If the file wasn't found
        req.url = "/";
        cfg.staticServer.serve(req, res);
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