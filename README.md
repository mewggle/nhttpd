Node httpd
======

A simple httpd server for develop.

Usage
=====

```
```


Sample of vhost/*.json
=====

```
{
  "host": "abc.my.com",
  "path": "/home/to-file-path",
  "isDefault": true,
  "proxy": {
    "/apis": "https://api.my.com/actual-endpoint",
    "/image": "https://my.image.com/folder"
  }
}
```