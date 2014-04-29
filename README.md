Node httpd
======

A simple httpd server for develop.
=====

A convient light weight httpd server for front-end develop environment.

Features
=====

  * Serve multiple virtual host (vhost)
  * Sub-directory
  * http(s) proxy

Usage
=====

`nhttpd` serve content by request's hostname. According to hostname, `nhttpd` applies different config files, we called profiles. And `nhttpd` will pick a default profile, when requesnts specified a non-matched hostname.

Arguments
----

```
Options:
  -h, --help   show help
  -v, --vhost  path to vhost settings  [default: "vhost"]
  -p, --port   server port             [default: 3000]
```

Note that, `vhost` argument specified the directory of vhost profile. By default its also `vhost`. So you need to create a `vhost` directory and also put at least one vhost profile in the directory with following instruction.

vhost profiles
----

`vhost/*.js` files specified the static file location. And also specified `proxy` url and sub-directory.


  * `host`: `nhttpd` uses hostname to decide which vhost file profile been served. When you given `*`, `nhttpd` will use this profile as default profile. Note that, if duplicated `host` specified in the `vhost` folder, redundent profiles will dropped.
  * `path`: the path to static file
  * `isDefault`: when no `*` hostname given, given `isDefault = true` will made the profile as default profile.
  * `options`: please refer to [node-static](https://github.com/cloudhead/node-static#options-when-creating-an-instance-of-server)
  * `proxy`


Sample of vhost profile `vhost/*.json`
---

```
{
  "host": "abc.my.com",
  "path": "/home/to-file-path",
  "isDefault": true,
  "options": {...}
  "proxy": {
    "/apis": "https://api.my.com/actual-endpoint",
    "/image": "https://remote-url.com/folder",
    "/serv-local-files": {
      "type": "static",
      "path": "/path-to-file/",
      "options": {...}
    }
  }
}
```