#!/usr/bin/env python3
"""Export A27 elementary or A32 junior-high GeoJSON without simplifying or changing geometry. Python 3, stdlib only."""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')


def export(source, output, codes, chunk_bytes, root, school_type='elementary'):
    dataset = {'elementary': 'A27', 'junior-high': 'A32'}[school_type]
    existing = output / 'manifest.json'
    if existing.exists():
        previous = json.loads(existing.read_text())
        if previous.get('schoolType', 'elementary') != school_type:
            raise ValueError('Output contains a different school type; choose a separate directory')
    for code in codes:
        if not (source / (dataset + '-23_' + code + '.geojson')).is_file():
            raise ValueError('Missing source GeoJSON for prefecture ' + code)
    areas = [dict(e.attrib) for e in ET.parse(root / 'AdminAreaCd.xml').iter('codelabel')]
    prefs = [dict(e.attrib) for e in ET.parse(root / 'PrefCd.xml').iter('codelabel')]
    output.mkdir(parents=True, exist_ok=True)
    sizes = {}

    def asset(folder, stem, value):
        raw = encode(value)
        if len(raw) > 25 * 1024 * 1024:
            raise ValueError('Asset exceeds 25 MiB: ' + stem)
        name = folder + '/' + stem + '-' + hashlib.sha256(raw).hexdigest()[:16] + '.json'
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        sizes[name] = len(raw)
        return name

    manifest = {'schemaVersion': 1, 'year': 2023, 'schoolType': school_type, 'dataset': dataset, 'prefectures': []}
    feature_count = school_count = 0
    for pref in prefs:
        code = pref['code']
        if code not in codes:
            continue
        path = source / (dataset + '-23_' + code + '.geojson')
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        if data.get('type') != 'FeatureCollection':
            raise ValueError('Not a FeatureCollection: ' + str(path))
        groups = {}
        for f in data['features']:
            p = f.get('properties') or {}
            city = str(p.get(dataset + '_001', '')).zfill(5)
            if not city.startswith(code):
                raise ValueError('Unexpected prefecture code: ' + city)
            g = f.get('geometry')
            if not g or g.get('type') not in ('Polygon', 'MultiPolygon'):
                raise ValueError('Unsupported/missing geometry in ' + str(path))
            identity = [city, p.get(dataset + '_003') or p.get(dataset + '_004'), p.get(dataset + '_005')]
            key = hashlib.sha256(encode(identity)).hexdigest()
            if key not in groups:
                groups[key] = {'id': key, 'cityCode': city, 'name': p.get(dataset + '_004') or '名称不明',
                               'address': p.get(dataset + '_005') or '', 'features': []}
            groups[key]['features'].append(f)
        by_city = {}
        for school in groups.values():
            by_city.setdefault(school['cityCode'], []).append(school)
        for city, schools in sorted(by_city.items()):
            chunk = {}; size = 0
            def flush():
                if not chunk:
                    return
                url = asset(code + '/' + city, 'boundaries', {'schools': chunk})
                for school in schools:
                    if school['id'] in chunk:
                        school['boundary'] = url
            for school in schools:
                n = len(encode(school['features']))
                if chunk and size + n > chunk_bytes:
                    flush(); chunk = {}; size = 0
                chunk[school['id']] = school['features']; size += n
            flush()
        local_areas = [a for a in areas if a['code'].startswith(code)]
        known = {a['code'] for a in local_areas}
        # Keep newer municipality codes accessible even if the bundled code table is old.
        local_areas += [{'code': c, 'label': c} for c in sorted(by_city) if c not in known]
        cities = []
        for area in local_areas:
            label = area['label']
            short = label[len(pref['label']):] if label.startswith(pref['label']) else label
            accepted = {a['code'] for a in local_areas if a['code'] == area['code'] or
                        (label.endswith('市') and a['label'].startswith(label) and a['label'].endswith('区'))}
            selected = [s for s in groups.values() if s['cityCode'] in accepted or
                        ('市' in short and short.endswith('区') and s['address'].startswith(short))]
            if not selected:
                continue
            records = [{k: v for k, v in s.items() if k != 'features'} for s in selected]
            url = asset(code + '/' + area['code'], 'schools', {'schools': records})
            cities.append({'code': area['code'], 'name': short, 'schools': url})
        city_url = asset(code, 'municipalities', {'municipalities': cities})
        manifest['prefectures'].append({'code': code, 'name': pref['label'], 'municipalities': city_url})
        feature_count += len(data['features']); school_count += len(groups)
        print(code + ': ' + str(len(groups)) + ' schools, ' + str(len(cities)) + ' selections')
    # Publish the manifest last. Content-hashed assets allow safe repeat exports.
    raw = encode(manifest)
    temp = output / 'manifest.json.tmp'; temp.write_bytes(raw); temp.replace(output / 'manifest.json')
    report = {'features': feature_count, 'schools': school_count, 'referencedAssets': len(sizes) + 1,
              'bytes': sum(sizes.values()) + len(raw), 'largestAssetBytes': max(sizes.values(), default=0),
              'largestSchoolListBytes': max((v for k,v in sizes.items() if '/schools-' in k), default=0)}
    (output / 'export-report.json').write_bytes(encode(report))
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--school-type', choices=['elementary', 'junior-high'], default='elementary')
    parser.add_argument('--source', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--prefectures', default=','.join('%02d' % i for i in range(1,48)))
    parser.add_argument('--chunk-bytes', type=int, default=1024*1024)
    args = parser.parse_args()
    if args.chunk_bytes < 1: parser.error('--chunk-bytes must be positive')
    codes = args.prefectures.split(',')
    if any(c not in ['%02d' % i for i in range(1,48)] for c in codes): parser.error('Use two-digit prefecture codes')
    source = args.source or (root / 'map_data' / 'junior_high_school' if args.school_type == 'junior-high' else root / 'map_data')
    output = args.output or (root / 'data' / 'junior-high' / '2023' if args.school_type == 'junior-high' else root / 'data' / 'elementary' / '2023')
    export(source, output, codes, args.chunk_bytes, root, args.school_type)
