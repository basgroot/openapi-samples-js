This folder contains prebuilt browser versions of the full library. When sending pull requests, it is not required to update these.

Prebuilt files are in source control to enable pain-free frontend respectively CDN usage:

CDN usage
---------

Development:
```
<script src="//cdn.jsdelivr.net/gh/SaxoBank/openapi-samples-js@main/websockets/protobuf/protobuf-lib/protobuf.js-7.X.X/protobuf.js"></script>
```

Production:
```
<script src="//cdn.jsdelivr.net/gh/SaxoBank/openapi-samples-js@main/websockets/protobuf/protobuf-lib/protobuf.js-7.X.X/protobuf.min.js"></script>
```

**NOTE:** Remember to replace the version tag with the exact [release](https://github.com/dcodeIO/protobuf.js/tags) your project depends upon.

Frontend usage
--------------

Development:
```
<script src="node_modules/protobufjs/dist/protobuf.js"></script>
```

Production:
```
<script src="node_modules/protobufjs/dist/protobuf.min.js"></script>
```
