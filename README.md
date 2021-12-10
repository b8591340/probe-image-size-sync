probe-image-size
================

A fork of [https://github.com/nodeca/probe-image-size](https://github.com/nodeca/probe-image-size) without network utilities and no dependencies. Original probe-image-size depends on 7 packages. This package has no dependencies.

- small size, **no dependencies**
- works with local data only
- effective with big images (speed/memory)
- extracts orientation value when available
- easy to browserify (splitted to components)
- works in browser and node


Install
-------

```bash
npm install github:chebum/probe-image-size
```

Example
-------

```js
const probe = require('probe-image-size');

// imageBytes is a Uint8Array with image bytes.
let result = await probe.sync(imageBytes);
console.log(result); // =>
/*
  {
    width: xx,
    height: yy,
    type: 'jpg',
    mime: 'image/jpeg',
    wUnits: 'px',
    hUnits: 'px',
    url: 'http://example.com/image.jpg'
  }
*/

// From a Buffer in node
let data = require('fs').readFileSync('image.jpg');
console.log(probe.sync(data));
```


API
---


### probe.sync(src) -> result|null

Sync version can eat arrays, typed arrays and buffers. On fail it returns null.
On success it returns the following object:

```js
{
  width: XX,
  height: YY,
  length: ZZ,   // byte length of the file (if available, HTTP only)
  type: ...,    // image 'type' (usual file name extention)
  mime: ...,    // mime type
  wUnits: 'px', // width units type ('px' by default, can be different for SVG)
  hUnits: 'px', // height units type ('px' by default, can be different for SVG)
  url: ...,     // HTTP only, last url for the image in chain of redirects
                // (if no redirects, same as src)

  // optional, image orientation (from Exif), number from 1 to 8;
  // you may wish to swap width and height if orientation is >= 5
  orientation: X,

  // optional, full list of sizes for ICO (always) and AVIF (if multiple images)
  variants: [ { width, height }, ... ] | undefined
}
```

Width and height in the output object represent image size *before* any transformations
(orientation, cropping) are applied. Orientation is returned separately, which you may
wish to apply afterwards depending on browser support (browsers
[only support JPEG](https://zpl.fi/exif-orientation-in-different-formats/) orientation for now).
See [known issues](known_issues.md) for details.

__Note.__ Formats like JPEG & TIFF can store size anywhere (far from the head).
That usually does not happens, but if you need guarantees - always provide full
file content to sync methods. 

Similar projects
----------------

- [image-size](https://github.com/netroy/image-size)

