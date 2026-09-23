#!/usr/bin/env python3
"""Check the generated data against source features, including all polygon rings."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from export_map_data import encode


def verify(source, output):
    read = lambda p: json.loads((output / p).read_text(encoding='utf-8'))
    manifest = read('manifest.json')
    all_paths = {'manifest.json', 'export-report.json'}
    for pref in manifest['prefectures']:
        cities = read(pref['municipalities'])['municipalities']
        all_paths.add(pref['municipalities'])
        chunks = set()
        for city in cities:
            all_paths.add(city['schools'])
            schools = read(city['schools'])['schools']
            assert len({s['id'] for s in schools}) == len(schools)
            assert all('features' not in s for s in schools)
            chunks.update(s['boundary'] for s in schools)
        loaded = {p: read(p)['schools'] for p in chunks}
        for city in cities:
            for school in read(city['schools'])['schools']:
                assert school['id'] in loaded[school['boundary']]
        fingerprint = lambda f: hashlib.sha256(encode(f)).hexdigest()
        exported = Counter(fingerprint(f) for chunk in loaded.values() for features in chunk.values() for f in features)
        original = json.loads((source / (manifest.get('dataset', 'A27') + '-23_' + pref['code'] + '.geojson')).read_text(encoding='utf-8-sig'))
        assert exported == Counter(fingerprint(f) for f in original['features']), pref['code']
        all_paths.update(chunks)
        print(pref['code'] + ': all features and geometry preserved')
    assert all((output / p).stat().st_size <= 25*1024*1024 for p in all_paths)
    assert len(all_paths) <= 20000
    print('Verified', len(all_paths), 'referenced files; hosting file count/size checks passed.')

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, default=root / 'map_data')
    p.add_argument('--output', type=Path, default=root / 'data' / 'elementary' / '2023')
    args = p.parse_args()
    verify(args.source, args.output)
