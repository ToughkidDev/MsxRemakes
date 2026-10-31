/* BPS (beat) patch format: apply and create. Runs in the browser and in Node (for tests).
 *
 * Layout: "BPS1", source size, target size, metadata size (all varints), metadata,
 * then actions, then source CRC32, target CRC32 and patch CRC32 (4 bytes each, little endian).
 *   action = varint ((length - 1) << 2 | command)
 *     0 SourceRead  copy from the source at the current output position
 *     1 TargetRead  copy the next `length` bytes from the patch
 *     2 SourceCopy  varint offset delta, then copy from a moving position in the source
 *     3 TargetCopy  varint offset delta, then copy from a moving position in the output written so far
 */
(function (root) {
  'use strict';

  var MAGIC = [0x42, 0x50, 0x53, 0x31]; // BPS1
  var SOURCE_READ = 0, TARGET_READ = 1, SOURCE_COPY = 2, TARGET_COPY = 3;
  var MIN_MATCH = 4;           // a copy shorter than this costs as much as writing the bytes
  var HASH_BITS = 20;
  var CHAIN_DEPTH = 24;        // candidates looked at per position: speed against patch size

  function BPSError(code, detail) {
    var e = new Error(code + (detail ? ': ' + detail : ''));
    e.code = code;
    e.detail = detail;
    return e;
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

  function crc32(bytes, end) {
    var c = 0xffffffff, n = end === undefined ? bytes.length : end;
    for (var i = 0; i < n; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function hex(v) { return v.toString(16).toUpperCase().padStart(8, '0'); }

  function readU32(p, at) { return (p[at] | (p[at + 1] << 8) | (p[at + 2] << 16) | (p[at + 3] << 24)) >>> 0; }

  // BPS numbers: 7 bits per byte, last byte has the top bit set, with an offset so every value has one encoding.
  function Reader(p, end) { this.p = p; this.pos = 4; this.end = end; }
  Reader.prototype.number = function () {
    var data = 0, shift = 1;
    for (;;) {
      if (this.pos >= this.end) throw BPSError('bps_truncated', this.pos);
      var x = this.p[this.pos++];
      data += (x & 0x7f) * shift;
      if (x & 0x80) break;
      shift *= 128;
      data += shift;
      if (shift > 9007199254740992) throw BPSError('bps_corrupt', this.pos);
    }
    return data;
  };

  function parse(patch) {
    var p = patch;
    if (p.length < 19) throw BPSError('bps_short');
    for (var i = 0; i < 4; i++) if (p[i] !== MAGIC[i]) throw BPSError('bps_header');
    var end = p.length - 12;
    var r = new Reader(p, end);
    var sourceSize = r.number(), targetSize = r.number(), metaSize = r.number();
    if (r.pos + metaSize > end) throw BPSError('bps_truncated', r.pos);
    var meta = p.subarray(r.pos, r.pos + metaSize);
    r.pos += metaSize;
    return {
      sourceSize: sourceSize, targetSize: targetSize, metadata: meta, actionsAt: r.pos, reader: r,
      sourceCrc: readU32(p, end), targetCrc: readU32(p, end + 4), patchCrc: readU32(p, end + 8),
      patchCrcActual: crc32(p, p.length - 4)
    };
  }

  function apply(source, patch, opts) {
    opts = opts || {};
    var info = parse(patch), p = patch, r = info.reader, end = p.length - 12;
    if (info.patchCrc !== info.patchCrcActual) throw BPSError('bps_patch_crc', hex(info.patchCrc) + ' / ' + hex(info.patchCrcActual));
    var srcCrc = crc32(source);
    if (!opts.ignoreSource) {
      if (source.length !== info.sourceSize) throw BPSError('bps_source_size', info.sourceSize + ' / ' + source.length);
      if (srcCrc !== info.sourceCrc) throw BPSError('bps_source_crc', hex(info.sourceCrc) + ' / ' + hex(srcCrc));
    }
    var out = new Uint8Array(info.targetSize), o = 0, srcRel = 0, tgtRel = 0, n = info.targetSize;
    while (r.pos < end) {
      var data = r.number(), cmd = data % 4, len = Math.floor(data / 4) + 1, k;
      if (o + len > n) throw BPSError('bps_corrupt', r.pos);
      if (cmd === SOURCE_READ) {
        if (o + len > source.length) throw BPSError('bps_corrupt', r.pos);
        out.set(source.subarray(o, o + len), o); o += len;
      } else if (cmd === TARGET_READ) {
        if (r.pos + len > end) throw BPSError('bps_truncated', r.pos);
        out.set(p.subarray(r.pos, r.pos + len), o); r.pos += len; o += len;
      } else {
        var d = r.number(), delta = Math.floor(d / 2) * (d % 2 ? -1 : 1);
        if (cmd === SOURCE_COPY) {
          srcRel += delta;
          if (srcRel < 0 || srcRel + len > source.length) throw BPSError('bps_corrupt', r.pos);
          out.set(source.subarray(srcRel, srcRel + len), o); srcRel += len; o += len;
        } else {
          tgtRel += delta;
          if (tgtRel < 0 || tgtRel >= o) throw BPSError('bps_corrupt', r.pos);
          for (k = 0; k < len; k++) out[o++] = out[tgtRel++]; // may overlap: byte by byte on purpose
        }
      }
    }
    if (o !== n) throw BPSError('bps_corrupt', 'size');
    var tgtCrc = crc32(out);
    if (tgtCrc !== info.targetCrc) throw BPSError('bps_target_crc', hex(info.targetCrc) + ' / ' + hex(tgtCrc));
    return { data: out, sourceCrc: srcCrc, sourceMatches: srcCrc === info.sourceCrc && source.length === info.sourceSize,
             targetCrc: tgtCrc, metadata: info.metadata };
  }

  // ---------- create ----------

  function Writer() { this.buf = new Uint8Array(1 << 16); this.n = 0; }
  Writer.prototype.grow = function (need) {
    if (this.n + need <= this.buf.length) return;
    var b = new Uint8Array(Math.max(this.buf.length * 2, this.n + need));
    b.set(this.buf.subarray(0, this.n)); this.buf = b;
  };
  Writer.prototype.byte = function (v) { this.grow(1); this.buf[this.n++] = v; };
  Writer.prototype.bytes = function (src, from, to) { this.grow(to - from); this.buf.set(src.subarray(from, to), this.n); this.n += to - from; };
  Writer.prototype.number = function (data) {
    for (;;) {
      var x = data % 128;
      data = Math.floor(data / 128);
      if (data === 0) { this.byte(0x80 | x); break; }
      this.byte(x);
      data--;
    }
  };
  Writer.prototype.u32 = function (v) { this.byte(v & 0xff); this.byte((v >>> 8) & 0xff); this.byte((v >>> 16) & 0xff); this.byte((v >>> 24) & 0xff); };

  function hash4(a, i) {
    return (Math.imul(a[i] | (a[i + 1] << 8) | (a[i + 2] << 16) | (a[i + 3] << 24), 0x9e3779b1) >>> (32 - HASH_BITS));
  }

  /* Greedy encoder. At each output position it compares three candidates and takes the longest:
   * the source at the same position (SourceRead, the cheapest action), the best match anywhere in
   * the source (SourceCopy) and the best match in the output already written (TargetCopy).
   * Bytes with no match of at least MIN_MATCH go out as TargetRead.
   * Returns a job with step(budget) so a page can run it in slices and show progress. */
  function createJob(source, target, metadata) {
    var s = source, t = target, sn = s.length, tn = t.length;
    var meta = metadata || new Uint8Array(0);
    var w = new Writer();
    w.byte(0x42); w.byte(0x50); w.byte(0x53); w.byte(0x31);
    w.number(sn); w.number(tn); w.number(meta.length); w.bytes(meta, 0, meta.length);

    var size = 1 << HASH_BITS;
    var headS = new Int32Array(size).fill(-1), prevS = new Int32Array(Math.max(sn, 1));
    var headT = new Int32Array(size).fill(-1), prevT = new Int32Array(Math.max(tn, 1));
    var indexedS = 0;
    var srcRel = 0, tgtRel = 0, out = 0, lit = 0, tIndexed = 0;
    var stats = { sourceRead: 0, targetRead: 0, sourceCopy: 0, targetCopy: 0 };

    // The whole source is indexed up front, in slices like the rest.
    function indexSource(budget) {
      var stop = Math.min(sn - 3, indexedS + budget);
      for (; indexedS < stop; indexedS++) {
        var h = hash4(s, indexedS); prevS[indexedS] = headS[h]; headS[h] = indexedS;
      }
      if (indexedS >= sn - 3) indexedS = sn;
    }
    function indexTarget(upto) {
      var stop = Math.min(upto, tn - 3);
      for (; tIndexed < stop; tIndexed++) {
        var h = hash4(t, tIndexed); prevT[tIndexed] = headT[h]; headT[h] = tIndexed;
      }
    }
    function flushLiteral() {
      if (out > lit) {
        var len = out - lit;
        w.number((len - 1) * 4 + TARGET_READ); w.bytes(t, lit, out);
        stats.targetRead += len;
      }
    }
    function action(cmd, len) { w.number((len - 1) * 4 + cmd); }
    function offset(delta) { w.number(Math.abs(delta) * 2 + (delta < 0 ? 1 : 0)); }

    function step(budget) {
      if (indexedS < sn) { indexSource(budget * 4); return false; }
      var stop = Math.min(tn, out + budget);
      while (out < stop) {
        var i = out, rem = tn - i, bestLen = 0, bestAt = -1, bestKind = 0, L, c, depth;
        // SourceRead: same position in the source.
        var readLen = 0;
        while (readLen < rem && i + readLen < sn && s[i + readLen] === t[i + readLen]) readLen++;
        if (rem >= 4) {
          var h = hash4(t, i);
          // SourceCopy candidates; try the position just after the last copy first, it is the cheapest to encode.
          if (srcRel < sn) {
            L = 0; while (L < rem && srcRel + L < sn && s[srcRel + L] === t[i + L]) L++;
            if (L > bestLen) { bestLen = L; bestAt = srcRel; bestKind = SOURCE_COPY; }
          }
          for (c = headS[h], depth = 0; c >= 0 && depth < CHAIN_DEPTH; c = prevS[c], depth++) {
            if (s[c + bestLen] !== t[i + bestLen]) continue;
            L = 0; while (L < rem && c + L < sn && s[c + L] === t[i + L]) L++;
            if (L > bestLen) { bestLen = L; bestAt = c; bestKind = SOURCE_COPY; if (L === rem) break; }
          }
          // TargetCopy candidates in the output already written (overlap is allowed).
          indexTarget(i);
          for (c = headT[h], depth = 0; c >= 0 && depth < CHAIN_DEPTH; c = prevT[c], depth++) {
            if (t[c + bestLen] !== t[i + bestLen]) continue;
            L = 0; while (L < rem && t[c + L] === t[i + L]) L++;
            if (L > bestLen) { bestLen = L; bestAt = c; bestKind = TARGET_COPY; if (L === rem) break; }
          }
        }
        // SourceRead has no offset to encode, so it wins ties and near-ties.
        if (readLen >= MIN_MATCH && readLen + 4 >= bestLen) {
          flushLiteral(); action(SOURCE_READ, readLen); stats.sourceRead += readLen;
          out += readLen; lit = out;
        } else if (bestLen >= MIN_MATCH + (bestKind === SOURCE_COPY && bestAt !== srcRel ? 1 : 0)) {
          flushLiteral();
          action(bestKind, bestLen);
          if (bestKind === SOURCE_COPY) { offset(bestAt - srcRel); srcRel = bestAt + bestLen; stats.sourceCopy += bestLen; }
          else { offset(bestAt - tgtRel); tgtRel = bestAt + bestLen; stats.targetCopy += bestLen; }
          out += bestLen; lit = out;
        } else {
          out++;
        }
      }
      if (out < tn) return false;
      flushLiteral();
      lit = out;
      w.u32(crc32(s)); w.u32(crc32(t));
      w.u32(crc32(w.buf, w.n));
      return true;
    }

    return {
      step: step,
      progress: function () { return (indexedS / Math.max(sn, 1)) * 0.2 + (out / Math.max(tn, 1)) * 0.8; },
      result: function () { return { data: w.buf.slice(0, w.n), stats: stats }; }
    };
  }

  function create(source, target, metadata) {
    var job = createJob(source, target, metadata);
    while (!job.step(1 << 20)) { /* run to the end */ }
    return job.result();
  }

  var api = { parse: parse, apply: apply, create: create, createJob: createJob, crc32: function (b) { return hex(crc32(b)); } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BPS = api;
})(this);
