/* IPS patch format: apply and create. Runs in the browser and in Node (for tests).
 *
 * Layout: "PATCH", then records, then "EOF", then an optional 3-byte truncate size.
 *   record: offset (3 bytes, big endian) + size (2 bytes)
 *           size > 0 -> size bytes of data
 *           size = 0 -> RLE: count (2 bytes) + one byte value
 */
(function (root) {
  'use strict';

  var HEADER = [0x50, 0x41, 0x54, 0x43, 0x48]; // PATCH
  var FOOTER = [0x45, 0x4f, 0x46];             // EOF
  var EOF_OFFSET = 0x454f46;                   // an offset that would read as "EOF"
  var MAX_SIZE = 0x1000000;                    // offsets are 24-bit: 16 MiB
  var MAX_RECORD = 0xffff;
  var MERGE_GAP = 5;                           // unchanged bytes cheaper to copy than a new 5-byte record header
  var MIN_RLE = 9;                             // a run must be longer than this to pay for an RLE record

  function IPSError(code, detail) {
    var e = new Error(code + (detail ? ': ' + detail : ''));
    e.code = code;
    e.detail = detail;
    return e;
  }

  function parse(patch) {
    var p = patch, n = p.length, pos = 5, i;
    if (n < 8) throw IPSError('ips_short');
    for (i = 0; i < 5; i++) if (p[i] !== HEADER[i]) throw IPSError('ips_header');
    var records = [], truncate = null, ended = false;
    while (pos + 3 <= n) {
      if (p[pos] === FOOTER[0] && p[pos + 1] === FOOTER[1] && p[pos + 2] === FOOTER[2]) {
        pos += 3;
        ended = true;
        if (n - pos >= 3) truncate = (p[pos] << 16) | (p[pos + 1] << 8) | p[pos + 2];
        break;
      }
      if (pos + 5 > n) throw IPSError('ips_truncated', pos);
      var offset = (p[pos] << 16) | (p[pos + 1] << 8) | p[pos + 2];
      var size = (p[pos + 3] << 8) | p[pos + 4];
      pos += 5;
      if (size === 0) {
        if (pos + 3 > n) throw IPSError('ips_truncated', pos);
        records.push({ offset: offset, rle: true, length: (p[pos] << 8) | p[pos + 1], value: p[pos + 2] });
        pos += 3;
      } else {
        if (pos + size > n) throw IPSError('ips_truncated', pos);
        records.push({ offset: offset, rle: false, length: size, data: p.subarray(pos, pos + size) });
        pos += size;
      }
    }
    if (!ended) throw IPSError('ips_no_eof');
    return { records: records, truncate: truncate };
  }

  function apply(rom, patch) {
    var info = parse(patch), recs = info.records, size = rom.length, i, r;
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.offset + r.length > size) size = r.offset + r.length;
    }
    if (info.truncate !== null) size = info.truncate;
    var out = new Uint8Array(Math.max(size, rom.length));
    out.set(rom);
    for (i = 0; i < recs.length; i++) {
      r = recs[i];
      if (r.rle) out.fill(r.value, r.offset, r.offset + r.length);
      else out.set(r.data, r.offset);
    }
    if (out.length !== size) out = out.slice(0, size);
    return {
      data: out,
      records: recs.length,
      rle: recs.filter(function (x) { return x.rle; }).length,
      truncate: info.truncate
    };
  }

  function differs(a, b, i) {
    return i >= a.length || a[i] !== b[i];
  }

  function create(original, modified) {
    var a = original, b = modified, n = b.length;
    if (n > MAX_SIZE) throw IPSError('too_large');
    var out = HEADER.slice(), records = 0, rle = 0, i = 0;

    function put24(v) { out.push((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff); }
    function put16(v) { out.push((v >> 8) & 0xff, v & 0xff); }
    function plain(offset, from, to) {
      while (from < to) {
        // A record may not start at 0x454F46: its offset bytes would read as the "EOF" marker.
        // Start one byte earlier instead; rewriting that byte with its modified value is harmless.
        if (offset === EOF_OFFSET) { offset--; from--; }
        var len = Math.min(to - from, MAX_RECORD);
        put24(offset); put16(len);
        for (var k = from; k < from + len; k++) out.push(b[k]);
        records++;
        offset += len; from += len;
      }
    }
    function run(offset, len, value) {
      put24(offset); put16(0); put16(len); out.push(value);
      records++; rle++;
    }
    // Write b[start..end) as plain records, with long runs of one value as RLE records.
    function chunk(start, end) {
      var k = start, lit = start;
      while (k < end) {
        var v = b[k], m = k + 1;
        while (m < end && b[m] === v && m - k < MAX_RECORD) m++;
        if (m - k >= MIN_RLE && k !== EOF_OFFSET) {
          plain(lit, lit, k);
          run(k, m - k, v);
          lit = m;
        }
        k = m;
      }
      plain(lit, lit, end);
    }

    while (i < n) {
      if (!differs(a, b, i)) { i++; continue; }
      var start = i, end = i + 1, j = i + 1;
      while (j < n && j - start < MAX_RECORD) {
        if (differs(a, b, j)) end = j + 1;
        else if (j - end >= MERGE_GAP) break;
        j++;
      }
      chunk(start, end);
      i = end;
    }
    out.push.apply(out, FOOTER);
    var truncate = null;
    if (n < a.length) { truncate = n; put24(n); }
    return { data: new Uint8Array(out), records: records, rle: rle, truncate: truncate };
  }

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var c, k, n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return ((c ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  var api = { parse: parse, apply: apply, create: create, crc32: crc32, MAX_SIZE: MAX_SIZE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IPS = api;
})(this);
