#!/usr/bin/env python3
"""Build a static deployment package. Never reads config.local.js or uploads files."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ('style.css', 'jquery-3.2.1.min.js', 'lazySchoolData.js', 'modernSchoolData.js',
          'setSelectOpt.js', 'walkingRoute.js', 'schoolMarkers.js', 'placeSearch.js', 'getSchoolCoords.js')
MARKER = '.gakkumap-build.json'


def source_file(base, relative):
    path = (base / relative).resolve()
    if Path(relative).is_absolute() or base.resolve() not in path.parents or not path.is_file():
        raise ValueError('Invalid or missing asset reference: ' + str(relative))
    return path


def data_files(base):
    def read(path):
        return json.loads(source_file(base, path).read_text(encoding='utf-8'))
    manifest = read('manifest.json')
    if manifest.get('schemaVersion') != 1 or not manifest.get('prefectures'):
        raise ValueError('Missing/unsupported exported manifest; run the exporter first')
    paths = {'manifest.json'}
    schools = []
    for pref in manifest['prefectures']:
        paths.add(pref['municipalities'])
        for city in read(pref['municipalities'])['municipalities']:
            paths.add(city['schools'])
            for school in read(city['schools'])['schools']:
                paths.add(school['boundary'])
                schools.append((school['boundary'], school['id']))
    # Check every school has geometry in its referenced chunk, reading each chunk once.
    required = {}
    for path, school_id in schools:
        required.setdefault(path, set()).add(school_id)
    for path, ids in required.items():
        records = read(path)['schools']
        if any(not records.get(school_id) for school_id in ids):
            raise ValueError('Missing school boundary in ' + path)
    return paths


class References(HTMLParser):
    def __init__(self):
        super().__init__(); self.paths = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href') and value:
                url = urlsplit(value)
                if not url.scheme and not url.netloc and url.path:
                    self.paths.append(url.path)


def build(output, data, config, require_config=False):
    output = output.resolve()
    # Restrict replacement to this script's disposable build directory.
    if output == ROOT or output in ROOT.parents or output == data.resolve():
        raise ValueError('Unsafe output directory')
    if output.exists() and (not (output / MARKER).is_file() or
                            json.loads((output / MARKER).read_text()).get('generator') != 'gakkumap-build-v1'):
        raise ValueError('Refusing to replace a directory not created by this builder')
    key = config.get('apiKey', '')
    map_id = config.get('mapId', '')
    configured = bool(key and key != 'YOUR_GOOGLE_MAPS_API_KEY' and map_id and map_id not in ('DEMO_MAP_ID', 'YOUR_PRODUCTION_MAP_ID'))
    if require_config and not configured:
        raise ValueError('Production API key and non-demo map ID are required')
    files = data_files(data)
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.gakkumap-build-', dir=output.parent))
    try:
        html = (ROOT / 'selectTest.html').read_text(encoding='utf-8')
        for name in ASSETS:
            raw = (ROOT / name).read_bytes()
            destination = 'assets/' + Path(name).stem + '-' + hashlib.sha256(raw).hexdigest()[:16] + Path(name).suffix
            target = staging / destination; target.parent.mkdir(exist_ok=True); target.write_bytes(raw)
            html, count = re.subn(r'\./' + re.escape(name) + r'(?:\?[^"\s]*)?', './' + destination, html)
            if count != 1:
                raise ValueError('Expected one HTML reference to ' + name)
        html = html.replace('./config.local.js', './config.js')
        html = html.replace('config.example.js を config.local.js にコピーし、Google Maps API キーを設定してください。',
                            '公開用 Google Maps 設定が未設定です。配信管理者にお問い合わせください。')
        html = html.replace('http://localhost:8000/selectTest.html', 'http://localhost:8000/')
        (staging / 'index.html').write_text(html, encoding='utf-8')
        (staging / 'config.js').write_text('window.GAKKUMAP_CONFIG = ' + json.dumps({
            'apiKey': key or 'YOUR_GOOGLE_MAPS_API_KEY', 'mapId': map_id or 'DEMO_MAP_ID'
        }, ensure_ascii=True) + ';\n', encoding='utf-8')
        for name in sorted(files):
            target = staging / 'data/2023' / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_file(data, name), target)
        (staging / '_headers').write_text('''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/config.js
  Cache-Control: no-store
/data/2023/manifest.json
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
''', encoding='utf-8')
        parser = References(); parser.feed(html)
        for path in parser.paths:
            source_file(staging, path)
        generated = [p for p in staging.rglob('*') if p.is_file()]
        for p in generated:
            if p.stat().st_size > 25*1024*1024:
                raise ValueError('File exceeds 25 MiB: ' + str(p.relative_to(staging)))
        if len(generated) + 1 > 20000:
            raise ValueError('Package exceeds 20,000 files')
        # Scan application assets; no local paths, config, or API credentials may leak there.
        for p in [staging / 'index.html'] + list((staging / 'assets').iterdir()):
            text = p.read_text(encoding='utf-8')
            if re.search(r'AIza[\w-]{30,}|-----BEGIN .*PRIVATE KEY-----|/Users/|config\.local\.js', text):
                raise ValueError('Local setting or credential found in application asset: ' + p.name)
        report = {'generator': 'gakkumap-build-v1', 'configured': configured,
                  'dataFiles': len(files), 'files': len(generated)+1,
                  'totalBytes': sum(p.stat().st_size for p in generated),
                  'largestFileBytes': max(p.stat().st_size for p in generated)}
        (staging / MARKER).write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
        if output.exists():
            shutil.rmtree(output)
        staging.replace(output)
        return report
    finally:
        if staging.exists(): shutil.rmtree(staging)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, default=ROOT / 'dist')
    p.add_argument('--data', type=Path, default=ROOT / 'data/2023')
    p.add_argument('--config', type=Path, help='Private JSON file with apiKey and mapId (never printed)')
    p.add_argument('--require-config', action='store_true', help='Fail rather than generate placeholder configuration')
    args = p.parse_args()
    config = json.loads(args.config.read_text()) if args.config else {
        'apiKey': os.environ.get('GAKKUMAP_API_KEY', ''), 'mapId': os.environ.get('GAKKUMAP_MAP_ID', '')}
    try:
        result = build(args.output, args.data, config, args.require_config)
        print(json.dumps(result, indent=2))
        if not result['configured']:
            print('Package built with placeholder/demo settings. Supply production configuration before publishing.')
    except (ValueError, KeyError, OSError) as error:
        p.exit(1, 'Build failed: ' + str(error) + '\n')
